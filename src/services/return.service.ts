import { v4 as uuidv4 } from 'uuid';
import { ReturnItemModel, ReturnItem } from '../models/return-item.model';
import { StockMovementService } from './inventory/stock-movement.service';
import { AuthenticatedUser } from 'auth';
import { Decimal } from '../databases/prisma/generated/prisma/internal/prismaNamespace';
import { SaleService } from './sale.service';
import { SaleWithItems } from '../models/sale.model';
import { prisma } from '../databases/prisma/client';

export interface ReturnItemRequest {
    saleItemId: string;        // Changed from orderItemId - links to sale_item_id
    productId: string;
    returnQuantity: number;
    returnReason?: string;
    condition?: string;
    notes?: string;
}

export interface ReturnRequest {
    originalSaleId: string;    // Changed from originalTransactionId - now uses sale ID
    items: ReturnItemRequest[];
    refundReason: string;
    refundMethod?: 'original' | 'cash' | 'store_credit';
    partialRefund?: boolean;
}

export interface ReturnResponse {
    returnId: string;
    returnNumber: string;
    returnItems: ReturnItem[];
    refundAmount: number;
    originalSale: SaleWithItems;
    status: string;
    createdAt: Date;
}

export class ReturnService {

    /**
     * Get all returns for a specific tenant/branch
     */
    static async getAllReturns(tenantId: string, branchId: string): Promise<ReturnResponse[]> {
        // Get all refunded/partially refunded sales
        const { sales } = await SaleService.listSales(tenantId, branchId, {
            includeItems: true,
            limit: 1000,
        });

        // Filter for sales that have returns (status is REFUNDED or PARTIALLY_REFUNDED)
        const refundedSales = sales.filter(sale =>
            sale.status === 'REFUNDED' || sale.status === 'PARTIALLY_REFUNDED'
        );

        const returns = await Promise.all(
            refundedSales.map(async (sale) => {
                const returnItems = await ReturnItemModel.findByReturnTransactionId(sale.id);

                return {
                    returnId: sale.id,
                    returnNumber: `RET-${sale.saleNumber}`,
                    returnItems,
                    refundAmount: returnItems.reduce((sum, item) =>
                        sum + (Number(item.returnPrice) * Number(item.returnedQuantity)), 0
                    ),
                    originalSale: sale,
                    status: sale.status,
                    createdAt: sale.updatedAt,
                };
            })
        );

        return returns;
    }

    /**
     * Initiate a return/refund process
     */
    static async initiateReturn(
        request: ReturnRequest,
        auth: AuthenticatedUser
    ): Promise<ReturnResponse> {
        const refundReason = !request.refundReason || request.refundReason === 'null' || request.refundReason.trim() === ''
            ? 'Customer requested return'
            : request.refundReason;

        const originalSale = await this.validateOriginalSale(request.originalSaleId, auth.tenantId, auth.branchId);

        await this.validateReturnItems(request.items, originalSale);

        const refundCalculation = this.calculateRefundAmount(request.items, originalSale);
        const isFullRefund = Math.abs(refundCalculation.refundAmount - Number(originalSale.totalAmount)) < 0.01;

        // Create return items and update sale status
        const returnItems = await this.processReturn(
            originalSale,
            request.items,
            refundCalculation.refundAmount,
            refundReason,
            isFullRefund,
            auth
        );

        await this.updateInventoryForReturn(request.items, originalSale, auth);

        // Get updated sale
        const updatedSale = await SaleService.getSaleById(originalSale.id, auth.tenantId, auth.branchId);

        return {
            returnId: originalSale.id,
            returnNumber: `RET-${originalSale.saleNumber}`,
            returnItems,
            refundAmount: refundCalculation.refundAmount,
            originalSale: updatedSale || originalSale,
            status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
            createdAt: new Date(),
        };
    }

    /**
     * Get all returns for a specific sale
     */
    static async getReturnsBySale(saleId: string, tenantId: string, branchId: string): Promise<ReturnResponse[]> {
        const sale = await SaleService.getSaleById(saleId, tenantId, branchId);

        if (!sale) {
            throw new Error('Sale not found');
        }

        const returnItems = await ReturnItemModel.findByReturnTransactionId(saleId);

        if (returnItems.length === 0) {
            return [];
        }

        return [{
            returnId: sale.id,
            returnNumber: `RET-${sale.saleNumber}`,
            returnItems,
            refundAmount: returnItems.reduce((sum, item) =>
                sum + (Number(item.returnPrice) * Number(item.returnedQuantity)), 0
            ),
            originalSale: sale,
            status: sale.status,
            createdAt: sale.updatedAt,
        }];
    }

