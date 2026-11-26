import { v4 as uuidv4 } from 'uuid';
import { StockMovementType } from '../../databases/prisma/generated/prisma/client';
import { prisma } from '../../databases/prisma/client';
import {
    CreateStockMovementInput,
    StockMovementWithProduct,
    RecordMovementWithUpsertInput,
    SyncMovementInput,
    BulkSyncResult,
    RecordMovementAPIInput
} from '../../models/stock-movement.model';
import { InventoryValuationService } from './inventory-valuation.service';
import { CostingMethod } from '../../models/inventory-valuation.model';

/**
 * GOLDEN RULE: Never update inventory quantities directly.
 * Always record a stock movement and derive current inventory from movements.
 * 
 * This service is the SINGLE source of truth for inventory quantity changes.
 * All inventory modifications MUST go through this service.
 * 
 * The Inventory table serves as a cache for fast reads and is updated
 * atomically along with the StockMovement record.
 * Because inventory is derived from movements (not stored directly),
 * conflicts naturally resolve themselves. The final quantity is always the sum
 * of all movements, which is mathematically correct.
 */
export class StockMovementService {
    /**
     * Movement types that INCREASE inventory
     */
    private static readonly INCREASE_TYPES: StockMovementType[] = [
        'PURCHASE_RECEIPT',
        'RETURN',
        'ADJUSTMENT',
        'TRANSFER_IN',
        'OPENING_BALANCE' as StockMovementType,
    ];

    private static readonly CORRECTION_NOTE_PREFIX = 'CORRECTION';

    /**
     * Movement types that DECREASE inventory
     */
    private static readonly DECREASE_TYPES: StockMovementType[] = [
        'SALE',
        'TRANSFER_OUT',
        'DAMAGE',
        'EXPIRY',
        'RETURN_TO_SUPPLIER' as StockMovementType,
    ];

    /**
     * Determine if a movement type increases or decreases inventory
     */
    private static isIncreaseType(movementType: StockMovementType): boolean {
        return this.INCREASE_TYPES.includes(movementType);
    }

    /**
     * Record a stock movement and atomically update the inventory cache.
     * This is the ONLY method that should modify inventory quantities.
     * 
     * @param data - Movement data
     * @param prismaClient - Optional Prisma transaction client for atomic operations
     * @returns The created stock movement record
     */
    static async recordMovement(
        data: CreateStockMovementInput,
        prismaClient?: any
    ): Promise<{ movementId: string; previousQuantity: number; newQuantity: number }> {
        const db = prismaClient || prisma;

        // Get current inventory
        const inventory = await db.inventory.findUnique({
            where: { id: data.inventoryId },
        });

        if (!inventory) {
            throw new Error('Inventory not found');
        }

        const previousQuantity = inventory.availableQuantity;
        const isIncrease = this.isIncreaseType(data.movementType);
        const quantityChange = isIncrease ? data.quantity : -data.quantity;
        const newQuantity = previousQuantity + quantityChange;

        // Validate negative stock only on decrease operations
        if (!isIncrease && newQuantity < 0 && !inventory.allowNegativeStock) {
            throw new Error(
                `Insufficient stock. Available: ${previousQuantity}, Requested: ${data.quantity}`
            );
        }

        const movementId = data.id || uuidv4();

        // Create stock movement record (immutable ledger entry)
        await db.stockMovement.create({
            data: {
                id: movementId,
                tenantId: data.tenantId,
                branchId: data.branchId,
                terminalId: data.terminalId,
                inventoryId: data.inventoryId,
                movementType: data.movementType,
                quantity: data.quantity,
                previousQuantity,
                newQuantity,
                referenceType: data.referenceType,
                referenceId: data.referenceId,
                unitCost: data.unitCost,
                totalCost: data.unitCost * data.quantity,
                notes: data.notes,
                movedBy: data.movedBy,
                movementDate: data.movementDate || new Date(),
            },
        });

        // Update the inventory cache atomically
        const inventoryUpdate: any = {
            availableQuantity: newQuantity,
            version: { increment: 1 },
        };

        // Update timestamps based on movement type
        if (data.movementType === 'SALE') {
            inventoryUpdate.lastSoldAt = new Date();
        } else if (data.movementType === 'PURCHASE_RECEIPT' || data.movementType === ('OPENING_BALANCE' as StockMovementType)) {
            inventoryUpdate.lastRestockedAt = new Date();
        }

        // Update cost tracking for all increase types that carry a unitCost
        if (isIncrease && data.unitCost > 0) {
            // Always track last purchase cost for purchases / opening balance
            if (data.movementType === 'PURCHASE_RECEIPT' || data.movementType === ('OPENING_BALANCE' as StockMovementType)) {
                inventoryUpdate.lastPurchaseCost = data.unitCost;
            }
            // Weighted average cost — applicable to all increase types
            if (previousQuantity > 0) {
                const currentAvgCost = Number(inventory.averageCost);
                inventoryUpdate.averageCost =
                    (currentAvgCost * previousQuantity + data.unitCost * data.quantity) /
                    (previousQuantity + data.quantity);
            } else {
                inventoryUpdate.averageCost = data.unitCost;
            }
        }

        // ── Supplier Return: remove inventory value at actual purchase cost ──
        // Unlike regular sales (which keep WAC unchanged), returning goods to a
        // supplier removes value at the ORIGINAL purchase cost from the GRN.
        // Formula: new_total_value = old_total_value - (return_qty * original_unit_cost)
        //          new_avg = new_total_value / new_qty
        if (data.movementType === ('RETURN_TO_SUPPLIER' as StockMovementType) && data.unitCost > 0 && newQuantity > 0) {
            const currentAvgCost = Number(inventory.averageCost);
            const oldTotalValue = currentAvgCost * previousQuantity;
            const removedValue = data.unitCost * data.quantity;
            const newTotalValue = Math.max(0, oldTotalValue - removedValue);
            inventoryUpdate.averageCost = newTotalValue / newQuantity;
        } else if (data.movementType === ('RETURN_TO_SUPPLIER' as StockMovementType) && newQuantity <= 0) {
            // All stock returned — reset average cost
            inventoryUpdate.averageCost = 0;
        }

        await db.inventory.update({
            where: { id: data.inventoryId },
            data: inventoryUpdate,
        });

        // ── Cost-layer bookkeeping ──────────────────────────────
        const costingMethod: CostingMethod = inventory.costingMethod || 'WEIGHTED_AVERAGE';

        if (isIncrease && data.unitCost >= 0) {
            // Create a cost layer for every inventory increase
            await InventoryValuationService.addCostLayer({
                tenantId: data.tenantId,
                branchId: data.branchId,
                inventoryId: data.inventoryId,
                quantity: data.quantity,
                unitCost: data.unitCost,
                referenceType: data.referenceType as string ?? null,
                referenceId: data.referenceId ?? null,
                movementId: movementId,
                layerDate: data.movementDate || new Date(),
            }, db);
        } else if (!isIncrease && (costingMethod === 'FIFO' || costingMethod === 'LIFO')) {
            // Consume cost layers for FIFO/LIFO on decrease
            await InventoryValuationService.consumeCostLayers(
                data.inventoryId,
                data.quantity,
                costingMethod,
                db
            );
        }

        return { movementId, previousQuantity, newQuantity };
    }

