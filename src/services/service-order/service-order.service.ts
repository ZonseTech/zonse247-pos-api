import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../databases/prisma/client';
import { StockMovementService } from '../inventory/stock-movement.service';
import { recordChangesAsync, ChangeEntry } from '../sync/change-log.service';
import {
  CreateServiceOrderInput,
  UpdateServiceOrderInput,
  CompleteItemInput,
  ServiceOrderPaymentInput,
  ListServiceOrdersOptions,
  ServiceOrderWithItems,
  ConsumptionInput,
  ServiceOrderStatus,
  ServiceItemStatus,
} from '../../types/service-order.types';
import { PAGINATION_DEFAULTS } from '../../utils/pagination.utils';
import { ORDER_INCLUDE, ProcessedProductItem, ServiceOrderItemData } from './constants';
import {
  mapOrderToResponse,
  buildChange,
  generateOrderNumber,
  recalculateOrderTotals,
  tryCompleteOrder,
  calculateCommissions,
  recordConsumptions,
  reverseConsumptions,
  reverseProductItems,
  processProductItems,
} from './helpers';

// ─── Service ────────────────────────────────────────────────────────
export class ServiceOrderService {

  // ── Create ──────────────────────────────────────────────────────

  static async createServiceOrder(
    data: CreateServiceOrderInput,
    tenantId: string,
    branchId: string,
    userId?: string,
  ): Promise<ServiceOrderWithItems> {
    const hasServices = (data.items?.length ?? 0) > 0;
    const hasProducts = (data.productItems?.length ?? 0) > 0;

    if (!hasServices && !hasProducts) {
      throw new Error('At least one service item or product item is required');
    }

    const orderType = hasServices && hasProducts
      ? 'HYBRID'
      : hasServices ? 'SERVICE_ONLY' : 'PRODUCT_ONLY';

    const productItemIds: string[] = [];

    const result = await prisma.$transaction(async (tx) => {
      // Validate services
      let itemsData: ServiceOrderItemData[] = [];
      if (hasServices && data.items) {
        itemsData = await this.validateAndBuildServiceItems(tx, data, tenantId, branchId);
      }

      // Validate & process product items
      let processedProductItems: ProcessedProductItem[] = [];
      if (hasProducts && data.productItems) {
        processedProductItems = await processProductItems(tx, data.productItems, tenantId, branchId);
      }

      const orderNumber = await generateOrderNumber(tenantId, branchId, tx);

      // Calculate combined totals
      const subtotal = this.sumField(itemsData, 'subtotal') + this.sumField(processedProductItems, 'subtotal');
      const taxAmount = this.sumField(itemsData, 'taxAmount') + this.sumField(processedProductItems, 'taxAmount');
      const discountAmount = this.sumField(itemsData, 'discountAmount') + this.sumField(processedProductItems, 'discountAmount');
      const totalAmount = subtotal - discountAmount + taxAmount;

      // Create the order
      const orderId = uuidv4();
      await tx.serviceOrder.create({
        data: {
          id: orderId,
          tenantId,
          branchId,
          terminalId: data.terminalId,
          customerId: data.customerId || null,
          orderNumber,
          orderType,
          status: 'PENDING',
          subtotal,
          taxAmount,
          discountAmount,
          totalAmount,
          amountPaid: 0,
          balanceDue: totalAmount,
          notes: data.notes,
          createdBy: userId,
          ...(itemsData.length > 0 && {
            serviceOrderItems: {
              create: itemsData.map((item) => ({
                id: item.id,
                tenantId,
                branchId,
                terminalId: item.terminalId,
                serviceId: item.serviceId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discountAmount: item.discountAmount,
                subtotal: item.subtotal,
                taxAmount: item.taxAmount,
                totalPrice: item.totalPrice,
                status: item.status,
                notes: item.notes,
              })),
            },
          }),
          ...(processedProductItems.length > 0 && {
            productItems: {
              create: processedProductItems.map((item) => {
                const id = uuidv4();
                productItemIds.push(id);
                return {
                  id,
                  tenantId,
                  branchId,
                  productId: item.productId,
                  variantId: item.variantId,
                  terminalId: data.terminalId || null,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  unitCost: item.unitCost,
                  subtotal: item.subtotal,
                  taxAmount: item.taxAmount,
                  discountAmount: item.discountAmount,
                  totalAmount: item.totalAmount,
                };
              }),
            },
          }),
        },
      });

      // Create staff assignments
      await this.createStaffAssignments(tx, itemsData, tenantId, branchId, data.terminalId);

      // Deduct inventory for product items
      if (processedProductItems.length > 0 && userId) {
        await this.deductProductInventory(tx, processedProductItems, orderId, orderNumber, tenantId, branchId, data.terminalId, userId);
      }

      const created = await tx.serviceOrder.findUnique({
        where: { id: orderId },
        include: ORDER_INCLUDE,
      });

      return mapOrderToResponse(created!);
    });

    // Record change log
    const changeEntries: ChangeEntry[] = [
      buildChange('service_orders', result.id, 'INSERT', tenantId, branchId, userId),
      ...result.items.map((item) => buildChange('service_order_items', item.id, 'INSERT', tenantId, branchId, userId)),
      ...productItemIds.map((id) => buildChange('service_order_product_items', id, 'INSERT', tenantId, branchId, userId)),
    ];
    for (const item of result.items) {
      if (item.staffAssignments?.length) {
        for (const sa of item.staffAssignments) {
          changeEntries.push(buildChange('staff_assignments', sa.id, 'INSERT', tenantId, branchId, userId));
        }
      }
    }
    recordChangesAsync(changeEntries);

    return result;
  }