    /**
     * Get return details by sale ID
     */
    static async getReturnById(saleId: string, tenantId: string, branchId: string): Promise<ReturnResponse> {
        const sale = await SaleService.getSaleById(saleId, tenantId, branchId);

        if (!sale) {
            throw new Error('Sale not found');
        }

        if (sale.status !== 'REFUNDED' && sale.status !== 'PARTIALLY_REFUNDED') {
            throw new Error('No return found for this sale');
        }

        const returnItems = await ReturnItemModel.findByReturnTransactionId(saleId);

        return {
            returnId: sale.id,
            returnNumber: `RET-${sale.saleNumber}`,
            returnItems,
            refundAmount: returnItems.reduce((sum, item) =>
                sum + (Number(item.returnPrice) * Number(item.returnedQuantity)), 0
            ),
            originalSale: sale,
            status: sale.status,
            createdAt: sale.updatedAt,
        };
    }

    /**
     * Cancel/void a return (if not yet processed)
     * GOLDEN RULE: Uses StockMovementService for inventory changes
     */
    static async cancelReturn(saleId: string, auth: AuthenticatedUser): Promise<void> {
        const sale = await SaleService.getSaleById(saleId, auth.tenantId, auth.branchId);

        if (!sale) {
            throw new Error('Sale not found');
        }

        if (sale.status !== 'REFUNDED' && sale.status !== 'PARTIALLY_REFUNDED') {
            throw new Error('No return found for this sale');
        }

        // Get return items
        const returnItems = await ReturnItemModel.findByReturnTransactionId(saleId);

        // Reverse inventory changes (remove items that were added back)
        // This is reversing a return, so we record a SALE movement to decrement inventory
        const itemsToReverse = returnItems
            .filter(item => Number(item.restockedQuantity || 0) > 0);

        for (const item of itemsToReverse) {
            const quantity = Number(item.restockedQuantity || 0);
            if (quantity <= 0) continue;

            // Find the inventory record for this product
            const inventory = await prisma.inventory.findFirst({
                where: {
                    productId: item.productId,
                    branchId: auth.branchId,
                    tenantId: auth.tenantId,
                },
            });

            if (inventory) {
                // GOLDEN RULE: Record stock movement to reverse the return
                await StockMovementService.recordMovement({
                    tenantId: auth.tenantId,
                    branchId: auth.branchId,
                    inventoryId: inventory.id,
                    movementType: 'SALE', // Use SALE to decrement (reversing a return)
                    quantity: quantity,
                    referenceType: 'RETURN',
                    referenceId: saleId,
                    unitCost: Number(item.returnPrice || 0),
                    notes: `Cancel return - reverse restock for sale ${saleId}`,
                    movedBy: auth.userId,
                });
            }
        }

        // Update sale status back to COMPLETED
        await prisma.sale.update({
            where: { id: saleId },
            data: {
                status: 'COMPLETED',
                updatedAt: new Date(),
            },
        });
    }