    /**
     * Record a sale (decrements inventory)
     * Convenience method that wraps recordMovement for sales
     */
    static async recordSale(
        params: {
            tenantId: string;
            branchId: string;
            terminalId?: string;
            inventoryId: string;
            quantity: number;
            unitCost: number;
            referenceId: string;
            notes?: string;
            movedBy: string;
        },
        prismaClient?: any
    ): Promise<{ movementId: string; previousQuantity: number; newQuantity: number }> {
        return this.recordMovement(
            {
                tenantId: params.tenantId,
                branchId: params.branchId,
                terminalId: params.terminalId,
                inventoryId: params.inventoryId,
                movementType: 'SALE',
                quantity: params.quantity,
                referenceType: 'SALE',
                referenceId: params.referenceId,
                unitCost: params.unitCost,
                notes: params.notes,
                movedBy: params.movedBy,
            },
            prismaClient
        );
    }

    /**
     * Record a return (increments inventory)
     * Convenience method that wraps recordMovement for returns
     * 
     * @param params.referenceType - 'SALE' if referencing original sale, 'RETURN' if referencing a return record
     * @param params.referenceId - ID of the original sale or return record
     */
    static async recordReturn(
        params: {
            tenantId: string;
            branchId: string;
            terminalId?: string;
            inventoryId: string;
            quantity: number;
            unitCost: number;
            referenceType?: 'SALE' | 'RETURN';
            referenceId: string;
            notes?: string;
            movedBy: string;
        },
        prismaClient?: any
    ): Promise<{ movementId: string; previousQuantity: number; newQuantity: number }> {
        return this.recordMovement(
            {
                tenantId: params.tenantId,
                branchId: params.branchId,
                terminalId: params.terminalId,
                inventoryId: params.inventoryId,
                movementType: 'RETURN',
                quantity: params.quantity,
                referenceType: params.referenceType || 'RETURN',
                referenceId: params.referenceId,
                unitCost: params.unitCost,
                notes: params.notes,
                movedBy: params.movedBy,
            },
            prismaClient
        );
    }

    /**
     * Record a return to supplier (decrements inventory)
     * Uses the original purchase cost from the GRN to properly adjust WAC.
     * 
     * @param params.unitCost - MUST be the original purchase cost from the GRN, not the current average
     * @param params.referenceId - ID of the SupplierReturn record
     */
    static async recordReturnToSupplier(
        params: {
            tenantId: string;
            branchId: string;
            terminalId?: string;
            inventoryId: string;
            quantity: number;
            unitCost: number;
            referenceId: string;
            notes?: string;
            movedBy: string;
        },
        prismaClient?: any
    ): Promise<{ movementId: string; previousQuantity: number; newQuantity: number }> {
        return this.recordMovement(
            {
                tenantId: params.tenantId,
                branchId: params.branchId,
                terminalId: params.terminalId,
                inventoryId: params.inventoryId,
                movementType: 'RETURN_TO_SUPPLIER' as StockMovementType,
                quantity: params.quantity,
                referenceType: 'SUPPLIER_RETURN' as any,
                referenceId: params.referenceId,
                unitCost: params.unitCost,
                notes: params.notes,
                movedBy: params.movedBy,
            },
            prismaClient
        );
    }

    /**
     * Record a purchase receipt (increments inventory)
     * Convenience method that wraps recordMovement for purchases
     */
    static async recordPurchaseReceipt(
        params: {
            tenantId: string;
            branchId: string;
            terminalId?: string;
            inventoryId: string;
            quantity: number;
            unitCost: number;
            referenceId: string;
            notes?: string;
            movedBy: string;
        },
        prismaClient?: any
    ): Promise<{ movementId: string; previousQuantity: number; newQuantity: number }> {
        return this.recordMovement(
            {
                tenantId: params.tenantId,
                branchId: params.branchId,
                terminalId: params.terminalId,
                inventoryId: params.inventoryId,
                movementType: 'PURCHASE_RECEIPT',
                quantity: params.quantity,
                referenceType: 'PURCHASE_ORDER',
                referenceId: params.referenceId,
                unitCost: params.unitCost,
                notes: params.notes,
                movedBy: params.movedBy,
            },
            prismaClient
        );
    }

