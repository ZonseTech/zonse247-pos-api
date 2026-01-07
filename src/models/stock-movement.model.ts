import { StockMovementType, StockReferenceType } from '../databases/prisma/generated/prisma/client';

export interface StockMovement {
    id: string;
    tenantId: string;
    branchId: string;
    inventoryId: string;
    movementType: StockMovementType;
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
    referenceType?: StockReferenceType;
    referenceId?: string;
    unitCost: number;
    totalCost: number;
    notes?: string;
    movedBy: string;
    movementDate: Date;
    createdAt: Date;
}

export interface CreateStockMovementInput {
    tenantId: string;
    branchId: string;
    inventoryId: string;
    movementType: StockMovementType;
    quantity: number;
    referenceType?: StockReferenceType;
    referenceId?: string;
    unitCost: number;
    notes?: string;
    movedBy: string;
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