    /**
     * Process restocking of returned items
     * GOLDEN RULE: Uses StockMovementService for inventory changes
     */
    static async restockReturnedItems(
        saleId: string,
        restockItems: { returnItemId: string; restockQuantity: number }[],
        auth?: AuthenticatedUser
    ): Promise<void> {
        if (!auth) {
            throw new Error('Authentication context is required for restocking items');
        }

        for (const item of restockItems) {
            const returnItem = await ReturnItemModel.findById(item.returnItemId);

            if (!returnItem) {
                throw new Error(`Return item ${item.returnItemId} not found`);
            }

            if (item.restockQuantity > Number(returnItem.returnedQuantity)) {
                throw new Error('Restock quantity cannot exceed returned quantity');
            }

            const alreadyRestocked = Number(returnItem.restockedQuantity || 0);
            const remainingToRestock = Number(returnItem.returnedQuantity) - alreadyRestocked;

            if (item.restockQuantity > remainingToRestock) {
                throw new Error(`Only ${remainingToRestock} items remaining to restock for this return item`);
            }

            // Find the inventory record for this product
            const inventory = await prisma.inventory.findFirst({
                where: {
                    productId: returnItem.productId,
                    branchId: auth.branchId,
                    tenantId: auth.tenantId,
                },
            });

            if (!inventory) {
                throw new Error(`Inventory not found for product ${returnItem.productId}`);
            }

            // GOLDEN RULE: Record stock movement to add items back to inventory
            await StockMovementService.recordReturn({
                tenantId: auth.tenantId,
                branchId: auth.branchId,
                inventoryId: inventory.id,
                quantity: item.restockQuantity,
                unitCost: Number(returnItem.returnPrice || 0),
                referenceType: 'SALE', // Reference the original sale
                referenceId: saleId,
                notes: `Restock from return item ${item.returnItemId}`,
                movedBy: auth.userId,
            });

            // Update the return item's restock status
            await ReturnItemModel.updateRestockStatus(
                item.returnItemId,
                'restocked',
                alreadyRestocked + item.restockQuantity
            );
        }
    }