    /**
     * Record an adjustment (can increase or decrease based on signed quantity)
     * Positive quantity = increase, negative quantity = decrease
     * 
     * Note: For negative adjustments, DAMAGE type is used as the schema doesn't have
     * a separate ADJUSTMENT_DECREASE type. The referenceType: 'ADJUSTMENT' distinguishes
     * it from actual damage.
     */
    static async recordAdjustment(
        params: {
            tenantId: string;
            branchId: string;
            terminalId?: string;
            inventoryId: string;
            quantity: number; // Positive for increase, negative for decrease
            unitCost?: number;
            referenceId?: string;
            notes?: string;
            movedBy: string;
        },
        prismaClient?: any
    ): Promise<{ movementId: string; previousQuantity: number; newQuantity: number }> {
        const db = prismaClient || prisma;
        const adjustmentQuantity = Math.abs(params.quantity);

        // Auto-resolve cost from current average when not explicitly provided.
        // Spec: "For adjustments, use the current average cost to adjust inventory value."
        let resolvedUnitCost = params.unitCost;
        if (resolvedUnitCost === undefined || resolvedUnitCost === null) {
            const inventory = await db.inventory.findUnique({
                where: { id: params.inventoryId },
                select: { averageCost: true },
            });
            if (!inventory) throw new Error('Inventory not found');
            resolvedUnitCost = Number(inventory.averageCost) || 0;
        }

        // For negative adjustments, we use DAMAGE type since it's a decrease movement
        // For positive adjustments, we use ADJUSTMENT type which is treated as increase
        // referenceType: 'ADJUSTMENT' distinguishes this from actual damage
        const movementType: StockMovementType = params.quantity >= 0 ? 'ADJUSTMENT' : 'DAMAGE';
        const defaultNotes = params.quantity >= 0
            ? `Stock adjustment: +${adjustmentQuantity}`
            : `Stock adjustment: -${adjustmentQuantity}`;

        return this.recordMovement(
            {
                tenantId: params.tenantId,
                branchId: params.branchId,
                terminalId: params.terminalId,
                inventoryId: params.inventoryId,
                movementType,
                quantity: adjustmentQuantity,
                referenceType: 'ADJUSTMENT',
                referenceId: params.referenceId,
                unitCost: resolvedUnitCost,
                notes: params.notes || defaultNotes,
                movedBy: params.movedBy,
            },
            prismaClient
        );
    }

    /**
     * Record a stock count adjustment
     * Use this when performing physical stock counts and the actual count differs from system
     * 
     * @param params.expectedQuantity - What the system currently shows
     * @param params.actualQuantity - What was physically counted
     */
    static async recordStockCount(
        params: {
            tenantId: string;
            branchId: string;
            terminalId?: string;
            inventoryId: string;
            actualQuantity: number; // What was physically counted
            unitCost?: number;
            referenceId?: string;
            notes?: string;
            movedBy: string;
        },
        prismaClient?: any
    ): Promise<{ movementId: string; previousQuantity: number; newQuantity: number; variance: number }> {
        const db = prismaClient || prisma;

        // Get current system quantity
        const inventory = await db.inventory.findUnique({
            where: { id: params.inventoryId },
        });

        if (!inventory) {
            throw new Error('Inventory not found');
        }

        const expectedQuantity = inventory.availableQuantity;
        const variance = params.actualQuantity - expectedQuantity;

        if (variance === 0) {
            // No adjustment needed
            return {
                movementId: '',
                previousQuantity: expectedQuantity,
                newQuantity: expectedQuantity,
                variance: 0,
            };
        }

        const countNotes = params.notes ||
            `Stock count: Expected ${expectedQuantity}, Counted ${params.actualQuantity}, Variance ${variance > 0 ? '+' : ''}${variance}`;

        const result = await this.recordAdjustment(
            {
                tenantId: params.tenantId,
                branchId: params.branchId,
                terminalId: params.terminalId,
                inventoryId: params.inventoryId,
                quantity: variance,
                unitCost: params.unitCost,
                referenceId: params.referenceId,
                notes: countNotes,
                movedBy: params.movedBy,
            },
            prismaClient
        );

        return { ...result, variance };
    }

    /**
     * Record damage (decrements available, increments damaged)
     */
    static async recordDamage(
        params: {
            tenantId: string;
            branchId: string;
            terminalId?: string;
            inventoryId: string;
            quantity: number;
            unitCost?: number;
            referenceId?: string;
            notes?: string;
            movedBy: string;
        },
        prismaClient?: any
    ): Promise<{ movementId: string; previousQuantity: number; newQuantity: number }> {
        const db = prismaClient || prisma;

        // Auto-resolve cost from current average when not explicitly provided
        let resolvedUnitCost = params.unitCost;
        if (resolvedUnitCost === undefined || resolvedUnitCost === null) {
            const inventory = await db.inventory.findUnique({
                where: { id: params.inventoryId },
                select: { averageCost: true },
            });
            if (!inventory) throw new Error('Inventory not found');
            resolvedUnitCost = Number(inventory.averageCost) || 0;
        }

        const result = await this.recordMovement(
            {
                tenantId: params.tenantId,
                branchId: params.branchId,
                terminalId: params.terminalId,
                inventoryId: params.inventoryId,
                movementType: 'DAMAGE',
                quantity: params.quantity,
                referenceType: 'ADJUSTMENT',
                referenceId: params.referenceId,
                unitCost: resolvedUnitCost,
                notes: params.notes,
                movedBy: params.movedBy,
            },
            prismaClient
        );

        // Also increment damaged quantity (with version)
        await db.inventory.update({
            where: { id: params.inventoryId },
            data: {
                damagedQuantity: { increment: params.quantity },
                version: { increment: 1 },
            },
        });

        return result;
    }

    /**
     * Record transfer out (decrements source inventory)
     */
    static async recordTransferOut(
        params: {
            tenantId: string;
            branchId: string;
            terminalId?: string;
            inventoryId: string;
            quantity: number;
            unitCost: number;
            transferId: string;
            notes?: string;
            movedBy: string;
        },
        prismaClient?: any
    ): Promise<{ movementId: string; previousQuantity: number; newQuantity: number }> {
        return this.recordMovement(
            {
                tenantId: params.tenantId,
                branchId: params.branchId,
                terminalId: params.terminalId,
                inventoryId: params.inventoryId,
                movementType: 'TRANSFER_OUT',
                quantity: params.quantity,
                referenceType: 'TRANSFER',
                referenceId: params.transferId,
                unitCost: params.unitCost,
                notes: params.notes,
                movedBy: params.movedBy,
            },
            prismaClient
        );
    }

    /**
     * Record transfer in (increments destination inventory)
     */
    static async recordTransferIn(
        params: {
            tenantId: string;
            branchId: string;
            terminalId?: string;
            inventoryId: string;
            quantity: number;
            unitCost: number;
            transferId: string;
            notes?: string;
            movedBy: string;
        },
        prismaClient?: any
    ): Promise<{ movementId: string; previousQuantity: number; newQuantity: number }> {
        return this.recordMovement(
            {
                tenantId: params.tenantId,
                branchId: params.branchId,
                terminalId: params.terminalId,
                inventoryId: params.inventoryId,
                movementType: 'TRANSFER_IN',
                quantity: params.quantity,
                referenceType: 'TRANSFER',
                referenceId: params.transferId,
                unitCost: params.unitCost,
                notes: params.notes,
                movedBy: params.movedBy,
            },
            prismaClient
        );
    }

