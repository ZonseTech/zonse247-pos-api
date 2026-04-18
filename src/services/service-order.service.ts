import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../databases/prisma/client';
import { InventoryConsumptionService } from './inventory/inventory-consumption.service';
import { StockMovementService } from './inventory/stock-movement.service';
import { recordChangesAsync, ChangeEntry } from './sync/change-log.service';
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
} from '../types/service-order.types';

// ─── Constants ──────────────────────────────────────────────────────
const ORDER_NUMBER_PREFIX = 'SO';
const PAGINATION = { DEFAULT_PAGE: 1, DEFAULT_LIMIT: 50, MAX_LIMIT: 200 };

// ─── Shared includes ────────────────────────────────────────────────
const SERVICE_SELECT = { id: true, name: true, sku: true, pricingType: true, basePrice: true, durationMinutes: true };
const USER_SELECT = { userId: true, fullname: true };
const CUSTOMER_SELECT = { customerId: true, name: true, phone: true, email: true };
const STAFF_SELECT = { staffId: true, userId: true, employeeCode: true, user: { select: { fullname: true } } };
const VARIANT_SELECT = {
  id: true,
  variantName: true,
  sku: true,
  primaryBarcode: true,
  sellingPrice: true,
  product: { select: { id: true, name: true } },
};