    /**
     * Get return statistics for a date range
     */
    static async getReturnStatistics(
        tenantId: string,
        branchId: string,
        startDate: Date,
        endDate: Date
    ): Promise<{
        totalReturns: number;
        totalRefundAmount: number;
        averageRefundAmount: number;
        returnsByReason: Record<string, number>;
    }> {
        // Get return items within date range
        const returnItems = await prisma.returnItem.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });

        const totalRefundAmount = returnItems.reduce(
            (sum, item) => sum + (Number(item.returnPrice) * Number(item.returnedQuantity)), 0
        );

        const returnsByReason: Record<string, number> = {};
        returnItems.forEach(item => {
            const reason = item.returnReason || 'Unknown';
            returnsByReason[reason] = (returnsByReason[reason] || 0) + 1;
        });

        // Count unique sales that have returns
        const uniqueSaleIds = [...new Set(returnItems.map(item => item.returnTransactionId))];

        return {
            totalReturns: uniqueSaleIds.length,
            totalRefundAmount,
            averageRefundAmount: uniqueSaleIds.length > 0 ? totalRefundAmount / uniqueSaleIds.length : 0,
            returnsByReason,
        };
    }

    // Private helper methods

    private static async validateOriginalSale(
        saleId: string,
        tenantId: string,
        branchId: string
    ): Promise<SaleWithItems> {
        const sale = await SaleService.getSaleById(saleId, tenantId, branchId);

        if (!sale) {
            throw new Error('Original sale not found');
        }

        // Only COMPLETED or PARTIALLY_REFUNDED sales can have returns processed
        if (sale.status !== 'COMPLETED' && sale.status !== 'PARTIALLY_REFUNDED') {
            if (sale.status === 'REFUNDED') {
                throw new Error('This sale has already been fully refunded');
            }
            throw new Error('Can only process returns for completed sales');
        }

        if (sale.isVoided) {
            throw new Error('Cannot process return for a voided sale');
        }

        return sale;
    }

    private static async validateReturnItems(
        returnItems: ReturnItemRequest[],
        originalSale: SaleWithItems
    ): Promise<void> {
        if (!returnItems || returnItems.length === 0) {
            throw new Error('At least one item must be returned');
        }

        for (const returnItem of returnItems) {
            const originalItem = originalSale.items.find(
                item => item.id === returnItem.saleItemId
            );

            if (!originalItem) {
                throw new Error(`Sale item ${returnItem.saleItemId} not found in original sale`);
            }

            if (returnItem.returnQuantity <= 0) {
                throw new Error('Return quantity must be greater than 0');
            }

            if (returnItem.returnQuantity > originalItem.quantity) {
                throw new Error(
                    `Return quantity (${returnItem.returnQuantity}) cannot exceed original quantity (${originalItem.quantity})`
                );
            }

            // Check if this item has already been returned
            const existingReturns = await ReturnItemModel.findByOriginalOrderId(returnItem.saleItemId);
            const totalReturnedQty = existingReturns.reduce(
                (sum, item) => sum + Number(item.returnedQuantity),
                0
            );

            const remainingQty = originalItem.quantity - totalReturnedQty;

            if (returnItem.returnQuantity > remainingQty) {
                throw new Error(
                    `Cannot return ${returnItem.returnQuantity} item(s). Original quantity: ${originalItem.quantity}, already returned: ${totalReturnedQty}, remaining: ${remainingQty}`
                );
            }
        }
    }

    private static calculateRefundAmount(
        returnItems: ReturnItemRequest[],
        originalSale: SaleWithItems
    ): { refundAmount: number; itemRefunds: Array<{ itemId: string; amount: number }> } {
        let refundAmount = 0;
        const itemRefunds: Array<{ itemId: string; amount: number }> = [];

        for (const returnItem of returnItems) {
            const originalItem = originalSale.items.find(
                item => item.id === returnItem.saleItemId
            );

            if (originalItem) {
                const itemRefundAmount = Number(originalItem.unitPrice) * returnItem.returnQuantity;
                refundAmount += itemRefundAmount;
                itemRefunds.push({
                    itemId: returnItem.saleItemId,
                    amount: itemRefundAmount,
                });
            }
        }

        return { refundAmount, itemRefunds };
    }

    private static async processReturn(
        originalSale: SaleWithItems,
        returnItems: ReturnItemRequest[],
        refundAmount: number,
        refundReason: string,
        isFullRefund: boolean,
        _auth: AuthenticatedUser
    ): Promise<ReturnItem[]> {
        // Create return items linked to the sale
        const returnItemsData: Partial<ReturnItem>[] = returnItems.map(item => {
            const originalItem = originalSale.items.find(oi => oi.id === item.saleItemId);

            return {
                returnItemId: uuidv4(),
                returnTransactionId: originalSale.id, // Link to sale ID
                originalOrderId: item.saleItemId,     // Link to sale item ID
                productId: item.productId,
                returnedQuantity: new Decimal(item.returnQuantity) as any,
                originalQuantity: new Decimal(originalItem?.quantity || 0) as any,
                returnPrice: new Decimal(originalItem?.unitPrice || 0) as any,
                returnReason: item.returnReason || refundReason,
                condition: item.condition || 'good',
                notes: item.notes,
                restockStatus: 'pending',
                restockedQuantity: new Decimal(0) as any,
            };
        });

        await ReturnItemModel.createMany(returnItemsData);

        // Update the original sale status
        await prisma.sale.update({
            where: { id: originalSale.id },
            data: {
                status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
                notes: originalSale.notes
                    ? `${originalSale.notes}\nRefund: ${refundReason}`
                    : `Refund: ${refundReason}`,
                updatedAt: new Date(),
            },
        });

        return ReturnItemModel.findByReturnTransactionId(originalSale.id);
    }

    /**
     * Update inventory for returned items
     * GOLDEN RULE: Uses StockMovementService for inventory changes
     */
    private static async updateInventoryForReturn(
        returnItems: ReturnItemRequest[],
        originalSale: SaleWithItems,
        auth: AuthenticatedUser
    ): Promise<void> {
        for (const item of returnItems) {
            // Find the original sale item to get the unit cost
            const originalItem = originalSale.items.find(si => si.id === item.saleItemId);
            const unitCost = originalItem ? Number(originalItem.unitCost || 0) : 0;

            // Find the inventory record for this product
            const inventory = await prisma.inventory.findFirst({
                where: {
                    productId: item.productId,
                    branchId: auth.branchId,
                    tenantId: auth.tenantId,
                },
            });

            if (!inventory) {
                // Log warning but continue - inventory might not exist for all products
                console.warn(`Inventory not found for product ${item.productId}, skipping stock update`);
                continue;
            }

            // GOLDEN RULE: Record stock movement to increment inventory
            // referenceType: 'SALE' because we're referencing the original sale
            await StockMovementService.recordReturn({
                tenantId: auth.tenantId,
                branchId: auth.branchId,
                inventoryId: inventory.id,
                quantity: item.returnQuantity,
                unitCost,
                referenceType: 'SALE', // Reference the original sale
                referenceId: originalSale.id,
                notes: item.returnReason || 'Customer return',
                movedBy: auth.userId,
            });
        }
    }
}