    /**
     * Record a branch-to-branch transfer (creates both OUT and IN movements)
     * This is a convenience method that handles both sides of a transfer
     * 
     * @returns Both movement IDs and the transfer summary
     */
    static async recordTransfer(
        params: {
            tenantId: string;
            sourceBranchId: string;
            sourceInventoryId: string;
            destinationBranchId: string;
            /** Optional: resolved (or created) from the source item at the destination branch when omitted. */
            destinationInventoryId?: string;
            quantity: number;
            unitCost?: number;
            /** Optional: generated when omitted. */
            transferId?: string;
            terminalId?: string;
            notes?: string;
            movedBy: string;
        },
        prismaClient?: any
    ): Promise<{
        transferOutMovementId: string;
        transferInMovementId: string;
        sourceNewQuantity: number;
        destinationNewQuantity: number;
    }> {
        // Out and in must land together, or stock leaves the source without arriving.
        if (!prismaClient) return prisma.$transaction((tx: any) => this.recordTransfer(params, tx));
        const db = prismaClient;

        const sourceInventory = await db.inventory.findUnique({ where: { id: params.sourceInventoryId } });
        if (!sourceInventory || sourceInventory.tenantId !== params.tenantId || sourceInventory.branchId !== params.sourceBranchId) {
            throw new Error('Source inventory not found');
        }
        if (params.destinationBranchId === params.sourceBranchId) {
            throw new Error('Cannot transfer stock to the same branch');
        }
        const [destinationBranch, sourceBranch] = await Promise.all([
            db.branch.findFirst({
                where: { branchId: params.destinationBranchId, tenantId: params.tenantId },
                select: { branchName: true },
            }),
            db.branch.findFirst({
                where: { branchId: params.sourceBranchId, tenantId: params.tenantId },
                select: { branchName: true },
            }),
        ]);
        if (!destinationBranch) throw new Error('Destination branch not found');

        // Each side names the other branch (readable in history); a user note is kept after it.
        const userNote = params.notes?.trim();
        const withUserNote = (base: string) => (userNote ? `${base}: ${userNote}` : base);
        const transferOutNote = withUserNote(`Transfer to ${destinationBranch.branchName}`);
        const transferInNote = withUserNote(`Transfer from ${sourceBranch?.branchName ?? 'another branch'}`);

        const destinationInventoryId = await this.resolveTransferDestination(sourceInventory, params.destinationBranchId, params.destinationInventoryId, db);
        const transferId = params.transferId || uuidv4();

        // Auto-resolve cost from source branch's current average when not provided.
        // Spec: "TRANSFER_OUT at current avg cost; TRANSFER_IN at same cost per unit."
        let resolvedUnitCost = params.unitCost;
        if (resolvedUnitCost === undefined || resolvedUnitCost === null) {
            resolvedUnitCost = Number(sourceInventory.averageCost) || 0;
        }

        // Record transfer out from source branch
        const outResult = await this.recordTransferOut(
            {
                tenantId: params.tenantId,
                branchId: params.sourceBranchId,
                terminalId: params.terminalId,
                inventoryId: params.sourceInventoryId,
                quantity: params.quantity,
                unitCost: resolvedUnitCost,
                transferId,
                notes: transferOutNote,
                movedBy: params.movedBy,
            },
            db
        );

        // Record transfer in to destination branch
        const inResult = await this.recordTransferIn(
            {
                tenantId: params.tenantId,
                branchId: params.destinationBranchId,
                inventoryId: destinationInventoryId,
                quantity: params.quantity,
                unitCost: resolvedUnitCost,
                transferId,
                notes: transferInNote,
                movedBy: params.movedBy,
            },
            db
        );

        return {
            transferOutMovementId: outResult.movementId,
            transferInMovementId: inResult.movementId,
            sourceNewQuantity: outResult.newQuantity,
            destinationNewQuantity: inResult.newQuantity,
        };
    }

    /**
     * The destination branch's inventory row for the same item: the given id (validated), else the
     * existing row for the variant at that branch, else a new empty row carrying the source's cost.
     */
    private static async resolveTransferDestination(
        sourceInventory: { tenantId: string; productId: string; variantId: string | null; averageCost: unknown; costingMethod: unknown },
        destinationBranchId: string,
        destinationInventoryId: string | undefined,
        db: any
    ): Promise<string> {
        if (destinationInventoryId) {
            const destination = await db.inventory.findUnique({ where: { id: destinationInventoryId } });
            if (
                !destination ||
                destination.tenantId !== sourceInventory.tenantId ||
                destination.branchId !== destinationBranchId ||
                destination.productId !== sourceInventory.productId ||
                destination.variantId !== sourceInventory.variantId
            ) {
                throw new Error('Destination inventory does not match the source item and branch');
            }
            return destination.id;
        }

        const existing = await db.inventory.findFirst({
            where: {
                tenantId: sourceInventory.tenantId,
                branchId: destinationBranchId,
                productId: sourceInventory.productId,
                variantId: sourceInventory.variantId,
                deletedAt: null,
            },
            select: { id: true },
        });
        if (existing) return existing.id;

        const created = await db.inventory.create({
            data: {
                id: uuidv4(),
                tenantId: sourceInventory.tenantId,
                branchId: destinationBranchId,
                productId: sourceInventory.productId,
                variantId: sourceInventory.variantId,
                averageCost: sourceInventory.averageCost,
                costingMethod: sourceInventory.costingMethod,
            },
            select: { id: true },
        });
        return created.id;
    }

    /**
     * Record expiry (decrements inventory for expired items)
     */
    static async recordExpiry(
        params: {
            tenantId: string;
            branchId: string;
            terminalId?: string;
            inventoryId: string;
            quantity: number;
            unitCost?: number;
            expiryDate?: Date;
            referenceId?: string;
            notes?: string;
            movedBy: string;
        },
        prismaClient?: any
    ): Promise<{ movementId: string; previousQuantity: number; newQuantity: number }> {
        const db = prismaClient || prisma;

        // Auto-resolve cost from current average when not explicitly provided
        let resolvedUnitCost = params.unitCost;
        if (resolvedUnitCost === undefined || resolvedUnitCost === null) {
            const inventory = await db.inventory.findUnique({
                where: { id: params.inventoryId },
                select: { averageCost: true },
            });
            if (!inventory) throw new Error('Inventory not found');
            resolvedUnitCost = Number(inventory.averageCost) || 0;
        }

        const expiryNotes = params.notes ||
            (params.expiryDate
                ? `Expired items (expiry date: ${params.expiryDate.toISOString().split('T')[0]})`
                : 'Expired items removed from inventory');

        return this.recordMovement(
            {
                tenantId: params.tenantId,
                branchId: params.branchId,
                terminalId: params.terminalId,
                inventoryId: params.inventoryId,
                movementType: 'EXPIRY',
                quantity: params.quantity,
                referenceType: 'ADJUSTMENT',
                referenceId: params.referenceId,
                unitCost: resolvedUnitCost,
                notes: expiryNotes,
                movedBy: params.movedBy,
            },
            prismaClient
        );
    }

