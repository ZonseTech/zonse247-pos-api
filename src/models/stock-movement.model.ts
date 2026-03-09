import { StockMovementType, StockReferenceType } from '../databases/prisma/generated/prisma/client';

export interface StockMovement {
    id: string;
    tenantId: string;
    branchId: string;
    terminalId?: string | null;
    inventoryId: string;
    movementType: StockMovementType;
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
    referenceType?: StockReferenceType | null;
    referenceId?: string | null;
    unitCost: number;
    totalCost: number;
    notes?: string | null;
    movedBy: string;
    movementDate: Date;
    createdAt: Date;
}

export interface CreateStockMovementInput {
    id?: string; // Optional - will be generated if not provided
    tenantId: string;
    branchId: string;
    terminalId?: string | null;
    inventoryId: string;
    movementType: StockMovementType;
    quantity: number;
    referenceType?: StockReferenceType | null;
    referenceId?: string | null;
    unitCost: number;
    notes?: string | null;
    movedBy: string;
    movementDate?: Date; // Optional - defaults to now
}

export interface StockMovementWithProduct extends StockMovement {
    inventory: {
        product: {
            id: string;
            name: string;
            sku: string;
        };
    };
}

/**
 * Input for recording movement with inventory upsert (creates inventory if not exists)
 */
export interface RecordMovementWithUpsertInput {
    tenantId: string;
    branchId: string;
    terminalId?: string | null;
    variantId: string; // Uses variantId to find/create inventory
    productId?: string; // Optional - for inventory creation
    movementType: StockMovementType;
    quantity: number;
    referenceType?: StockReferenceType | null;
    referenceId?: string | null;
    unitCost: number;
    notes?: string | null;
    movedBy: string;
    movementDate?: Date;
}

/**
 * Input for syncing movements from offline terminal
 */
export interface SyncMovementInput {
    id: string; // Movement ID from offline terminal
    tenantId: string;
    branchId: string;
    terminalId: string;
    inventoryId?: string; // Original inventory ID from terminal
    variantId?: string; // Optional - for inventory lookup/creation
    productId?: string; // Optional - for inventory creation
    movementType: StockMovementType;
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
    referenceType?: StockReferenceType | null;
    referenceId?: string | null;
    unitCost: number;
    totalCost: number;
    notes?: string | null;
    movedBy: string;
    movementDate: Date;
    createdAt: Date;
}

/**
 * Result of bulk sync operation
 */
export interface BulkSyncResult {
    success: boolean;
    processed: number;
    inserted: number;
    skipped: number; // Already existing movements
    errors: Array<{ movementId: string; error: string }>;
    inventoriesRecalculated: number;
}

/**
 * Input for API-based movement recording
 */
export interface RecordMovementAPIInput {
    variantId?: string;
    inventoryId?: string;
    movementType: StockMovementType;
    quantity: number;
    referenceType?: StockReferenceType | null;
    referenceId?: string | null;
    unitCost?: number;
    notes?: string | null;
}