  // ── Read ────────────────────────────────────────────────────────

  static async getServiceOrderById(
    serviceOrderId: string,
    tenantId: string,
    branchId: string,
  ): Promise<ServiceOrderWithItems | null> {
    const order = await prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, tenantId, branchId, deletedAt: null },
      include: ORDER_INCLUDE,
    });

    return order ? mapOrderToResponse(order) : null;
  }

  static async listServiceOrders(
    tenantId: string,
    branchId: string,
    options?: ListServiceOrdersOptions,
  ): Promise<{ orders: ServiceOrderWithItems[]; total: number; totalPages: number }> {
    const page = options?.page || PAGINATION_DEFAULTS.DEFAULT_PAGE;
    const limit = Math.min(options?.limit || PAGINATION_DEFAULTS.DEFAULT_LIMIT, PAGINATION_DEFAULTS.MAX_LIMIT);
    const skip = (page - 1) * limit;

    const where: any = { tenantId, branchId, deletedAt: null };

    if (options?.status) {
      where.status = Array.isArray(options.status) ? { in: options.status } : options.status;
    }
    if (options?.customerId) where.customerId = options.customerId;

    if (options?.from || options?.to) {
      where.createdAt = {};
      if (options.from) where.createdAt.gte = new Date(options.from);
      if (options.to) where.createdAt.lte = new Date(options.to);
    }

    if (options?.search) {
      where.OR = [
        { orderNumber: { contains: options.search } },
        { customer: { name: { contains: options.search } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.serviceOrder.findMany({ where, include: ORDER_INCLUDE, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.serviceOrder.count({ where }),
    ]);

    return {
      orders: orders.map((o) => mapOrderToResponse(o)),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Update (PENDING only) ──────────────────────────────────────

  static async updateServiceOrder(
    serviceOrderId: string,
    tenantId: string,
    branchId: string,
    data: UpdateServiceOrderInput,
    userId?: string,
  ): Promise<ServiceOrderWithItems> {
    const newServiceItemIds: string[] = [];
    const newProductItemIds: string[] = [];

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.serviceOrder.findFirst({
        where: { id: serviceOrderId, tenantId, branchId, deletedAt: null },
        include: {
          serviceOrderItems: { where: { deletedAt: null } },
          productItems: { where: { deletedAt: null } },
        },
      });

      if (!existing) throw new Error('Service order not found');
      if (existing.status !== 'PENDING') throw new Error('Only PENDING orders can be updated');

      // Add new service items
      if (data.items?.length) {
        const serviceIds = data.items.map((i) => i.serviceId);
        const services = await tx.service.findMany({
          where: { id: { in: serviceIds }, tenantId, branchId, isActive: true, deletedAt: null },
        });
        if (services.length !== serviceIds.length) {
          const found = new Set(services.map((s) => s.id));
          throw new Error(`Services not found or inactive: ${serviceIds.filter((id) => !found.has(id)).join(', ')}`);
        }

        for (const item of data.items) {
          const id = uuidv4();
          newServiceItemIds.push(id);
          const qty = item.quantity ?? 1;
          const discount = item.discountAmount ?? 0;
          const subtotal = qty * item.unitPrice;
          const tax = item.taxAmount ?? 0;
          const totalPrice = subtotal - discount + tax;

          await tx.serviceOrderItem.create({
            data: {
              id, serviceOrderId, tenantId, branchId,
              terminalId: existing.terminalId || null,
              serviceId: item.serviceId, quantity: qty,
              unitPrice: item.unitPrice, discountAmount: discount,
              subtotal, taxAmount: tax, totalPrice,
              status: 'PENDING', notes: item.notes || null,
            },
          });

          if (item.staffAssignments?.length) {
            for (const assignment of item.staffAssignments) {
              await tx.staffAssignment.create({
                data: {
                  id: uuidv4(), serviceOrderItemId: id, staffId: assignment.staffId,
                  tenantId, branchId, terminalId: existing.terminalId || null,
                  role: assignment.role, commissionType: assignment.commissionType ?? 'PERCENTAGE',
                  commissionValue: assignment.commissionValue ?? 0, commissionAmount: 0,
                },
              });
            }
          }
        }
      }

      // Add new product items
      let processedProducts: ProcessedProductItem[] = [];
      if (data.productItems?.length) {
        processedProducts = await processProductItems(tx, data.productItems, tenantId, branchId);

        for (const item of processedProducts) {
          const id = uuidv4();
          newProductItemIds.push(id);

          await tx.serviceOrderProductItem.create({
            data: {
              id, serviceOrderId, tenantId, branchId,
              productId: item.productId, variantId: item.variantId,
              terminalId: existing.terminalId || null,
              quantity: item.quantity, unitPrice: item.unitPrice,
              unitCost: item.unitCost, subtotal: item.subtotal,
              taxAmount: item.taxAmount, discountAmount: item.discountAmount,
              totalAmount: item.totalAmount,
            },
          });

          if (userId) {
            await StockMovementService.recordSale(
              {
                tenantId, branchId, terminalId: existing.terminalId,
                inventoryId: item.inventoryId, quantity: item.quantity,
                unitCost: item.unitCost, referenceId: serviceOrderId,
                notes: `Service Order ${existing.orderNumber} (update)`, movedBy: userId,
              },
              tx,
            );
          }
        }
      }

      // Determine order type
      const hasServiceItems = (existing.serviceOrderItems.length + newServiceItemIds.length) > 0;
      const hasProductItems = (existing.productItems.length + processedProducts.length) > 0;
      const orderType = hasServiceItems && hasProductItems ? 'HYBRID' : hasServiceItems ? 'SERVICE_ONLY' : 'PRODUCT_ONLY';

      await tx.serviceOrder.update({
        where: { id: serviceOrderId },
        data: {
          ...(data.customerId !== undefined && { customerId: data.customerId }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.discountAmount !== undefined && { discountAmount: data.discountAmount }),
          orderType,
          version: { increment: 1 },
        },
      });

      if (newServiceItemIds.length > 0 || processedProducts.length > 0) {
        await recalculateOrderTotals(tx, serviceOrderId);
      }

      const updated = await tx.serviceOrder.findUnique({ where: { id: serviceOrderId }, include: ORDER_INCLUDE });
      return mapOrderToResponse(updated!);
    });

    recordChangesAsync([
      buildChange('service_orders', serviceOrderId, 'UPDATE', tenantId, branchId),
      ...newServiceItemIds.map((id) => buildChange('service_order_items', id, 'INSERT', tenantId, branchId)),
      ...newProductItemIds.map((id) => buildChange('service_order_product_items', id, 'INSERT', tenantId, branchId)),
    ]);

    return result;
  }

  // ── Status: Start Order ────────────────────────────────────────

  static async startOrder(
    serviceOrderId: string,
    tenantId: string,
    branchId: string,
  ): Promise<ServiceOrderWithItems> {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.serviceOrder.findFirst({
        where: { id: serviceOrderId, tenantId, branchId, deletedAt: null },
        include: { serviceOrderItems: { where: { deletedAt: null } }, productItems: { where: { deletedAt: null } } },
      });

      if (!order) throw new Error('Service order not found');
      if (order.status !== 'PENDING') throw new Error('Only PENDING orders can be started');
      if (order.orderType === 'PRODUCT_ONLY') throw new Error('Product-only orders do not require start — proceed to payment');
      if (order.serviceOrderItems.length === 0) throw new Error('Cannot start an order with no service items');

      const updated = await tx.serviceOrder.update({
        where: { id: serviceOrderId },
        data: { status: 'IN_PROGRESS', startedAt: new Date(), version: { increment: 1 } },
        include: ORDER_INCLUDE,
      });

      return mapOrderToResponse(updated);
    });

    recordChangesAsync([buildChange('service_orders', serviceOrderId, 'UPDATE', tenantId, branchId)]);
    return result;
  }

  // ── Status: Start Item ─────────────────────────────────────────

  static async startItem(
    serviceOrderId: string,
    itemId: string,
    tenantId: string,
    branchId: string,
  ): Promise<ServiceOrderWithItems> {
    let parentTransitioned = false;

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.serviceOrderItem.findFirst({
        where: { id: itemId, serviceOrderId, tenantId, branchId, deletedAt: null },
        include: { serviceOrder: true },
      });

      if (!item) throw new Error('Service order item not found');
      if (item.status !== 'PENDING') throw new Error('Only PENDING items can be started');

      // Auto-transition parent to IN_PROGRESS
      if (item.serviceOrder.status === 'PENDING') {
        await tx.serviceOrder.update({
          where: { id: serviceOrderId },
          data: { status: 'IN_PROGRESS', startedAt: new Date(), version: { increment: 1 } },
        });
        parentTransitioned = true;
      }

      await tx.serviceOrderItem.update({
        where: { id: itemId },
        data: { status: 'IN_PROGRESS', startedAt: new Date(), version: { increment: 1 } },
      });

      const updated = await tx.serviceOrder.findUnique({ where: { id: serviceOrderId }, include: ORDER_INCLUDE });
      return mapOrderToResponse(updated!);
    });

    const entries: ChangeEntry[] = [buildChange('service_order_items', itemId, 'UPDATE', tenantId, branchId)];
    if (parentTransitioned) entries.push(buildChange('service_orders', serviceOrderId, 'UPDATE', tenantId, branchId));
    recordChangesAsync(entries);

    return result;
  }

  // ── Status: Complete Item ──────────────────────────────────────

  static async completeItem(
    serviceOrderId: string,
    itemId: string,
    tenantId: string,
    branchId: string,
    userId?: string,
    data?: CompleteItemInput,
  ): Promise<ServiceOrderWithItems> {
    const consumptionIds: string[] = [];
    const staffAssignmentIds: string[] = [];
    let orderAutoCompleted = false;

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.serviceOrderItem.findFirst({
        where: { id: itemId, serviceOrderId, tenantId, branchId, deletedAt: null },
        include: { serviceOrder: true, staffAssignments: { where: { deletedAt: null } } },
      });

      if (!item) throw new Error('Service order item not found');
      if (item.status !== 'IN_PROGRESS') throw new Error('Only IN_PROGRESS items can be completed');

      // Record inventory consumptions
      if (data?.consumptions?.length && userId) {
        await recordConsumptions(tx, item, data.consumptions, tenantId, branchId, userId);
        const created = await tx.serviceConsumption.findMany({
          where: { serviceOrderItemId: itemId, deletedAt: null },
          select: { id: true },
        });
        consumptionIds.push(...created.map((c) => c.id));
      }

      // Calculate staff commissions
      await calculateCommissions(tx, item);
      if (item.staffAssignments?.length) {
        staffAssignmentIds.push(...item.staffAssignments.map((sa) => sa.id));
      }

      // Mark item as COMPLETED
      await tx.serviceOrderItem.update({
        where: { id: itemId },
        data: { status: 'COMPLETED', completedAt: new Date(), version: { increment: 1 } },
      });

      // Auto-complete parent order
      const beforeStatus = item.serviceOrder.status;
      await tryCompleteOrder(tx, serviceOrderId);
      const afterOrder = await tx.serviceOrder.findUnique({ where: { id: serviceOrderId }, select: { status: true } });
      if (afterOrder?.status === 'COMPLETED' && beforeStatus !== 'COMPLETED') {
        orderAutoCompleted = true;
      }

      const updated = await tx.serviceOrder.findUnique({ where: { id: serviceOrderId }, include: ORDER_INCLUDE });
      return mapOrderToResponse(updated!);
    });

    const entries: ChangeEntry[] = [buildChange('service_order_items', itemId, 'UPDATE', tenantId, branchId, userId)];
    for (const cId of consumptionIds) entries.push(buildChange('service_consumptions', cId, 'INSERT', tenantId, branchId, userId));
    for (const saId of staffAssignmentIds) entries.push(buildChange('staff_assignments', saId, 'UPDATE', tenantId, branchId, userId));
    if (orderAutoCompleted) entries.push(buildChange('service_orders', serviceOrderId, 'UPDATE', tenantId, branchId, userId));
    recordChangesAsync(entries);

    return result;
  }

  // ── Status: Cancel Item ────────────────────────────────────────

  static async cancelItem(
    serviceOrderId: string,
    itemId: string,
    tenantId: string,
    branchId: string,
    userId?: string,
  ): Promise<ServiceOrderWithItems> {
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.serviceOrderItem.findFirst({
        where: { id: itemId, serviceOrderId, tenantId, branchId, deletedAt: null },
        include: { consumptions: { where: { deletedAt: null } } },
      });

      if (!item) throw new Error('Service order item not found');
      if (item.status === 'COMPLETED' || item.status === 'CANCELLED') {
        throw new Error(`Cannot cancel an item that is ${item.status}`);
      }

      if (item.consumptions?.length && userId) {
        await reverseConsumptions(tx, item.consumptions, tenantId, branchId, userId);
      }

      await tx.serviceOrderItem.update({
        where: { id: itemId },
        data: { status: 'CANCELLED', version: { increment: 1 } },
      });

      await recalculateOrderTotals(tx, serviceOrderId);
      await tryCompleteOrder(tx, serviceOrderId);

      const updated = await tx.serviceOrder.findUnique({ where: { id: serviceOrderId }, include: ORDER_INCLUDE });
      return mapOrderToResponse(updated!);
    });

    recordChangesAsync([
      buildChange('service_order_items', itemId, 'UPDATE', tenantId, branchId),
      buildChange('service_orders', serviceOrderId, 'UPDATE', tenantId, branchId),
    ]);

    return result;
  }

  // ── Status: Cancel Order ───────────────────────────────────────

  static async cancelOrder(
    serviceOrderId: string,
    tenantId: string,
    branchId: string,
    userId?: string,
  ): Promise<ServiceOrderWithItems> {
    let cancelledItemIds: string[] = [];

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.serviceOrder.findFirst({
        where: { id: serviceOrderId, tenantId, branchId, deletedAt: null },
        include: {
          serviceOrderItems: { where: { deletedAt: null }, include: { consumptions: { where: { deletedAt: null } } } },
          productItems: { where: { deletedAt: null } },
        },
      });

      if (!order) throw new Error('Service order not found');
      if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
        throw new Error(`Cannot cancel an order that is ${order.status}`);
      }

      // Reverse service item consumptions
      if (userId) {
        for (const item of order.serviceOrderItems) {
          if (item.consumptions?.length && (item.status === 'COMPLETED' || item.status === 'IN_PROGRESS')) {
            await reverseConsumptions(tx, item.consumptions, tenantId, branchId, userId);
          }
        }
      }

      // Reverse product item inventory
      if (userId && order.productItems?.length) {
        await reverseProductItems(tx, order.productItems, serviceOrderId, order.orderNumber, tenantId, branchId, userId);
      }

      cancelledItemIds = order.serviceOrderItems
        .filter((i) => i.status === 'PENDING' || i.status === 'IN_PROGRESS' || i.status === 'COMPLETED')
        .map((i) => i.id);

      await tx.serviceOrderItem.updateMany({
        where: { serviceOrderId, status: { in: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] }, deletedAt: null },
        data: { status: 'CANCELLED' },
      });

      const updated = await tx.serviceOrder.update({
        where: { id: serviceOrderId },
        data: { status: 'CANCELLED', version: { increment: 1 } },
        include: ORDER_INCLUDE,
      });

      return mapOrderToResponse(updated);
    });

    recordChangesAsync([
      buildChange('service_orders', serviceOrderId, 'UPDATE', tenantId, branchId),
      ...cancelledItemIds.map((id) => buildChange('service_order_items', id, 'UPDATE', tenantId, branchId)),
    ]);

    return result;
  }

  // ── Payments ───────────────────────────────────────────────────

  static async recordPayment(
    serviceOrderId: string,
    tenantId: string,
    branchId: string,
    payments: ServiceOrderPaymentInput[],
  ): Promise<ServiceOrderWithItems> {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.serviceOrder.findFirst({
        where: { id: serviceOrderId, tenantId, branchId, deletedAt: null },
      });

      if (!order) throw new Error('Service order not found');
      if (order.status === 'CANCELLED') throw new Error('Cannot record payment for a cancelled order');

      const newPaymentTotal = payments.reduce((sum, p) => sum + p.amount, 0);
      if (newPaymentTotal <= 0) throw new Error('Payment amount must be greater than zero');

      for (const payment of payments) {
        await tx.salePayment.create({
          data: {
            id: uuidv4(),
            tenant: { connect: { tenantId } },
            branch: { connect: { branchId } },
            serviceOrder: { connect: { id: serviceOrderId } },
            paymentEntity: 'SERVICE_ORDER',
            amount: payment.amount,
            reference: payment.reference || null,
            providerRef: payment.providerRef || null,
            notes: payment.notes || null,
            status: 'COMPLETED',
            paymentMethod: { connect: { methodId: payment.paymentMethodId } },
            ...(payment.providerId && { provider: { connect: { providerId: payment.providerId } } }),
          },
        });
      }

      const currentPaid = Number(order.amountPaid || 0);
      const totalPaid = currentPaid + newPaymentTotal;
      const totalAmount = Number(order.totalAmount || 0);
      const balanceDue = Math.max(0, totalAmount - totalPaid);

      let status: ServiceOrderStatus = order.status as ServiceOrderStatus;
      if (balanceDue <= 0) status = 'PAID';
      else if (totalPaid > 0) status = 'PARTIALLY_PAID';

      const updated = await tx.serviceOrder.update({
        where: { id: serviceOrderId },
        data: { amountPaid: totalPaid, balanceDue, status, version: { increment: 1 } },
        include: ORDER_INCLUDE,
      });

      return mapOrderToResponse(updated);
    });

    recordChangesAsync([buildChange('service_orders', serviceOrderId, 'UPDATE', tenantId, branchId)]);
    return result;
  }

  static async listPayments(
    serviceOrderId: string,
    tenantId: string,
    branchId: string,
  ): Promise<any[]> {
    const payments = await prisma.salePayment.findMany({
      where: { serviceOrderId, tenantId, branchId, paymentEntity: 'SERVICE_ORDER', deletedAt: null },
      include: { paymentMethod: true },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((p) => ({
      id: p.id,
      paymentMethodId: p.paymentMethodId,
      amount: Number(p.amount),
      reference: p.reference,
      providerId: p.providerId,
      providerRef: p.providerRef,
      status: p.status,
      processedAt: p.processedAt,
      notes: p.notes,
      createdAt: p.createdAt,
      paymentMethod: p.paymentMethod,
    }));
  }

  // ── Consumptions ───────────────────────────────────────────────

  static async addConsumptions(
    serviceOrderId: string,
    itemId: string,
    tenantId: string,
    branchId: string,
    userId: string,
    consumptions: ConsumptionInput[],
  ): Promise<ServiceOrderWithItems> {
    if (!consumptions?.length) throw new Error('At least one consumption is required');

    const consumptionIds: string[] = [];

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.serviceOrderItem.findFirst({
        where: { id: itemId, serviceOrderId, tenantId, branchId, deletedAt: null },
        include: { serviceOrder: true },
      });

      if (!item) throw new Error('Service order item not found');
      if (item.status !== 'COMPLETED') throw new Error('Consumptions can only be added to COMPLETED items');
      if (item.serviceOrder.status === 'CANCELLED') throw new Error('Cannot add consumptions to a cancelled order');

      await recordConsumptions(tx, item, consumptions, tenantId, branchId, userId);

      const created = await tx.serviceConsumption.findMany({
        where: { serviceOrderItemId: itemId, deletedAt: null },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
        take: consumptions.length,
      });
      consumptionIds.push(...created.map((c) => c.id));

      const updated = await tx.serviceOrder.findUnique({ where: { id: serviceOrderId }, include: ORDER_INCLUDE });
      return mapOrderToResponse(updated!);
    });

    recordChangesAsync(consumptionIds.map((cId) => buildChange('service_consumptions', cId, 'INSERT', tenantId, branchId, userId)));
    return result;
  }

  // ── Private Utilities ──────────────────────────────────────────

  private static async validateAndBuildServiceItems(
    tx: any,
    data: CreateServiceOrderInput,
    tenantId: string,
    branchId: string,
  ): Promise<ServiceOrderItemData[]> {
    const serviceIds = data.items!.map((i) => i.serviceId);
    const services = await tx.service.findMany({
      where: { id: { in: serviceIds }, tenantId, branchId, isActive: true, deletedAt: null },
    });

    if (services.length !== serviceIds.length) {
      const found = new Set(services.map((s: any) => s.id));
      const missing = serviceIds.filter((id) => !found.has(id));
      throw new Error(`Services not found or inactive: ${missing.join(', ')}`);
    }

    return data.items!.map((item) => {
      const qty = item.quantity ?? 1;
      const discount = item.discountAmount ?? 0;
      const subtotal = qty * item.unitPrice;
      const tax = item.taxAmount ?? 0;
      const totalPrice = subtotal - discount + tax;

      return {
        id: uuidv4(),
        tenantId,
        branchId,
        terminalId: data.terminalId,
        serviceId: item.serviceId,
        quantity: qty,
        unitPrice: item.unitPrice,
        discountAmount: discount,
        subtotal,
        taxAmount: tax,
        totalPrice,
        status: 'PENDING' as ServiceItemStatus,
        notes: item.notes,
        consumptions: item.consumptions,
        staffAssignments: item.staffAssignments,
      };
    });
  }

  private static async createStaffAssignments(
    tx: any,
    itemsData: ServiceOrderItemData[],
    tenantId: string,
    branchId: string,
    terminalId?: string,
  ): Promise<void> {
    for (const itemInput of itemsData) {
      if (!itemInput.staffAssignments?.length) continue;
      for (const assignment of itemInput.staffAssignments) {
        await tx.staffAssignment.create({
          data: {
            id: uuidv4(),
            serviceOrderItemId: itemInput.id,
            staffId: assignment.staffId,
            tenantId,
            branchId,
            terminalId,
            role: assignment.role,
            commissionType: assignment.commissionType ?? 'PERCENTAGE',
            commissionValue: assignment.commissionValue ?? 0,
            commissionAmount: 0,
          },
        });
      }
    }
  }

  private static async deductProductInventory(
    tx: any,
    items: ProcessedProductItem[],
    orderId: string,
    orderNumber: string,
    tenantId: string,
    branchId: string,
    terminalId?: string,
    userId?: string,
  ): Promise<void> {
    for (const item of items) {
      await StockMovementService.recordSale(
        {
          tenantId,
          branchId,
          terminalId,
          inventoryId: item.inventoryId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          referenceId: orderId,
          notes: `Service Order ${orderNumber}`,
          movedBy: userId!,
        },
        tx,
      );
    }
  }

  private static sumField(items: any[], field: string): number {
    return items.reduce((sum, i) => sum + (i[field] || 0), 0);
  }
}