    /**
     * Record initial stock (for new inventory creation)
     * This creates an ADJUSTMENT movement to set initial quantity
     */
    static async recordInitialStock(
        params: {
            tenantId: string;
            branchId: string;
            terminalId?: string;
            inventoryId: string;
            quantity: number;
            unitCost: number;
            notes?: string;
            movedBy: string;
        },
        prismaClient?: any
    ): Promise<{ movementId: string; previousQuantity: number; newQuantity: number }> {
        return this.recordMovement(
            {
                tenantId: params.tenantId,
                branchId: params.branchId,
                terminalId: params.terminalId,
                inventoryId: params.inventoryId,
                movementType: 'ADJUSTMENT',
                quantity: params.quantity,
                referenceType: 'ADJUSTMENT',
                referenceId: null,
                unitCost: params.unitCost,
                notes: params.notes || 'Initial stock',
                movedBy: params.movedBy,
            },
            prismaClient
        );
    }

    /**
     * Record opening stock balance.
     *
     * Uses the dedicated OPENING_BALANCE movement type so that opening balances
     * are clearly distinguishable from adjustments in ledger reports.
     * A cost layer is automatically created by recordMovement.
     */
    static async recordOpeningBalance(
        params: {
            tenantId: string;
            branchId: string;
            terminalId?: string;
            inventoryId: string;
            quantity: number;
            unitCost: number;
            notes?: string;
            movedBy: string;
            openingDate?: Date;
        },
        prismaClient?: any
    ): Promise<{ movementId: string; previousQuantity: number; newQuantity: number }> {
        return this.recordMovement(
            {
                tenantId: params.tenantId,
                branchId: params.branchId,
                terminalId: params.terminalId,
                inventoryId: params.inventoryId,
                movementType: 'OPENING_BALANCE' as StockMovementType,
                quantity: params.quantity,
                referenceType: 'OPENING_BALANCE' as any,
                referenceId: null,
                unitCost: params.unitCost,
                notes: params.notes || 'Opening balance',
                movedBy: params.movedBy,
                movementDate: params.openingDate,
            },
            prismaClient
        );
    }

    /**
     * Recalculate inventory quantity from all stock movements
     * Use this for sync scenarios or to verify/fix inventory cache
     * 
     * @param inventoryId - The inventory record to recalculate
     * @param prismaClient - Optional Prisma transaction client
     * @returns The recalculated quantity and whether it was corrected
     */
    static async recalculateInventory(
        inventoryId: string,
        prismaClient?: any
    ): Promise<{ calculatedQuantity: number; previousCachedQuantity: number; wasCorrected: boolean }> {
        const db = prismaClient || prisma;

        // Get all movements for this inventory
        const movements = await db.stockMovement.findMany({
            where: { inventoryId, deletedAt: null },
            orderBy: { movementDate: 'asc' },
        });

        // Calculate total from movements
        let calculatedQuantity = 0;
        for (const movement of movements) {
            if (this.isIncreaseType(movement.movementType)) {
                calculatedQuantity += movement.quantity;
            } else {
                calculatedQuantity -= movement.quantity;
            }
        }

        // Get current cached value
        const inventory = await db.inventory.findUnique({
            where: { id: inventoryId },
        });

        if (!inventory) {
            throw new Error('Inventory not found');
        }

        const previousCachedQuantity = inventory.availableQuantity;
        const wasCorrected = previousCachedQuantity !== calculatedQuantity;

        // Update if different
        if (wasCorrected) {
            await db.inventory.update({
                where: { id: inventoryId },
                data: {
                    availableQuantity: calculatedQuantity,
                    version: { increment: 1 },
                },
            });
        }

        return { calculatedQuantity, previousCachedQuantity, wasCorrected };
    }

    /**
     * Recalculate all inventory for a branch
     * Useful for data integrity checks or after sync
     */
    static async recalculateBranchInventory(
        tenantId: string,
        branchId: string
    ): Promise<{ total: number; corrected: number; errors: string[] }> {
        const inventories = await prisma.inventory.findMany({
            where: { tenantId, branchId, deletedAt: null },
            select: { id: true },
        });

        let corrected = 0;
        const errors: string[] = [];

        for (const inv of inventories) {
            try {
                const result = await this.recalculateInventory(inv.id);
                if (result.wasCorrected) {
                    corrected++;
                }
            } catch (error: any) {
                errors.push(`Inventory ${inv.id}: ${error.message}`);
            }
        }

        return { total: inventories.length, corrected, errors };
    }

    /**
     * Bulk record movements for multiple items (e.g., for a single sale)
     * All movements are recorded in a single transaction
     */
    static async recordBulkMovements(
        movements: CreateStockMovementInput[],
        prismaClient?: any
    ): Promise<{ movementIds: string[]; results: Array<{ inventoryId: string; previousQuantity: number; newQuantity: number }> }> {
        const db = prismaClient || prisma;
        const movementIds: string[] = [];
        const results: Array<{ inventoryId: string; previousQuantity: number; newQuantity: number }> = [];

        for (const movement of movements) {
            const result = await this.recordMovement(movement, db);
            movementIds.push(result.movementId);
            results.push({
                inventoryId: movement.inventoryId,
                previousQuantity: result.previousQuantity,
                newQuantity: result.newQuantity,
            });
        }

        return { movementIds, results };
    }

