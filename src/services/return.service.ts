import { v4 as uuidv4 } from 'uuid';
import { TransactionModel } from '../models/transaction.model';
import { ReturnItemModel, ReturnItem } from '../models/return-item.model';
import { OrderModel } from '../models/order.model';
import { InventoryModel } from '../models/inventory.model';
import { AuthenticatedUser } from 'auth';
import { Transaction } from 'transactions';
import { Decimal } from '../databases/prisma/generated/prisma/internal/prismaNamespace';

export interface ReturnItemRequest {
    orderItemId: string;
    productId: string;
    returnQuantity: number;
    returnReason?: string;
    condition?: string;
    notes?: string;
}

export interface ReturnRequest {
    originalTransactionId: string;
    items: ReturnItemRequest[];
    refundReason: string;
    refundMethod?: 'original' | 'cash' | 'store_credit';
    partialRefund?: boolean;
}

export interface ReturnResponse {
    returnTransaction: Transaction;
    returnItems: ReturnItem[];
    refundAmount: number;
    originalTransaction: Transaction;
}

export class ReturnService {

    /**
     * Get all returns for a specific tenant/branch
     */
    static async getAllReturns(tenantId: string, branchId: string): Promise<ReturnResponse[]> {
        const refundTransactions = await TransactionModel.findByConditions({
            tenantId,
            branchId,
            isRefund: true,
        });

        const returns = await Promise.all(
            refundTransactions.map(async (refundTx) => {
                const returnItems = await ReturnItemModel.findByReturnTransactionId(refundTx.transactionId);
                const originalTransaction = refundTx.originalTransactionId
                    ? await TransactionModel.findById(refundTx.originalTransactionId)
                    : null;

                return {
                    returnTransaction: refundTx,
                    returnItems,
                    refundAmount: Number(refundTx.refundedAmount || 0),
                    originalTransaction: originalTransaction || ({} as Transaction),
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

        const originalTransaction = await this.validateOriginalTransaction(request.originalTransactionId);
        const originalOrderItems = await OrderModel.findByTransactionRefNumber(originalTransaction.refNumber);

        await this.validateReturnItems(request.items, originalOrderItems);

        const refundCalculation = this.calculateRefundAmount(request.items, originalOrderItems);
        const isFullRefund = Math.abs(refundCalculation.refundAmount - Number(originalTransaction.total)) < 0.01;
        const returnTransaction = await this.createRefundTransaction(
            originalTransaction,
            refundCalculation.refundAmount,
            refundReason,
            auth,
            isFullRefund
        );

        const returnItems = await this.createReturnItems(
            returnTransaction.transactionId,
            request.items,
            originalOrderItems
        );

        await this.updateInventoryForReturn(request.items, auth);

        return {
            returnTransaction,
            returnItems,
            refundAmount: refundCalculation.refundAmount,
            originalTransaction,
        };
    }

    /**
     * Get all returns for a specific transaction
     */
    static async getReturnsByTransaction(transactionId: string): Promise<ReturnResponse[]> {
        const refundTransactions = await TransactionModel.findRefundsByOriginalTransaction(transactionId);

        const returns = await Promise.all(
            refundTransactions.map(async (refundTx) => {
                const returnItems = await ReturnItemModel.findByReturnTransactionId(refundTx.transactionId);
                const originalTransaction = await TransactionModel.findById(transactionId);

                if (!originalTransaction) {
                    throw new Error('Original transaction not found');
                }

                return {
                    returnTransaction: refundTx,
                    returnItems,
                    refundAmount: Number(refundTx.refundedAmount || 0),
                    originalTransaction,
                };
            })
        );

        return returns;
    }

    /**
     * Get return details by return transaction ID
     */
    static async getReturnById(returnTransactionId: string): Promise<ReturnResponse> {
        const returnTransaction = await TransactionModel.findById(returnTransactionId);

        if (!returnTransaction || !returnTransaction.isRefund) {
            throw new Error('Return transaction not found');
        }

        const returnItems = await ReturnItemModel.findByReturnTransactionId(returnTransactionId);

        if (!returnTransaction.originalTransactionId) {
            throw new Error('Original transaction ID not found on return transaction');
        }

        const originalTransaction = await TransactionModel.findById(returnTransaction.originalTransactionId);

        if (!originalTransaction) {
            throw new Error('Original transaction not found');
        }

        return {
            returnTransaction,
            returnItems,
            refundAmount: Number(returnTransaction.refundedAmount || 0),
            originalTransaction,
        };
    }

    /**
     * Cancel/void a return (if not yet processed)
     */
    static async cancelReturn(returnTransactionId: string, auth: AuthenticatedUser): Promise<void> {
        const returnTransaction = await TransactionModel.findById(returnTransactionId);

        if (!returnTransaction || !returnTransaction.isRefund) {
            throw new Error('Return transaction not found');
        }

        // Update return transaction status to cancelled
        await TransactionModel.update(returnTransactionId, {
            status: 'cancelled',
            updatedAt: new Date(),
        });

        // Get return items
        const returnItems = await ReturnItemModel.findByReturnTransactionId(returnTransactionId);

        // Reverse inventory changes (remove items that were added back)
        // Note: We only reverse if items were actually restocked
        const itemsToReverse = returnItems
            .filter(item => Number(item.restockedQuantity || 0) > 0)
            .map(item => ({
                productId: item.productId,
                quantity: Number(item.restockedQuantity || 0),
            }));

        if (itemsToReverse.length > 0) {
            // Since decrementInventory expects CartItem[], we need to build minimal objects
            // In a production system, you might want to fetch full product details
            const inventoryUpdates = itemsToReverse.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                barcode: '',
                name: '',
                categoryId: '',
                sellPrice: 0,
                discount: 0,
                purchasePrice: 0,
            }));

            await InventoryModel.decrementInventory(inventoryUpdates, auth);
        }
    }

    /**
     * Process restocking of returned items
     */
    static async restockReturnedItems(
        returnTransactionId: string,
        restockItems: { returnItemId: string; restockQuantity: number }[]
    ): Promise<void> {
        for (const item of restockItems) {
            const returnItem = await ReturnItemModel.findById(item.returnItemId);

            if (!returnItem) {
                throw new Error(`Return item ${item.returnItemId} not found`);
            }

            if (item.restockQuantity > Number(returnItem.returnedQuantity)) {
                throw new Error('Restock quantity cannot exceed returned quantity');
            }

            await ReturnItemModel.updateRestockStatus(
                item.returnItemId,
                'restocked',
                item.restockQuantity
            );
        }
    }

    /**
     * Get return statistics for a date range
     */
    static async getReturnStatistics(startDate: Date, endDate: Date): Promise<{
        totalReturns: number;
        totalRefundAmount: number;
        averageRefundAmount: number;
        returnsByReason: Record<string, number>;
    }> {
        const returns = await TransactionModel.findRefundsByDateRange(
            startDate.toISOString(),
            endDate.toISOString()
        );

        const totalRefundAmount = returns.reduce((sum, tx) => sum + Number(tx.refundedAmount || 0), 0);

        const returnsByReason: Record<string, number> = {};
        returns.forEach(tx => {
            const reason = tx.refundReason || 'Unknown';
            returnsByReason[reason] = (returnsByReason[reason] || 0) + 1;
        });

        return {
            totalReturns: returns.length,
            totalRefundAmount,
            averageRefundAmount: returns.length > 0 ? totalRefundAmount / returns.length : 0,
            returnsByReason,
        };
    }

    // Private helper methods

    private static async validateOriginalTransaction(transactionId: string): Promise<Transaction> {
        const transaction = await TransactionModel.findById(transactionId);

        if (!transaction) {
            throw new Error('Original transaction not found');
        }

        if (transaction.status !== 'completed') {
            throw new Error('Can only process returns for completed transactions');
        }

        if (transaction.isRefund) {
            throw new Error('Cannot process return for a refund transaction');
        }

        // Check if already fully refunded
        const isFullyRefunded = await TransactionModel.hasBeenFullyRefunded(transactionId);
        if (isFullyRefunded) {
            throw new Error('This transaction has already been fully refunded');
        }

        return transaction;
    }

    private static async validateReturnItems(
        returnItems: ReturnItemRequest[],
        originalOrderItems: any[]
    ): Promise<void> {
        if (!returnItems || returnItems.length === 0) {
            throw new Error('At least one item must be returned');
        }

        for (const returnItem of returnItems) {
            const originalItem = originalOrderItems.find(
                item => item.orderId === returnItem.orderItemId
            );

            if (!originalItem) {
                throw new Error(`Order item ${returnItem.orderItemId} not found in original transaction`);
            }

            if (returnItem.returnQuantity <= 0) {
                throw new Error('Return quantity must be greater than 0');
            }

            if (returnItem.returnQuantity > Number(originalItem.quantity)) {
                throw new Error(
                    `Return quantity (${returnItem.returnQuantity}) cannot exceed original quantity (${originalItem.quantity})`
                );
            }

            // Check if this item has already been returned
            const existingReturns = await ReturnItemModel.findByOriginalOrderId(returnItem.orderItemId);
            const totalReturnedQty = existingReturns.reduce(
                (sum, item) => sum + Number(item.returnedQuantity),
                0
            );

            if (totalReturnedQty + returnItem.returnQuantity > Number(originalItem.quantity)) {
                throw new Error(
                    `Total return quantity would exceed original quantity for item ${returnItem.orderItemId}`
                );
            }
        }
    }

    private static calculateRefundAmount(
        returnItems: ReturnItemRequest[],
        originalOrderItems: any[]
    ): { refundAmount: number; itemRefunds: Array<{ itemId: string; amount: number }> } {
        let refundAmount = 0;
        const itemRefunds: Array<{ itemId: string; amount: number }> = [];

        for (const returnItem of returnItems) {
            const originalItem = originalOrderItems.find(
                item => item.orderId === returnItem.orderItemId
            );

            if (originalItem) {
                const itemRefundAmount = Number(originalItem.sellPrice) * returnItem.returnQuantity;
                refundAmount += itemRefundAmount;
                itemRefunds.push({
                    itemId: returnItem.orderItemId,
                    amount: itemRefundAmount,
                });
            }
        }

        return { refundAmount, itemRefunds };
    }

    private static async createRefundTransaction(
        originalTransaction: Transaction,
        refundAmount: number,
        refundReason: string,
        auth: AuthenticatedUser,
        isFullRefund: boolean
    ): Promise<Transaction> {
        const refundTransactionId = uuidv4();
        const refundRefNumber = `REF-${originalTransaction.refNumber}-${Date.now()}`;

        const refundData: Partial<Transaction> = {
            transactionId: refundTransactionId,
            refNumber: refundRefNumber,
            originalTransactionId: originalTransaction.transactionId,
            isRefund: true,
            refundReason,
            refundedAmount: new Decimal(refundAmount) as any,
            refundedAt: new Date(),
            total: new Decimal(-refundAmount) as any, // Negative to indicate refund
            paid: new Decimal(-refundAmount) as any,
            subtotal: new Decimal(-refundAmount) as any,
            discount: new Decimal(0) as any,
            tax: new Decimal(0) as any,
            changeAmount: new Decimal(0) as any,
            customerId: originalTransaction.customerId,
            paymentMethodId: originalTransaction.paymentMethodId,
            paymentServiceProviderId: originalTransaction.paymentServiceProviderId,
            terminalId: originalTransaction.terminalId,
            userId: auth.userId,
            tenantId: auth.tenantId,
            branchId: auth.branchId,
            status: 'refunded',
            date: new Date(),
            synced: 0,
        };

        const refundTransaction = await TransactionModel.createRefundTransaction(refundData);

        // Update original transaction if fully refunded
        if (isFullRefund) {
            await TransactionModel.update(originalTransaction.transactionId, {
                status: 'refunded',
                updatedAt: new Date(),
            });
        }

        return refundTransaction;
    }

    private static async createReturnItems(
        returnTransactionId: string,
        returnItems: ReturnItemRequest[],
        originalOrderItems: any[]
    ): Promise<ReturnItem[]> {
        const returnItemsData: Partial<ReturnItem>[] = returnItems.map(item => {
            const originalItem = originalOrderItems.find(oi => oi.orderId === item.orderItemId);

            return {
                returnItemId: uuidv4(),
                returnTransactionId,
                originalOrderId: item.orderItemId,
                productId: item.productId,
                returnedQuantity: new Decimal(item.returnQuantity) as any,
                originalQuantity: new Decimal(originalItem?.quantity || 0) as any,
                returnPrice: new Decimal(originalItem?.sellPrice || 0) as any,
                returnReason: item.returnReason,
                condition: item.condition || 'good',
                notes: item.notes,
                restockStatus: 'pending',
                restockedQuantity: new Decimal(0) as any,
                synced: 0,
            };
        });

        await ReturnItemModel.createMany(returnItemsData);

        return ReturnItemModel.findByReturnTransactionId(returnTransactionId);
    }

    private static async updateInventoryForReturn(
        returnItems: ReturnItemRequest[],
        auth: AuthenticatedUser
    ): Promise<void> {
        const inventoryUpdates = returnItems.map(item => ({
            productId: item.productId,
            quantity: item.returnQuantity,
        }));

        // Increment inventory for returned items
        await InventoryModel.incrementInventory(inventoryUpdates, auth);
    }
}
