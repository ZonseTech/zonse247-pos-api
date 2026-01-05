import { StockMovementType } from '../databases/prisma/generated/prisma/client';
import { prisma } from '../databases/prisma/client';
import { CreateStockMovementInput, StockMovementWithProduct } from '../models/stock-movement.model';

export class StockMovementService {
    /**
     * Record a stock movement (internal method, not called directly)
     */
    static async recordMovement(
        data: CreateStockMovementInput,
        prismaClient?: any
    ): Promise<void> {
        const db = prismaClient || prisma;

        // Get current inventory
        const inventory = await db.inventory.findUnique({
            where: { id: data.inventoryId },
        });

        if (!inventory) {
            throw new Error('Inventory not found');
        }

        const previousQuantity = inventory.availableQuantity;
        let newQuantity: number;

        switch (data.movementType) {
            case 'PURCHASE_RECEIPT':
            case 'RETURN':
            case 'ADJUSTMENT':
            case 'TRANSFER_IN':
                newQuantity = previousQuantity + data.quantity;
                break;
            case 'SALE':
            case 'TRANSFER_OUT':
            case 'DAMAGE':
            case 'EXPIRY':
                newQuantity = previousQuantity - data.quantity;
                break;
            default:
                throw new Error('Invalid movement type');
        }

        // Create stock movement record
        await db.stockMovement.create({
            data: {
                tenantId: data.tenantId,
                branchId: data.branchId,
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
            },
        });
    }

    /**
     * Get stock movements for a product
     */
    static async getMovementsByProduct(
        productId: string,
        tenantId: string,
        branchId: string,
        page = 1,
        perPage = 50
    ): Promise<{ movements: StockMovementWithProduct[]; total: number; totalPages: number }> {
        const skip = (page - 1) * perPage;

        const where = {
            tenantId,
            branchId,
            inventory: {
                productId,
            },
        };

        const [movements, total] = await Promise.all([
            prisma.stockMovement.findMany({
                where,
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
        const page = options?.page || 1;
        const limit = options?.limit || 100;
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
                product: {
                    id: movement.inventory.product.id,
                    name: movement.inventory.product.name,
                    sku: movement.inventory.product.sku,
                },
            },
        };
    }
}