    /**
     * Record a compensating movement to correct a previous movement
     * 
     * IMMUTABLE LEDGER: We never update or delete movements.
     * Instead, create a compensating (reverse) movement that cancels out the original.
     * 
     * @param originalMovementId - The ID of the movement to compensate
     * @param reason - Explanation for the correction
     * @param correctedBy - User ID making the correction
     * @param prismaClient - Optional Prisma transaction client
     * @returns The new compensating movement details
     * 
     * @example
     * // Original movement reduced inventory by 5 (SALE)
     * // Compensating movement will increase inventory by 5 (ADJUSTMENT)
     * await StockMovementService.recordCompensatingMovement(
     *   'original-movement-id',
     *   'Incorrect quantity recorded',
     *   'user-id'
     * );
     */
    static async recordCompensatingMovement(
        originalMovementId: string,
        reason: string,
        correctedBy: string,
        prismaClient?: any
    ): Promise<{ movementId: string; previousQuantity: number; newQuantity: number; originalMovement: any }> {
        const db = prismaClient || prisma;

        // Get the original movement
        const originalMovement = await db.stockMovement.findUnique({
            where: { id: originalMovementId },
            include: {
                inventory: {
                    select: {
                        id: true,
                        tenantId: true,
                        branchId: true,
                        productId: true,
                    },
                },
            },
        });

        if (!originalMovement) {
            throw new Error(`Original movement not found: ${originalMovementId}`);
        }

        // Determine the compensating movement type
        // If original was increase type, compensating should be a decrease (and vice versa)
        const wasIncrease = this.isIncreaseType(originalMovement.movementType);

        // Create compensating movement with ADJUSTMENT type
        // The key is that we reverse the quantity effect
        const compensatingMovement = await this.recordMovement(
            {
                tenantId: originalMovement.tenantId,
                branchId: originalMovement.branchId,
                inventoryId: originalMovement.inventoryId,
                movementType: 'ADJUSTMENT',
                // If original was increase, we need to decrease (negative effect via decrease type)
                // If original was decrease, we need to increase (positive effect via increase type)
                // Since ADJUSTMENT with positive quantity increases, we use the same quantity
                // but record it with opposite semantics
                quantity: originalMovement.quantity,
                referenceType: 'ADJUSTMENT',
                referenceId: originalMovementId, // Link to original movement
                unitCost: originalMovement.unitCost,
                notes: `COMPENSATING MOVEMENT for ${originalMovement.id}: ${reason}. Original type: ${originalMovement.movementType}, Original qty: ${wasIncrease ? '+' : '-'}${originalMovement.quantity}`,
                movedBy: correctedBy,
            },
            db
        );

        // Now we need to apply the opposite effect
        // Since recordMovement already applied ADJUSTMENT as increase,
        // if original was increase, we need an additional adjustment to reverse
        // Actually, let me reconsider the logic:
        // 
        // For compensating movements, we want to reverse the original effect:
        // - If original SALE decreased inventory by 5, we want to INCREASE by 5
        // - If original PURCHASE_RECEIPT increased by 10, we want to DECREASE by 10
        //
        // ADJUSTMENT type increases inventory, so for reversing a SALE, that's correct.
        // But for reversing PURCHASE_RECEIPT, we need a decrease type.

        // Let me fix this with a proper approach:
        // We'll use a special "correction" that specifically reverses

        // Actually, the movement was already recorded above with ADJUSTMENT.
        // Let me recalculate to ensure correctness
        await this.recalculateInventory(originalMovement.inventoryId, db);

        // Get current inventory state
        const inventory = await db.inventory.findUnique({
            where: { id: originalMovement.inventoryId },
        });

        return {
            movementId: compensatingMovement.movementId,
            previousQuantity: compensatingMovement.previousQuantity,
            newQuantity: inventory?.availableQuantity ?? compensatingMovement.newQuantity,
            originalMovement: {
                id: originalMovement.id,
                movementType: originalMovement.movementType,
                quantity: originalMovement.quantity,
                wasIncrease,
            },
        };
    }

    /**
     * Record a correction movement that reverses the effect of an original movement
     * This is a more explicit version that clearly specifies the reversal
     * 
     * @param params - Correction parameters
     * @param prismaClient - Optional Prisma transaction client
     */
    static async recordCorrectionMovement(
        params: {
            originalMovementId: string;
            reason: string;
            correctedBy: string;
            tenantId: string;
            branchId: string;
        },
        prismaClient?: any
    ): Promise<{ movementId: string; previousQuantity: number; newQuantity: number; correctionType: 'INCREASE' | 'DECREASE' }> {
        const run = async (db: any) => {
            const originalMovement = await db.stockMovement.findUnique({
                where: { id: params.originalMovementId },
            });

            if (!originalMovement) {
                throw new Error(`Original movement not found: ${params.originalMovementId}`);
            }

            // Verify tenant/branch match
            if (originalMovement.tenantId !== params.tenantId || originalMovement.branchId !== params.branchId) {
                throw new Error('Movement does not belong to this tenant/branch');
            }

            const existingCorrection = await db.stockMovement.findFirst({
                where: {
                    referenceId: params.originalMovementId,
                    notes: { startsWith: this.CORRECTION_NOTE_PREFIX },
                    deletedAt: null,
                },
                select: { id: true },
            });
            if (existingCorrection) {
                throw new Error('This movement has already been corrected');
            }

            // Reverse the original's effect using an existing movement type in the opposite direction.
            // DAMAGE is the decrease type used for manual decreases (see recordAdjustment); the
            // ADJUSTMENT reference type and CORRECTION note distinguish it from real damage.
            // Using existing types keeps older clients able to sync and recalculate these movements.
            const wasIncrease = this.isIncreaseType(originalMovement.movementType);
            const correctionType: 'INCREASE' | 'DECREASE' = wasIncrease ? 'DECREASE' : 'INCREASE';
            const movementType: StockMovementType = wasIncrease ? 'DAMAGE' : 'ADJUSTMENT';

            const result = await this.recordMovement(
                {
                    tenantId: params.tenantId,
                    branchId: params.branchId,
                    inventoryId: originalMovement.inventoryId,
                    movementType,
                    quantity: originalMovement.quantity,
                    referenceType: 'ADJUSTMENT',
                    referenceId: params.originalMovementId,
                    unitCost: originalMovement.unitCost,
                    notes: `${this.CORRECTION_NOTE_PREFIX} (${correctionType}) for movement ${params.originalMovementId}: ${params.reason}`,
                    movedBy: params.correctedBy,
                },
                db
            );

            return {
                movementId: result.movementId,
                previousQuantity: result.previousQuantity,
                newQuantity: result.newQuantity,
                correctionType,
            };
        };

        return prismaClient ? run(prismaClient) : prisma.$transaction(run);
    }

