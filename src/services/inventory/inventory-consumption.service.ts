import { prisma } from '../../databases/prisma/client';
import { StockMovementService } from './stock-movement.service';
import { InventoryValuationService } from './inventory-valuation.service';

// ─── Types ─────────────────────────────────────────────────────────
type CostingMethod = 'WEIGHTED_AVERAGE' | 'FIFO' | 'LIFO';

interface ConsumeForServiceParams {
  tenantId: string;
  branchId: string;
  terminalId?: string | null;
  productVariantId: string;
  quantity: number;
  serviceOrderItemId: string;
  notes?: string;
  movedBy?: string;
}

interface ReverseConsumptionParams {
  tenantId: string;
  branchId: string;
  terminalId?: string | null;
  productVariantId: string;
  quantity: number;
  unitCost: number;
  serviceOrderItemId: string;
  notes?: string;
  movedBy?: string;
}

interface ConsumeResult {
  movementId: string;
  inventoryId: string;
  unitCost: number;
  totalCost: number;
  previousQuantity: number;
  newQuantity: number;
  costingMethod: CostingMethod;
}

// ─── Service ──────────────────────────────────────────────────────
/**
 * InventoryConsumptionService
 *
 * Service for consuming inventory for service orders with proper costing.
 * Uses ADJUSTMENT movement type with negative quantity for consumption
 * since SERVICE_CONSUMPTION is not in the current enum.
 */
export class InventoryConsumptionService {
  /**
   * Consume inventory for a service order item.
   * Uses SALE as the movement type since it decreases inventory.
   */
  static async consumeForService(
    params: ConsumeForServiceParams,
    tx?: any
  ): Promise<ConsumeResult> {
    const db = tx || prisma;

    // 1. Find inventory record
    const inventory = await db.inventory.findFirst({
      where: {
        variantId: params.productVariantId,
        branchId: params.branchId,
        tenantId: params.tenantId,
      },
    });

    if (!inventory) {
      throw new Error(
        `Inventory not found for variant ${params.productVariantId} in branch ${params.branchId}`
      );
    }

    const costingMethod = (inventory.costingMethod as CostingMethod) || 'WEIGHTED_AVERAGE';

    // 2. Calculate COGS to get the proper unit cost
    const cogsDetail = await InventoryValuationService.calculateCOGS(
      inventory.id,
      params.quantity,
      costingMethod,
      db
    );

    const unitCost = cogsDetail.weightedUnitCost;
    const totalCost = cogsDetail.totalCost;

    // 3. Record the stock movement using SALE type (decreases inventory)
    const { movementId, previousQuantity, newQuantity } =
      await StockMovementService.recordMovement(
        {
          tenantId: params.tenantId,
          branchId: params.branchId,
          terminalId: params.terminalId,
          inventoryId: inventory.id,
          movementType: 'SALE' as any,
          quantity: params.quantity,
          referenceType: 'SALE' as any,
          referenceId: params.serviceOrderItemId,
          unitCost,
          notes: params.notes || `Service consumption: ${params.serviceOrderItemId}`,
          movedBy: params.movedBy || 'system',
        },
        db
      );

    return {
      movementId,
      inventoryId: inventory.id,
      unitCost,
      totalCost,
      previousQuantity,
      newQuantity,
      costingMethod,
    };
  }

  /**
   * Reverse a service consumption — restores inventory (RETURN movement).
   * Used when cancelling service order items/orders that had consumed stock.
   */
  static async reverseServiceConsumption(
    params: ReverseConsumptionParams,
    tx?: any
  ): Promise<{ movementId: string }> {
    const db = tx || prisma;

    const inventory = await db.inventory.findFirst({
      where: {
        variantId: params.productVariantId,
        branchId: params.branchId,
        tenantId: params.tenantId,
      },
    });

    if (!inventory) {
      throw new Error(
        `Inventory not found for variant ${params.productVariantId} in branch ${params.branchId}`
      );
    }

    const { movementId } = await StockMovementService.recordMovement(
      {
        tenantId: params.tenantId,
        branchId: params.branchId,
        terminalId: params.terminalId,
        inventoryId: inventory.id,
        movementType: 'RETURN' as any,
        quantity: params.quantity,
        referenceType: 'RETURN' as any,
        referenceId: params.serviceOrderItemId,
        unitCost: params.unitCost,
        notes: params.notes || `Reversal: service item ${params.serviceOrderItemId}`,
        movedBy: params.movedBy || 'system',
      },
      db
    );

    return { movementId };
  }
}
