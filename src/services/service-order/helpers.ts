import { v4 as uuidv4 } from 'uuid';
import { InventoryConsumptionService } from '../inventory/inventory-consumption.service';
import { StockMovementService } from '../inventory/stock-movement.service';
import { ChangeEntry } from '../sync/change-log.service';
import {
  ServiceOrderWithItems,
  ConsumptionInput,
} from '../../types/service-order.types';
import { ORDER_NUMBER_PREFIX, ProcessedProductItem } from './constants';

// ─── Response Mapping ───────────────────────────────────────────────

/**
 * Map a raw Prisma order (with Decimal fields) to typed response.
 */
export function mapOrderToResponse(order: any): ServiceOrderWithItems {
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
    items: (order.serviceOrderItems || []).map((item: any) => ({
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

// ─── Change Log ─────────────────────────────────────────────────────

export function buildChange(
  tableName: string,
  recordId: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  tenantId: string,
  branchId: string,
  userId?: string,
): ChangeEntry {
  return { tableName, recordId, operation, tenantId, branchId, userId: userId ?? null };
}

// ─── Order Number Generation ────────────────────────────────────────

export async function generateOrderNumber(
  tenantId: string,
  branchId: string,
  tx: any,
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

// ─── Order Totals ───────────────────────────────────────────────────

export async function recalculateOrderTotals(tx: any, serviceOrderId: string): Promise<void> {
  const items = await tx.serviceOrderItem.findMany({
    where: { serviceOrderId, status: { not: 'CANCELLED' }, deletedAt: null },
  });

  const productItems = await tx.serviceOrderProductItem.findMany({
    where: { serviceOrderId, deletedAt: null },
  });

  const serviceSubtotal = items.reduce((sum: number, i: any) => sum + Number(i.subtotal), 0);
  const serviceTax = items.reduce((sum: number, i: any) => sum + Number(i.taxAmount), 0);
  const serviceDiscount = items.reduce((sum: number, i: any) => sum + Number(i.discountAmount), 0);

  const productSubtotal = productItems.reduce((sum: number, i: any) => sum + Number(i.subtotal), 0);
  const productTax = productItems.reduce((sum: number, i: any) => sum + Number(i.taxAmount), 0);
  const productDiscount = productItems.reduce((sum: number, i: any) => sum + Number(i.discountAmount), 0);

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

// ─── Auto-Complete ──────────────────────────────────────────────────

/**
 * Auto-transition order to COMPLETED when all items reach terminal state.
 */
export async function tryCompleteOrder(tx: any, serviceOrderId: string): Promise<void> {
  const items = await tx.serviceOrderItem.findMany({
    where: { serviceOrderId, deletedAt: null },
    select: { status: true },
  });

  const allTerminal = items.every((i: any) => i.status === 'COMPLETED' || i.status === 'CANCELLED');
  const atLeastOneCompleted = items.some((i: any) => i.status === 'COMPLETED');

  if (allTerminal && atLeastOneCompleted) {
    await tx.serviceOrder.update({
      where: { id: serviceOrderId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        version: { increment: 1 },
      },
    });
  }
}

// ─── Commission Calculation ─────────────────────────────────────────

export async function calculateCommissions(tx: any, item: any): Promise<void> {
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

// ─── Inventory: Consumptions ────────────────────────────────────────

export async function recordConsumptions(
  tx: any,
  item: any,
  consumptions: ConsumptionInput[],
  tenantId: string,
  branchId: string,
  userId: string,
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
      tx,
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

export async function reverseConsumptions(
  tx: any,
  consumptions: any[],
  tenantId: string,
  branchId: string,
  userId: string,
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
      tx,
    );

    await tx.serviceConsumption.update({
      where: { id: consumption.id },
      data: { deletedAt: new Date() },
    });
  }
}

// ─── Inventory: Product Items ───────────────────────────────────────

export async function reverseProductItems(
  tx: any,
  productItems: any[],
  serviceOrderId: string,
  orderNumber: string,
  tenantId: string,
  branchId: string,
  userId: string,
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
      tx,
    );
  }
}

export async function processProductItems(
  tx: any,
  productItems: any[],
  tenantId: string,
  branchId: string,
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
        `No inventory found for ${variant.product.name} - ${variant.variantName}`,
      );
    }

    const available =
      Number(inventory.quantityInStock) - Number(inventory.reservedQuantity || 0);
    if (available < item.quantity) {
      throw new Error(
        `Insufficient stock for ${variant.product.name} - ${variant.variantName}. ` +
          `Available: ${available}, Requested: ${item.quantity}`,
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