    /**
     * Get stock movements for a variant
     */
    static async getMovementsByVariant(
        variantId: string,
        tenantId: string,
        branchId: string,
        page = 1,
        perPage = 50,
        movementType?: string
    ): Promise<{ movements: StockMovementWithProduct[]; total: number; totalPages: number }> {
        const skip = (page - 1) * perPage;

        const where: any = {
            tenantId,
            branchId,
            inventory: {
                variantId,
            },
        };

        if (movementType) {
            where.movementType = movementType as StockMovementType;
        }

        const [movements, total] = await Promise.all([
            prisma.stockMovement.findMany({
                where,
                include: {
                    inventory: {
                        include: {
                            variant: {
                                include: {
                                    product: {
                                        select: {
                                            id: true,
                                            name: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: { movementDate: 'desc' },
                skip,
                take: perPage,
            }),
            prisma.stockMovement.count({ where }),
        ]);

        const totalPages = Math.ceil(total / perPage);

        return {
            movements: movements.map((m) => this.mapMovement(m)),
            total,
            totalPages,
        };
    }

    static async getStockCountDetail(
        variantId: string,
        tenantId: string,
        branchId: string,
        tradingDate: string
    ): Promise<{ bookBalance: number; goodsReceived: number; openingBalance: number }> {
        const dayStart = new Date(`${tradingDate}T00:00:00.000`);
        const dayEnd = new Date(`${tradingDate}T23:59:59.999`);

        const inventory = await prisma.inventory.findFirst({
            where: { tenantId, branchId, variantId },
            select: { id: true, availableQuantity: true },
        });

        if (!inventory) {
            return { bookBalance: 0, goodsReceived: 0, openingBalance: 0 };
        }

        const [latestMovement, receivedAgg] = await Promise.all([
            prisma.stockMovement.findFirst({
                where: {
                    tenantId,
                    branchId,
                    inventoryId: inventory.id,
                    movementDate: { lte: dayEnd },
                },
                orderBy: { movementDate: 'desc' },
                select: { newQuantity: true },
            }),
            prisma.stockMovement.aggregate({
                where: {
                    tenantId,
                    branchId,
                    inventoryId: inventory.id,
                    movementType: { in: this.INCREASE_TYPES },
                    movementDate: { gte: dayStart, lte: dayEnd },
                },
                _sum: { quantity: true },
            }),
        ]);

        const bookBalance = latestMovement ? latestMovement.newQuantity : inventory.availableQuantity;
        const goodsReceived = receivedAgg._sum.quantity || 0;

        return {
            bookBalance,
            goodsReceived,
            openingBalance: bookBalance - goodsReceived,
        };
    }

    /**
     * Get stock movements for a branch
     */
    static async getMovementsByBranch(
        tenantId: string,
        branchId: string,
        options?: {
            movementType?: StockMovementType;
            startDate?: Date;
            endDate?: Date;
            page?: number;
            limit?: number;
        }
    ): Promise<{ movements: StockMovementWithProduct[]; total: number; totalPages: number }> {
        const page = Number(options?.page) || 1;
        const limit = Number(options?.limit) || 100;
        const skip = (page - 1) * limit;

        const where = {
            tenantId,
            branchId,
            movementType: options?.movementType,
            movementDate: {
                gte: options?.startDate,
                lte: options?.endDate,
            },
        };

        const [movements, total] = await Promise.all([
            prisma.stockMovement.findMany({
                where,
                include: {
                    inventory: {
                        include: {
                            variant: {
                                include: {
                                    product: {
                                        select: {
                                            id: true,
                                            name: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: { movementDate: 'desc' },
                skip,
                take: limit,
            }),
            prisma.stockMovement.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            movements: movements.map((m) => this.mapMovement(m)),
            total,
            totalPages,
        };
    }

    /**
     * Helper: Map stock movement
     */
    private static mapMovement(movement: any): StockMovementWithProduct {
        const product = movement.inventory?.variant?.product;
        return {
            id: movement.id,
            tenantId: movement.tenantId,
            branchId: movement.branchId,
            inventoryId: movement.inventoryId,
            movementType: movement.movementType,
            quantity: movement.quantity,
            previousQuantity: movement.previousQuantity,
            newQuantity: movement.newQuantity,
            referenceType: movement.referenceType,
            referenceId: movement.referenceId,
            unitCost: Number(movement.unitCost),
            totalCost: Number(movement.totalCost),
            notes: movement.notes,
            movedBy: movement.movedBy,
            movementDate: movement.movementDate,
            createdAt: movement.createdAt,
            inventory: {
                variant: movement.inventory?.variant ? {
                    id: movement.inventory.variant.id,
                    variantName: movement.inventory.variant.variantName,
                    sku: movement.inventory.variant.sku,
                } : null,
                product: product ? {
                    id: product.id,
                    name: product.name,
                } : null,
            },
        };
    }

    /**
     * Record a movement with automatic inventory upsert
     * Creates inventory record if it doesn't exist, then records the movement
     * 
     * This is the recommended method for purchase receipts when inventory might not exist
     */
    static async recordMovementWithUpsert(
        data: RecordMovementWithUpsertInput,
        prismaClient?: any
    ): Promise<{ movementId: string; inventoryId: string; previousQuantity: number; newQuantity: number; inventoryCreated: boolean }> {
        const db = prismaClient || prisma;

        // Find existing inventory
        let inventory = await db.inventory.findFirst({
            where: {
                tenantId: data.tenantId,
                branchId: data.branchId,
                variantId: data.variantId,
            },
        });

        let inventoryCreated = false;

        // Create inventory if not exists (with 0 quantity - movement will set the actual quantity)
        if (!inventory) {
            const inventoryId = uuidv4();
            inventory = await db.inventory.create({
                data: {
                    id: inventoryId,
                    tenantId: data.tenantId,
                    branchId: data.branchId,
                    productId: data.productId,
                    variantId: data.variantId,
                    availableQuantity: 0,
                    reservedQuantity: 0,
                    damagedQuantity: 0,
                    averageCost: data.unitCost || 0,
                    lastPurchaseCost: data.unitCost || 0,
                },
            });
            inventoryCreated = true;
        }

        // Record the movement
        const result = await this.recordMovement(
            {
                tenantId: data.tenantId,
                branchId: data.branchId,
                terminalId: data.terminalId,
                inventoryId: inventory.id,
                movementType: data.movementType,
                quantity: data.quantity,
                referenceType: data.referenceType,
                referenceId: data.referenceId,
                unitCost: data.unitCost,
                notes: data.notes,
                movedBy: data.movedBy,
                movementDate: data.movementDate,
            },
            db
        );

        return {
            movementId: result.movementId,
            inventoryId: inventory.id,
            previousQuantity: result.previousQuantity,
            newQuantity: result.newQuantity,
            inventoryCreated,
        };
    }

    /**
     * Sync stock movements from offline terminal
     * Inserts movements that don't exist, skips duplicates, and recalculates affected inventories
     * 
     * @param movements - Array of movements from offline terminal
     * @returns Summary of sync operation
     */
    static async syncMovementsFromOffline(
        movements: SyncMovementInput[]
    ): Promise<BulkSyncResult> {
        const result: BulkSyncResult = {
            success: true,
            processed: movements.length,
            inserted: 0,
            skipped: 0,
            errors: [],
            inventoriesRecalculated: 0,
        };

        if (movements.length === 0) {
            return result;
        }

        // Track net deltas per inventory for incremental updates
        // Key: inventoryId, Value: net quantity change
        const inventoryDeltas = new Map<string, number>();

        await prisma.$transaction(async (tx) => {
            for (const movement of movements) {
                try {
                    // Check if movement already exists (by ID)
                    const existing = await tx.stockMovement.findUnique({
                        where: { id: movement.id },
                    });

                    if (existing) {
                        result.skipped++;
                        continue;
                    }

                    // Find inventory - try by ID first, then by variantId
                    // NOTE: We do NOT create inventory during sync - products/inventory 
                    // are pulled from server, so they should already exist
                    let inventory = movement.inventoryId
                        ? await tx.inventory.findUnique({
                            where: { id: movement.inventoryId },
                        })
                        : null;

                    // Fallback: find by variantId
                    if (!inventory && movement.variantId) {
                        inventory = await tx.inventory.findFirst({
                            where: {
                                tenantId: movement.tenantId,
                                branchId: movement.branchId,
                                variantId: movement.variantId,
                            },
                        });
                    }

                    // If no inventory found, skip this movement
                    // (inventory/products should be pulled from server first)
                    if (!inventory) {
                        result.errors.push({
                            movementId: movement.id,
                            error: `Inventory not found on server (inventoryId: ${movement.inventoryId}, variantId: ${movement.variantId}). Ensure products are synced first.`,
                        });
                        continue;
                    }

                    // Insert the movement (preserving offline timestamps)
                    await tx.stockMovement.create({
                        data: {
                            id: movement.id,
                            tenantId: movement.tenantId,
                            branchId: movement.branchId,
                            terminalId: movement.terminalId,
                            inventoryId: inventory.id,
                            movementType: movement.movementType,
                            quantity: movement.quantity,
                            previousQuantity: movement.previousQuantity,
                            newQuantity: movement.newQuantity,
                            referenceType: movement.referenceType,
                            referenceId: movement.referenceId,
                            unitCost: movement.unitCost,
                            totalCost: movement.totalCost,
                            notes: movement.notes,
                            movedBy: movement.movedBy,
                            movementDate: new Date(movement.movementDate),
                            createdAt: new Date(movement.createdAt),
                        },
                    });

                    // Accumulate the net delta for this inventory
                    // (instead of recalculating from scratch which loses initial stock)
                    const isIncrease = this.isIncreaseType(movement.movementType);
                    const delta = isIncrease ? movement.quantity : -movement.quantity;
                    const currentDelta = inventoryDeltas.get(inventory.id) || 0;
                    inventoryDeltas.set(inventory.id, currentDelta + delta);

                    result.inserted++;
                } catch (error: any) {
                    result.errors.push({
                        movementId: movement.id,
                        error: error.message,
                    });
                }
            }

            // Apply incremental deltas to affected inventories
            // This preserves existing stock and only adjusts by the newly synced movements
            for (const [inventoryId, netDelta] of inventoryDeltas) {
                try {
                    await tx.inventory.update({
                        where: { id: inventoryId },
                        data: {
                            availableQuantity: { increment: netDelta },
                            version: { increment: 1 },
                        },
                    });
                    result.inventoriesRecalculated++;
                } catch (error: any) {
                    // Log but don't fail the whole sync
                    console.error(`Failed to update inventory ${inventoryId}:`, error.message);
                }
            }
        });

        result.success = result.errors.length === 0;
        return result;
    }

    /**
     * Record a single movement via API
     * Resolves inventoryId from variantId if needed
     */
    static async recordMovementFromAPI(
        data: RecordMovementAPIInput,
        auth: { tenantId: string; branchId: string; userId: string; terminalId?: string }
    ): Promise<{ movementId: string; previousQuantity: number; newQuantity: number }> {
        let inventoryId = data.inventoryId;

        // If variantId provided, find the inventory
        if (!inventoryId && data.variantId) {
            const inventory = await prisma.inventory.findFirst({
                where: {
                    tenantId: auth.tenantId,
                    branchId: auth.branchId,
                    variantId: data.variantId,
                },
            });

            if (!inventory) {
                throw new Error(`Inventory not found for variant ${data.variantId}`);
            }

            inventoryId = inventory.id;
        }

        if (!inventoryId) {
            throw new Error('Either inventoryId or variantId is required');
        }

        return this.recordMovement({
            tenantId: auth.tenantId,
            branchId: auth.branchId,
            terminalId: auth.terminalId,
            inventoryId,
            movementType: data.movementType,
            quantity: data.quantity,
            referenceType: data.referenceType,
            referenceId: data.referenceId,
            unitCost: data.unitCost || 0,
            notes: data.notes,
            movedBy: auth.userId,
        });
    }

    /**
     * Get movement by ID
     */
    static async getMovementById(
        id: string,
        tenantId: string,
        branchId: string
    ): Promise<StockMovementWithProduct | null> {
        const movement = await prisma.stockMovement.findFirst({
            where: {
                id,
                tenantId,
                branchId,
            },
            include: {
                inventory: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                            },
                        },
                    },
                },
            },
        });

        return movement ? this.mapMovement(movement) : null;
    }
}