const ORDER_INCLUDE = {
  items: {
    where: { deletedAt: null },
    include: {
      service: { select: SERVICE_SELECT },
      consumptions: { where: { deletedAt: null } },
      staffAssignments: {
        where: { deletedAt: null },
        include: { staff: { select: STAFF_SELECT } },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  productItems: {
    where: { deletedAt: null },
    include: { variant: { select: VARIANT_SELECT } },
    orderBy: { createdAt: 'asc' as const },
  },
  payments: { where: { deletedAt: null }, include: { paymentMethod: true } },
  customer: { select: CUSTOMER_SELECT },
  createdByUser: { select: USER_SELECT },
  appointment: true,
};

// ─── Internal Types ─────────────────────────────────────────────────
interface ProcessedProductItem {
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  inventoryId: string;
}

interface ServiceOrderItemData {
  id: string;
  tenantId: string;
  branchId: string;
  terminalId?: string | null;
  serviceId: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  subtotal: number;
  taxAmount: number;
  totalPrice: number;
  status: ServiceItemStatus;
  notes?: string | null;
  consumptions?: ConsumptionInput[];
  staffAssignments?: any[];
}

// ─── Service ────────────────────────────────────────────────────────
export class ServiceOrderService {
  // ── Create ──────────────────────────────────────────────────────
  static async createServiceOrder(
    data: CreateServiceOrderInput,
    tenantId: string,
    branchId: string,
    userId?: string
  ): Promise<ServiceOrderWithItems> {
    const hasServices = (data.items?.length ?? 0) > 0;
    const hasProducts = (data.productItems?.length ?? 0) > 0;

    if (!hasServices && !hasProducts) {
      throw new Error('At least one service item or product item is required');
    }

    const orderType = hasServices && hasProducts
      ? 'HYBRID'
      : hasServices
        ? 'SERVICE_ONLY'
        : 'PRODUCT_ONLY';

    const productItemIds: string[] = [];

    const result = await prisma.$transaction(async (tx) => {
      // ── Validate services (if any) ──
      let itemsData: ServiceOrderItemData[] = [];

      if (hasServices && data.items) {
        const serviceIds = data.items.map((i) => i.serviceId);
        const services = await tx.service.findMany({
          where: { id: { in: serviceIds }, tenantId, branchId, isActive: true, deletedAt: null },
        });

        if (services.length !== serviceIds.length) {
          const found = new Set(services.map((s) => s.id));
          const missing = serviceIds.filter((id) => !found.has(id));
          throw new Error(`Services not found or inactive: ${missing.join(', ')}`);
        }

        itemsData = data.items.map((item) => {
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

      // ── Validate & process product items (if any) ──
      let processedProductItems: ProcessedProductItem[] = [];
      if (hasProducts && data.productItems) {
        processedProductItems = await this.processProductItems(tx, data.productItems, tenantId, branchId);
      }

      const orderNumber = await this.generateOrderNumber(tenantId, branchId, tx);

      // ── Calculate combined totals ──
      const serviceSubtotal = itemsData.reduce((sum, i) => sum + i.subtotal, 0);
      const serviceTax = itemsData.reduce((sum, i) => sum + i.taxAmount, 0);
      const serviceDiscount = itemsData.reduce((sum, i) => sum + i.discountAmount, 0);

      const productSubtotal = processedProductItems.reduce((sum, i) => sum + i.subtotal, 0);
      const productTax = processedProductItems.reduce((sum, i) => sum + i.taxAmount, 0);
      const productDiscount = processedProductItems.reduce((sum, i) => sum + i.discountAmount, 0);

      const subtotal = serviceSubtotal + productSubtotal;
      const taxAmount = serviceTax + productTax;
      const discountAmount = serviceDiscount + productDiscount;
      const totalAmount = subtotal - discountAmount + taxAmount;

      // ── Create the order ──
      const orderId = uuidv4();
      const order = await tx.serviceOrder.create({
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
            items: {
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
        include: ORDER_INCLUDE,
      });

      // Create staff assignments for each service item (if provided)
      for (const itemInput of itemsData) {
        if (itemInput.staffAssignments?.length) {
          for (const assignment of itemInput.staffAssignments) {
            await tx.staffAssignment.create({
              data: {
                id: uuidv4(),
                serviceOrderItemId: itemInput.id,
                staffId: assignment.staffId,
                tenantId,
                branchId,
                terminalId: data.terminalId,
                role: assignment.role,
                commissionType: assignment.commissionType ?? 'PERCENTAGE',
                commissionValue: assignment.commissionValue ?? 0,
                commissionAmount: 0,
              },
            });
          }
        }
      }

      // ── Deduct inventory for product items immediately ──
      if (processedProductItems.length > 0 && userId) {
        for (const item of processedProductItems) {
          await StockMovementService.recordSale(
            {
              tenantId,
              branchId,
              terminalId: data.terminalId,
              inventoryId: item.inventoryId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              referenceId: orderId,
              notes: `Service Order ${orderNumber}`,
              movedBy: userId,
            },
            tx
          );
        }
      }

      // Re-fetch with full includes after staff assignments
      const result = await tx.serviceOrder.findUnique({
        where: { id: order.id },
        include: ORDER_INCLUDE,
      });

      return this.mapOrderToResponse(result!);
    });

    // ChangeLog: record INSERT for order, items, product items, and staff assignments
    const changeEntries: ChangeEntry[] = [
      this.buildChange('service_orders', result.id, 'INSERT', tenantId, branchId, userId),
      ...result.items.map((item) =>
        this.buildChange('service_order_items', item.id, 'INSERT', tenantId, branchId, userId)
      ),
      ...productItemIds.map((id) =>
        this.buildChange('service_order_product_items', id, 'INSERT', tenantId, branchId, userId)
      ),
    ];

    for (const item of result.items) {
      if (item.staffAssignments?.length) {
        for (const sa of item.staffAssignments) {
          changeEntries.push(
            this.buildChange('staff_assignments', sa.id, 'INSERT', tenantId, branchId, userId)
          );
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
    branchId: string
  ): Promise<ServiceOrderWithItems | null> {
    const order = await prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, tenantId, branchId, deletedAt: null },
      include: ORDER_INCLUDE,
    });

    return order ? this.mapOrderToResponse(order) : null;
  }

  static async listServiceOrders(
    tenantId: string,
    branchId: string,
    options?: ListServiceOrdersOptions
  ): Promise<{ orders: ServiceOrderWithItems[]; total: number; totalPages: number }> {
    const page = options?.page || PAGINATION.DEFAULT_PAGE;
    const limit = Math.min(options?.limit || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
    const skip = (page - 1) * limit;

    const where: any = { tenantId, branchId, deletedAt: null };

    if (options?.status) where.status = options.status;
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
      prisma.serviceOrder.findMany({
        where,
        include: ORDER_INCLUDE,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.serviceOrder.count({ where }),
    ]);

    return {
      orders: orders.map((o) => this.mapOrderToResponse(o)),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Update (PENDING only) ───────────────────────────────────────
  static async updateServiceOrder(
    serviceOrderId: string,
    tenantId: string,
    branchId: string,
    data: UpdateServiceOrderInput,
    userId?: string
  ): Promise<ServiceOrderWithItems> {
    const newServiceItemIds: string[] = [];
    const newProductItemIds: string[] = [];

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.serviceOrder.findFirst({
        where: { id: serviceOrderId, tenantId, branchId, deletedAt: null },
        include: {
          items: { where: { deletedAt: null } },
          productItems: { where: { deletedAt: null } },
        },
      });

      if (!existing) throw new Error('Service order not found');
      if (existing.status !== 'PENDING') {
        throw new Error('Only PENDING orders can be updated');
      }

      // ── Add new service items if provided ──
      if (data.items?.length) {
        const serviceIds = data.items.map((i) => i.serviceId);
        const services = await tx.service.findMany({
          where: { id: { in: serviceIds }, tenantId, branchId, isActive: true, deletedAt: null },
        });

        if (services.length !== serviceIds.length) {
          const found = new Set(services.map((s) => s.id));
          const missing = serviceIds.filter((id) => !found.has(id));
          throw new Error(`Services not found or inactive: ${missing.join(', ')}`);
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
              id,
              serviceOrderId,
              tenantId,
              branchId,
              terminalId: existing.terminalId || null,
              serviceId: item.serviceId,
              quantity: qty,
              unitPrice: item.unitPrice,
              discountAmount: discount,
              subtotal,
              taxAmount: tax,
              totalPrice,
              status: 'PENDING',
              notes: item.notes || null,
            },
          });

          // Create staff assignments for the new item
          if (item.staffAssignments?.length) {
            for (const assignment of item.staffAssignments) {
              await tx.staffAssignment.create({
                data: {
                  id: uuidv4(),
                  serviceOrderItemId: id,
                  staffId: assignment.staffId,
                  tenantId,
                  branchId,
                  terminalId: existing.terminalId || null,
                  role: assignment.role,
                  commissionType: assignment.commissionType ?? 'PERCENTAGE',
                  commissionValue: assignment.commissionValue ?? 0,
                  commissionAmount: 0,
                },
              });
            }
          }
        }
      }

      // ── Add new product items if provided ──
      let processedProductItems: ProcessedProductItem[] = [];
      if (data.productItems?.length) {
        processedProductItems = await this.processProductItems(tx, data.productItems, tenantId, branchId);

        for (const item of processedProductItems) {
          const id = uuidv4();
          newProductItemIds.push(id);

          await tx.serviceOrderProductItem.create({
            data: {
              id,
              serviceOrderId,
              tenantId,
              branchId,
              productId: item.productId,
              variantId: item.variantId,
              terminalId: existing.terminalId || null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              unitCost: item.unitCost,
              subtotal: item.subtotal,
              taxAmount: item.taxAmount,
              discountAmount: item.discountAmount,
              totalAmount: item.totalAmount,
            },
          });

          // Deduct inventory immediately for product items
          if (userId) {
            await StockMovementService.recordSale(
              {
                tenantId,
                branchId,
                terminalId: existing.terminalId,
                inventoryId: item.inventoryId,
                quantity: item.quantity,
                unitCost: item.unitCost,
                referenceId: serviceOrderId,
                notes: `Service Order ${existing.orderNumber} (update)`,
                movedBy: userId,
              },
              tx
            );
          }
        }
      }

      // Determine new orderType based on what the order now has
      const hasServiceItems = (existing.items.length + newServiceItemIds.length) > 0;
      const hasProductItems = (existing.productItems.length + processedProductItems.length) > 0;
      const orderType = hasServiceItems && hasProductItems
        ? 'HYBRID'
        : hasServiceItems
          ? 'SERVICE_ONLY'
          : 'PRODUCT_ONLY';

      // Update order fields
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

      // Recalculate totals if any items were added
      if (newServiceItemIds.length > 0 || processedProductItems.length > 0) {
        await this.recalculateOrderTotals(tx, serviceOrderId);
      }

      const updated = await tx.serviceOrder.findUnique({
        where: { id: serviceOrderId },
        include: ORDER_INCLUDE,
      });

      return this.mapOrderToResponse(updated!);
    });

    const entries: ChangeEntry[] = [
      this.buildChange('service_orders', serviceOrderId, 'UPDATE', tenantId, branchId),
      ...newServiceItemIds.map((id) =>
        this.buildChange('service_order_items', id, 'INSERT', tenantId, branchId)
      ),
      ...newProductItemIds.map((id) =>
        this.buildChange('service_order_product_items', id, 'INSERT', tenantId, branchId)
      ),
    ];

    recordChangesAsync(entries);

    return result;
  }

  // ── Status transitions ──────────────────────────────────────────
  /**
   * Start the order: PENDING → IN_PROGRESS
   */
  static async startOrder(
    serviceOrderId: string,
    tenantId: string,
    branchId: string
  ): Promise<ServiceOrderWithItems> {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.serviceOrder.findFirst({
        where: { id: serviceOrderId, tenantId, branchId, deletedAt: null },
        include: {
          items: { where: { deletedAt: null } },
          productItems: { where: { deletedAt: null } },
        },
      });

      if (!order) throw new Error('Service order not found');
      if (order.status !== 'PENDING') {
        throw new Error('Only PENDING orders can be started');
      }
      if (order.orderType === 'PRODUCT_ONLY') {
        throw new Error('Product-only orders do not require start — proceed to payment');
      }
      if (order.items.length === 0) {
        throw new Error('Cannot start an order with no service items');
      }

      const updated = await tx.serviceOrder.update({
        where: { id: serviceOrderId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          version: { increment: 1 },
        },
        include: ORDER_INCLUDE,
      });

      return this.mapOrderToResponse(updated);
    });

    recordChangesAsync([this.buildChange('service_orders', serviceOrderId, 'UPDATE', tenantId, branchId)]);

    return result;
  }

  /**
   * Start a single item: PENDING → IN_PROGRESS
   */
  static async startItem(
    serviceOrderId: string,
    itemId: string,
    tenantId: string,
    branchId: string
  ): Promise<ServiceOrderWithItems> {
    let parentTransitioned = false;

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.serviceOrderItem.findFirst({
        where: { id: itemId, serviceOrderId, tenantId, branchId, deletedAt: null },
        include: { serviceOrder: true },
      });

      if (!item) throw new Error('Service order item not found');
      if (item.status !== 'PENDING') {
        throw new Error('Only PENDING items can be started');
      }

      // Auto-transition parent to IN_PROGRESS if still PENDING
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

      const updated = await tx.serviceOrder.findUnique({
        where: { id: serviceOrderId },
        include: ORDER_INCLUDE,
      });

      return this.mapOrderToResponse(updated!);
    });

    const entries: ChangeEntry[] = [
      this.buildChange('service_order_items', itemId, 'UPDATE', tenantId, branchId),
    ];
    if (parentTransitioned) {
      entries.push(this.buildChange('service_orders', serviceOrderId, 'UPDATE', tenantId, branchId));
    }

    recordChangesAsync(entries);

    return result;
  }

  /**
   * Complete a single item: IN_PROGRESS → COMPLETED
   */
  static async completeItem(
    serviceOrderId: string,
    itemId: string,
    tenantId: string,
    branchId: string,
    userId?: string,
    data?: CompleteItemInput
  ): Promise<ServiceOrderWithItems> {
    const consumptionIds: string[] = [];
    const staffAssignmentIds: string[] = [];
    let orderAutoCompleted = false;

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.serviceOrderItem.findFirst({
        where: { id: itemId, serviceOrderId, tenantId, branchId, deletedAt: null },
        include: {
          serviceOrder: true,
          staffAssignments: { where: { deletedAt: null } },
        },
      });

      if (!item) throw new Error('Service order item not found');
      if (item.status !== 'IN_PROGRESS') {
        throw new Error('Only IN_PROGRESS items can be completed');
      }

      // 1. Record inventory consumptions
      if (data?.consumptions?.length && userId) {
        await this.recordConsumptions(tx, item, data.consumptions, tenantId, branchId, userId);

        const created = await tx.serviceConsumption.findMany({
          where: { serviceOrderItemId: itemId, deletedAt: null },
          select: { id: true },
        });
        consumptionIds.push(...created.map((c) => c.id));
      }

      // 2. Calculate staff commissions
      await this.calculateCommissions(tx, item);
      if (item.staffAssignments?.length) {
        staffAssignmentIds.push(...item.staffAssignments.map((sa) => sa.id));
      }

      // 3. Mark item as COMPLETED
      await tx.serviceOrderItem.update({
        where: { id: itemId },
        data: { status: 'COMPLETED', completedAt: new Date(), version: { increment: 1 } },
      });

      // 4. Auto-complete parent order if all items are now COMPLETED
      const beforeStatus = item.serviceOrder.status;
      await this.tryCompleteOrder(tx, serviceOrderId);

      const afterOrder = await tx.serviceOrder.findUnique({
        where: { id: serviceOrderId },
        select: { status: true },
      });
      if (afterOrder?.status === 'COMPLETED' && beforeStatus !== 'COMPLETED') {
        orderAutoCompleted = true;
      }

      const updated = await tx.serviceOrder.findUnique({
        where: { id: serviceOrderId },
        include: ORDER_INCLUDE,
      });

      return this.mapOrderToResponse(updated!);
    });

    const entries: ChangeEntry[] = [
      this.buildChange('service_order_items', itemId, 'UPDATE', tenantId, branchId, userId),
    ];

    for (const cId of consumptionIds) {
      entries.push(this.buildChange('service_consumptions', cId, 'INSERT', tenantId, branchId, userId));
    }
    for (const saId of staffAssignmentIds) {
      entries.push(this.buildChange('staff_assignments', saId, 'UPDATE', tenantId, branchId, userId));
    }
    if (orderAutoCompleted) {
      entries.push(this.buildChange('service_orders', serviceOrderId, 'UPDATE', tenantId, branchId, userId));
    }

    recordChangesAsync(entries);

    return result;
  }

  /**
   * Cancel a single item: PENDING | IN_PROGRESS → CANCELLED
   */
  static async cancelItem(
    serviceOrderId: string,
    itemId: string,
    tenantId: string,
    branchId: string,
    userId?: string
  ): Promise<ServiceOrderWithItems> {
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.serviceOrderItem.findFirst({
        where: { id: itemId, serviceOrderId, tenantId, branchId, deletedAt: null },
        include: {
          consumptions: { where: { deletedAt: null } },
        },
      });

      if (!item) throw new Error('Service order item not found');
      if (item.status === 'COMPLETED' || item.status === 'CANCELLED') {
        throw new Error(`Cannot cancel an item that is ${item.status}`);
      }

      // Reverse inventory consumptions if any exist
      if (item.consumptions?.length && userId) {
        await this.reverseConsumptions(tx, item.consumptions, tenantId, branchId, userId);
      }

      await tx.serviceOrderItem.update({
        where: { id: itemId },
        data: { status: 'CANCELLED', version: { increment: 1 } },
      });

      // Recalculate order totals (exclude cancelled items)
      await this.recalculateOrderTotals(tx, serviceOrderId);

      // Check if all remaining items are completed/cancelled → auto-complete
      await this.tryCompleteOrder(tx, serviceOrderId);

      const updated = await tx.serviceOrder.findUnique({
        where: { id: serviceOrderId },
        include: ORDER_INCLUDE,
      });

      return this.mapOrderToResponse(updated!);
    });

    recordChangesAsync([
      this.buildChange('service_order_items', itemId, 'UPDATE', tenantId, branchId),
      this.buildChange('service_orders', serviceOrderId, 'UPDATE', tenantId, branchId),
    ]);

    return result;
  }

  /**
   * Cancel the entire order: PENDING | IN_PROGRESS → CANCELLED
   */
  static async cancelOrder(
    serviceOrderId: string,
    tenantId: string,
    branchId: string,
    userId?: string
  ): Promise<ServiceOrderWithItems> {
    let cancelledItemIds: string[] = [];

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.serviceOrder.findFirst({
        where: { id: serviceOrderId, tenantId, branchId, deletedAt: null },
        include: {
          items: {
            where: { deletedAt: null },
            include: { consumptions: { where: { deletedAt: null } } },
          },
          productItems: { where: { deletedAt: null } },
        },
      });

      if (!order) throw new Error('Service order not found');
      if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
        throw new Error(`Cannot cancel an order that is ${order.status}`);
      }

      // Reverse inventory for service items that have consumptions
      if (userId) {
        for (const item of order.items) {
          if (item.consumptions?.length && (item.status === 'COMPLETED' || item.status === 'IN_PROGRESS')) {
            await this.reverseConsumptions(tx, item.consumptions, tenantId, branchId, userId);
          }
        }
      }

      // Reverse inventory for product items (inventory was deducted at creation)
      if (userId && order.productItems?.length) {
        await this.reverseProductItems(tx, order.productItems, serviceOrderId, order.orderNumber, tenantId, branchId, userId);
      }

      // Collect IDs of items that will be cancelled
      cancelledItemIds = order.items
        .filter((i) => i.status === 'PENDING' || i.status === 'IN_PROGRESS' || i.status === 'COMPLETED')
        .map((i) => i.id);

      // Cancel all non-cancelled service items
      await tx.serviceOrderItem.updateMany({
        where: {
          serviceOrderId,
          status: { in: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] },
          deletedAt: null,
        },
        data: { status: 'CANCELLED' },
      });

      const updated = await tx.serviceOrder.update({
        where: { id: serviceOrderId },
        data: { status: 'CANCELLED', version: { increment: 1 } },
        include: ORDER_INCLUDE,
      });

      return this.mapOrderToResponse(updated);
    });

    const entries: ChangeEntry[] = [
      this.buildChange('service_orders', serviceOrderId, 'UPDATE', tenantId, branchId),
      ...cancelledItemIds.map((id) =>
        this.buildChange('service_order_items', id, 'UPDATE', tenantId, branchId)
      ),
    ];

    recordChangesAsync(entries);

    return result;
  }

  // ── Payments ─────────────────────────────────────────────────────
  /**
   * Record one or more payments against a service order.
   */
  static async recordPayment(
    serviceOrderId: string,
    tenantId: string,
    branchId: string,
    payments: ServiceOrderPaymentInput[]
  ): Promise<ServiceOrderWithItems> {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.serviceOrder.findFirst({
        where: { id: serviceOrderId, tenantId, branchId, deletedAt: null },
      });

      if (!order) throw new Error('Service order not found');
      if (order.status === 'CANCELLED') {
        throw new Error('Cannot record payment for a cancelled order');
      }

      const newPaymentTotal = payments.reduce((sum, p) => sum + p.amount, 0);
      if (newPaymentTotal <= 0) {
        throw new Error('Payment amount must be greater than zero');
      }

      // Create SalePayment records with paymentEntity = SERVICE_ORDER
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
            providerId: payment.providerId || null,
            providerRef: payment.providerRef || null,
            notes: payment.notes || null,
            status: 'COMPLETED',
            paymentMethod: { connect: { methodId: payment.paymentMethodId } },
          },
        });
      }

      // Update order financials
      const currentPaid = Number(order.amountPaid || 0);
      const totalPaid = currentPaid + newPaymentTotal;
      const totalAmount = Number(order.totalAmount || 0);
      const balanceDue = Math.max(0, totalAmount - totalPaid);

      // Determine payment status
      let status: ServiceOrderStatus = order.status as ServiceOrderStatus;
      let mraStatusUpdate: any = {};

      if (balanceDue <= 0) {
        status = 'PAID';
        // Queue for MRA submission when fully paid
        if (!order.mraStatus || order.mraStatus === 'NONE') {
          mraStatusUpdate = { mraStatus: 'PENDING' };
        }
      } else if (totalPaid > 0 && balanceDue > 0) {
        status = 'PARTIALLY_PAID';
      }

      const updated = await tx.serviceOrder.update({
        where: { id: serviceOrderId },
        data: {
          amountPaid: totalPaid,
          balanceDue,
          status,
          ...mraStatusUpdate,
          version: { increment: 1 },
        },
        include: ORDER_INCLUDE,
      });

      return this.mapOrderToResponse(updated);
    });

    recordChangesAsync([this.buildChange('service_orders', serviceOrderId, 'UPDATE', tenantId, branchId)]);

    return result;
  }

  /**
   * List payments for a service order.
   */
  static async listPayments(
    serviceOrderId: string,
    tenantId: string,
    branchId: string
  ): Promise<any[]> {
    const payments = await prisma.salePayment.findMany({
      where: {
        serviceOrderId,
        tenantId,
        branchId,
        paymentEntity: 'SERVICE_ORDER',
        deletedAt: null,
      },
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

  // ── Add consumptions to completed items ────────────────────────
  /**
   * Add consumptions to an already-completed service order item.
   */
  static async addConsumptions(
    serviceOrderId: string,
    itemId: string,
    tenantId: string,
    branchId: string,
    userId: string,
    consumptions: ConsumptionInput[]
  ): Promise<ServiceOrderWithItems> {
    if (!consumptions?.length) {
      throw new Error('At least one consumption is required');
    }

    const consumptionIds: string[] = [];

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.serviceOrderItem.findFirst({
        where: { id: itemId, serviceOrderId, tenantId, branchId, deletedAt: null },
        include: { serviceOrder: true },
      });

      if (!item) throw new Error('Service order item not found');
      if (item.status !== 'COMPLETED') {
        throw new Error('Consumptions can only be added to COMPLETED items');
      }
      if (item.serviceOrder.status === 'CANCELLED') {
        throw new Error('Cannot add consumptions to a cancelled order');
      }

      await this.recordConsumptions(tx, item, consumptions, tenantId, branchId, userId);

      const created = await tx.serviceConsumption.findMany({
        where: { serviceOrderItemId: itemId, deletedAt: null },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
        take: consumptions.length,
      });
      consumptionIds.push(...created.map((c) => c.id));

      const updated = await tx.serviceOrder.findUnique({
        where: { id: serviceOrderId },
        include: ORDER_INCLUDE,
      });

      return this.mapOrderToResponse(updated!);
    });

    const entries = consumptionIds.map((cId) =>
      this.buildChange('service_consumptions', cId, 'INSERT', tenantId, branchId, userId)
    );

    recordChangesAsync(entries);

    return result;
  }

  // ── Private helpers ─────────────────────────────────────────────
  private static async recordConsumptions(
    tx: any,
    item: any,
    consumptions: ConsumptionInput[],
    tenantId: string,
    branchId: string,
    userId: string
  ): Promise<void> {
    for (const consumption of consumptions) {
      const result = await InventoryConsumptionService.consumeForService(
        {
          tenantId,
          branchId,
          terminalId: item.terminalId,
          productVariantId: consumption.productVariantId,
          quantity: consumption.quantity,
          serviceOrderItemId: item.id,
          movedBy: userId,
        },
        tx
      );

      await tx.serviceConsumption.create({
        data: {
          id: uuidv4(),
          serviceOrderItemId: item.id,
          productVariantId: consumption.productVariantId,
          tenantId,
          branchId,
          terminalId: item.terminalId,
          quantity: consumption.quantity,
          unitCostAtTime: result.unitCost,
          totalCost: result.totalCost,
          stockMovementId: result.movementId,
        },
      });
    }
  }

  private static async reverseConsumptions(
    tx: any,
    consumptions: any[],
    tenantId: string,
    branchId: string,
    userId: string
  ): Promise<void> {
    for (const consumption of consumptions) {
      await InventoryConsumptionService.reverseServiceConsumption(
        {
          tenantId,
          branchId,
          terminalId: consumption.terminalId,
          productVariantId: consumption.productVariantId,
          quantity: Number(consumption.quantity),
          unitCost: Number(consumption.unitCostAtTime),
          serviceOrderItemId: consumption.serviceOrderItemId,
          movedBy: userId,
        },
        tx
      );

      await tx.serviceConsumption.update({
        where: { id: consumption.id },
        data: { deletedAt: new Date() },
      });
    }
  }

  private static async calculateCommissions(tx: any, item: any): Promise<void> {
    if (!item.staffAssignments?.length) return;

    for (const assignment of item.staffAssignments) {
      const value = Number(assignment.commissionValue || 0);
      const itemTotal = Number(item.totalPrice);
      const commissionAmount =
        assignment.commissionType === 'PERCENTAGE'
          ? (itemTotal * value) / 100
          : value;

      await tx.staffAssignment.update({
        where: { id: assignment.id },
        data: {
          commissionAmount: Math.round(commissionAmount * 100) / 100,
          version: { increment: 1 },
        },
      });
    }
  }

  private static async tryCompleteOrder(tx: any, serviceOrderId: string): Promise<void> {
    const items = await tx.serviceOrderItem.findMany({
      where: { serviceOrderId, deletedAt: null },
      select: { status: true },
    });

    const allTerminal = items.every((i) => i.status === 'COMPLETED' || i.status === 'CANCELLED');
    const atLeastOneCompleted = items.some((i) => i.status === 'COMPLETED');

    if (allTerminal && atLeastOneCompleted) {
      await tx.serviceOrder.update({
        where: { id: serviceOrderId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          mraStatus: 'PENDING',
          version: { increment: 1 },
        },
      });
    }
  }

  private static async recalculateOrderTotals(tx: any, serviceOrderId: string): Promise<void> {
    const items = await tx.serviceOrderItem.findMany({
      where: { serviceOrderId, status: { not: 'CANCELLED' }, deletedAt: null },
    });

    const productItems = await tx.serviceOrderProductItem.findMany({
      where: { serviceOrderId, deletedAt: null },
    });

    const serviceSubtotal = items.reduce((sum, i) => sum + Number(i.subtotal), 0);
    const serviceTax = items.reduce((sum, i) => sum + Number(i.taxAmount), 0);
    const serviceDiscount = items.reduce((sum, i) => sum + Number(i.discountAmount), 0);

    const productSubtotal = productItems.reduce((sum, i) => sum + Number(i.subtotal), 0);
    const productTax = productItems.reduce((sum, i) => sum + Number(i.taxAmount), 0);
    const productDiscount = productItems.reduce((sum, i) => sum + Number(i.discountAmount), 0);

    const subtotal = serviceSubtotal + productSubtotal;
    const taxAmount = serviceTax + productTax;
    const discountAmount = serviceDiscount + productDiscount;
    const totalAmount = subtotal - discountAmount + taxAmount;

    const order = await tx.serviceOrder.findUnique({
      where: { id: serviceOrderId },
      select: { amountPaid: true },
    });

    const amountPaid = Number(order?.amountPaid || 0);

    await tx.serviceOrder.update({
      where: { id: serviceOrderId },
      data: {
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        balanceDue: Math.max(0, totalAmount - amountPaid),
        version: { increment: 1 },
      },
    });
  }

  private static async generateOrderNumber(
    tenantId: string,
    branchId: string,
    tx: any
  ): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `${ORDER_NUMBER_PREFIX}-${dateStr}-`;

    const lastOrder = await tx.serviceOrder.findFirst({
      where: {
        tenantId,
        branchId,
        orderNumber: { startsWith: prefix },
      },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });

    let sequence = 1;
    if (lastOrder) {
      const lastSeq = parseInt(lastOrder.orderNumber.replace(prefix, ''), 10);
      if (!isNaN(lastSeq)) sequence = lastSeq + 1;
    }

    return `${prefix}${sequence.toString().padStart(4, '0')}`;
  }

  private static mapOrderToResponse(order: any): ServiceOrderWithItems {
    return {
      id: order.id,
      tenantId: order.tenantId,
      branchId: order.branchId,
      terminalId: order.terminalId,
      customerId: order.customerId,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      status: order.status,
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      discountAmount: Number(order.discountAmount),
      totalAmount: Number(order.totalAmount),
      amountPaid: Number(order.amountPaid),
      balanceDue: Number(order.balanceDue),
      startedAt: order.startedAt,
      completedAt: order.completedAt,
      notes: order.notes,
      createdBy: order.createdBy,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: (order.items || []).map((item: any) => ({
        id: item.id,
        serviceOrderId: item.serviceOrderId,
        serviceId: item.serviceId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discountAmount: Number(item.discountAmount),
        subtotal: Number(item.subtotal),
        taxAmount: Number(item.taxAmount),
        totalPrice: Number(item.totalPrice),
        status: item.status,
        startedAt: item.startedAt,
        completedAt: item.completedAt,
        notes: item.notes,
        service: item.service,
        consumptions: item.consumptions,
        staffAssignments: item.staffAssignments,
      })),
      productItems: (order.productItems || []).map((item: any) => ({
        id: item.id,
        serviceOrderId: item.serviceOrderId,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        unitCost: Number(item.unitCost),
        subtotal: Number(item.subtotal),
        taxAmount: Number(item.taxAmount),
        discountAmount: Number(item.discountAmount),
        totalAmount: Number(item.totalAmount),
        variant: item.variant,
      })),
      payments: order.payments,
      customer: order.customer,
      appointment: order.appointment,
    };
  }

  private static async reverseProductItems(
    tx: any,
    productItems: any[],
    serviceOrderId: string,
    orderNumber: string,
    tenantId: string,
    branchId: string,
    userId: string
  ): Promise<void> {
    for (const item of productItems) {
      const variant = await tx.productVariant.findFirst({
        where: { id: item.variantId, tenantId, branchId },
        include: { inventories: true },
      });

      if (!variant?.inventories?.[0]) continue;

      await StockMovementService.recordReturn(
        {
          tenantId,
          branchId,
          terminalId: item.terminalId,
          inventoryId: variant.inventories[0].id,
          quantity: item.quantity,
          unitCost: Number(item.unitCost),
          referenceType: 'SALE',
          referenceId: serviceOrderId,
          notes: `Cancel Service Order ${orderNumber}`,
          movedBy: userId,
        },
        tx
      );
    }
  }

  private static async processProductItems(
    tx: any,
    productItems: any[],
    tenantId: string,
    branchId: string
  ): Promise<ProcessedProductItem[]> {
    const processed: ProcessedProductItem[] = [];

    for (const item of productItems) {
      const variantId = item.variantId;
      const variant = await tx.productVariant.findFirst({
        where: {
          id: variantId,
          tenantId,
          branchId,
          isActive: true,
          product: { isActive: true },
        },
        include: {
          product: true,
          inventories: true,
        },
      });

      if (!variant) {
        throw new Error(`Product variant not found or inactive (${variantId})`);
      }

      const inventory = variant.inventories?.[0];
      if (!inventory) {
        throw new Error(
          `No inventory found for ${variant.product.name} - ${variant.variantName}`
        );
      }

      const available =
        Number(inventory.quantityInStock) - Number(inventory.reservedQuantity || 0);
      if (available < item.quantity) {
        throw new Error(
          `Insufficient stock for ${variant.product.name} - ${variant.variantName}. ` +
            `Available: ${available}, Requested: ${item.quantity}`
        );
      }

      const unitCost = Number(inventory.averageCost || 0);
      const discount = item.discountAmount ?? 0;
      const tax = item.taxAmount ?? 0;
      const subtotal = item.quantity * item.unitPrice;
      const totalAmount = subtotal - discount + tax;

      processed.push({
        productId: variant.productId,
        variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCost,
        subtotal,
        taxAmount: tax,
        discountAmount: discount,
        totalAmount,
        inventoryId: inventory.id,
      });
    }

    return processed;
  }

  private static buildChange(
    tableName: string,
    recordId: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    tenantId: string,
    branchId: string,
    userId?: string
  ): ChangeEntry {
    return { tableName, recordId, operation, tenantId, branchId, userId: userId ?? null };
  }
}
