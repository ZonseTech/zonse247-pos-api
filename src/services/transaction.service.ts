import { v4 as uuidv4 } from 'uuid';
import { InventoryModel } from '../models/inventory.model';
import { TransactionModel } from '../models/transaction.model';
import { UserModel } from '../models/user.model';
import { PaymentMethodModel } from '../models/payment-methods.model';
import { CustomerModel } from '../models/customer.model';
import { OrderModel } from '../models/order.model';
import { OrderService } from './order.service';
import { PaymentServiceProviderModel } from '../models/payment-service-provider.model';
import { TerminalModel } from '../models/terminal.model';
import { CategoryModel } from '../models/category.model';
import { DateRangeFilters, Transaction } from 'transactions';
import { AuthenticatedUser } from 'auth';

export class TransactionService {

    static async getAllTransactions(includeItems = true): Promise<Transaction[]> {
        try {
            const transactions = await TransactionModel.findAll();
            return await Promise.all(
                transactions.map(transaction =>
                    this.enrichTransactionWithRelatedData(transaction, includeItems)
                )
            );
        } catch (error: any) {
            throw new Error(`Failed to retrieve transactions: ${error.message}`);
        }
    }

    static async getTransactionsByDateRange(filters: DateRangeFilters): Promise<Transaction[]> {
        try {
            const conditions = this.buildDateRangeConditions(filters);
            const transactions = await TransactionModel.findByConditions(conditions);

            return await Promise.all(
                transactions.map(transaction =>
                    this.enrichTransactionWithRelatedData(transaction, filters.includeItems)
                )
            );
        } catch (error: any) {
            throw new Error(`Failed to retrieve transactions by date range: ${error.message}`);
        }
    }

    static async getTransactionById(id: string, includeItems = true): Promise<Transaction> {
        if (!id) {
            throw new Error('Transaction ID is required');
        }

        const transaction = await TransactionModel.findById(id);
        if (!transaction) {
            throw new Error('Transaction not found');
        }

        return await this.enrichTransactionWithRelatedData(transaction, includeItems);
    }

    static async createTransaction(data: any, auth: AuthenticatedUser): Promise<Transaction> {
        const validationError = this.validateTransactionData(data);
        if (validationError) {
            throw new Error(validationError);
        }

        const transactionUuid = uuidv4();
        const transactionData = this.buildTransactionData({ ...data, ...auth }, transactionUuid);

        const transaction = await TransactionModel.create(transactionData);

        if (transactionData.paid >= transactionData.total) {
            await OrderService.createOrderItems(transactionUuid, transactionData.refNumber, data.items);
            await InventoryModel.decrementInventory(data.items, auth);
        }

        return await this.enrichTransactionWithRelatedData(transaction, true);
    }

    static async updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction> {
        if (!id) {
            throw new Error('Transaction ID is required');
        }

        const existingTransaction = await TransactionModel.findById(id);
        if (!existingTransaction) {
            throw new Error('Transaction not found');
        }

        const numUpdated = await TransactionModel.update(id, data);
        if (numUpdated === 0) {
            throw new Error('Failed to update transaction');
        }

        const updatedTransaction = await TransactionModel.findById(id);
        if (!updatedTransaction) {
            throw new Error('Failed to retrieve updated transaction');
        }

        return await this.enrichTransactionWithRelatedData(updatedTransaction, true);
    }

    static async deleteTransaction(id: string): Promise<{ status: boolean }> {
        if (!id) {
            throw new Error('Transaction ID is required');
        }

        const existingTransaction = await TransactionModel.findById(id);
        if (!existingTransaction) {
            throw new Error('Transaction not found');
        }

        const numDeleted = await TransactionModel.delete(id);
        if (numDeleted === 0) {
            throw new Error('Failed to delete transaction');
        }

        return { status: true };
    }

    static async getTransactionSummary(id: string): Promise<Transaction & { analytics: any }> {
        const transaction = await this.getTransactionById(id, true);

        const analytics = {
            totalItems: transaction.items?.reduce(
                (sum: number, item: any) => sum + item.quantity,
                0
            ) || 0,
            totalProfit: transaction.items?.reduce(
                (sum: number, item: any) =>
                    sum + (item.sellPrice - item.purchasePrice) * item.quantity,
                0
            ) || 0,
            averageItemPrice: transaction.items?.length > 0
                ? transaction.items.reduce(
                    (sum: number, item: any) => sum + item.sellPrice,
                    0
                ) / transaction.items.length
                : 0,
        };

        return {
            ...transaction,
            analytics: {
                ...analytics,
                totalProfit: Math.round(analytics.totalProfit * 100) / 100,
                averageItemPrice: Math.round(analytics.averageItemPrice * 100) / 100,
            },
        };
    }

    private static async enrichTransactionWithRelatedData(
        transaction: Transaction,
        includeItems = true
    ): Promise<Transaction> {
        const promises = [];

        if (transaction.customerId) {
            promises.push(
                CustomerModel.findById(transaction.customerId)
                    .then(customer => ({ customer }))
                    .catch(() => ({ customer: null }))
            );
        } else {
            promises.push(Promise.resolve({ customer: null }));
        }

        if (transaction.terminalId) {
            promises.push(
                TerminalModel.findById(transaction.terminalId)
                    .then(terminal => ({ terminal }))
                    .catch(() => ({ terminal: null }))
            );
        } else {
            promises.push(Promise.resolve({ terminal: null }));
        }

        if (transaction.paymentMethodId) {
            promises.push(
                PaymentMethodModel.findById(transaction.paymentMethodId)
                    .then(paymentMethod => ({ paymentMethod }))
                    .catch(() => ({ paymentMethod: null }))
            );
        } else {
            promises.push(Promise.resolve({ paymentMethod: null }));
        }

        if (transaction.paymentServiceProviderId) {
            promises.push(
                PaymentServiceProviderModel.findById(transaction.paymentServiceProviderId)
                    .then(paymentServiceProvider => ({ paymentServiceProvider }))
                    .catch(() => ({ paymentServiceProvider: null }))
            );
        } else {
            promises.push(Promise.resolve({ paymentServiceProvider: null }));
        }

        if (transaction.userId) {
            promises.push(
                UserModel.findById(transaction.userId)
                    .then(user => ({ user }))
                    .catch(() => ({ user: null }))
            );
        } else {
            promises.push(Promise.resolve({ user: null }));
        }


        if (includeItems && transaction.transactionId) {
            promises.push(
                OrderModel.findByTransactionRefNumber(transaction.refNumber)
                    .then(async (orderItems) => {
                        const itemsWithProducts = await Promise.all(
                            orderItems.map(async (item) => {
                                try {
                                    const product = await InventoryModel.findByUuid(item.productId);

                                    product.categoryDetails = await CategoryModel.findById(product.categoryId)

                                    return {
                                        ...item,
                                        productDetails: product,
                                    };
                                } catch (error) {
                                    return {
                                        ...item,
                                        productDetails: null,
                                    };
                                }
                            })
                        );

                        return { items: itemsWithProducts };
                    })
                    .catch(() => ({ items: [] }))
            );
        } else {
            promises.push(Promise.resolve({ items: [] }));
        }

        const [customerResult, _terminalResult, paymentMethodResult, paymentServiceProviderResult, userResult, itemsResult] =
            await Promise.all(promises);

        return {
            ...transaction,
            user: userResult.user,
            customer: customerResult.customer,
            paymentMethod: paymentMethodResult.paymentMethod,
            paymentServiceProvider: paymentServiceProviderResult.paymentServiceProvider,
            items: includeItems ? itemsResult.items : [],
        };
    }

    private static buildDateRangeConditions(filters: DateRangeFilters): any {
        const baseQuery: Array<Record<string, any>> = [
            { date: { $gte: filters.startDate.toJSON(), $lte: filters.endDate.toJSON() } },
            { status: filters.status },
        ];

        if (filters.user && filters.user !== 0) {
            baseQuery.push({ userId: filters.user });
        }
        if (filters.till && filters.till !== 0) {
            baseQuery.push({ terminalId: filters.till });
        }

        return { $and: baseQuery };
    }

    private static buildTransactionData(data: any, transactionId: string): Transaction {
        return {
            transactionId,
            refNumber: data.refNumber || 'TRX-' + Date.now(),
            discount: data.discount || 0,
            customerId: data.customerId || null,
            subtotal: data.subtotal || 0,
            tax: data.tax || 0,
            date: data.date || new Date().toISOString(),
            paymentMethodId: data.paymentMethodId || null,
            phoneNumber: data.phoneNumber || '',
            paymentServiceProviderId: data.paymentServiceProviderId || null,
            total: data.total || 0,
            paid: data.paid || 0,
            changeAmount: data.changeAmount || 0,
            terminalId: data.terminalId || null,
            userId: data.userId || null,
            tenantId: data.tenantId || null,
            branchId: data.branchId || null,
            synced: 0,
            status: data.status || 'completed',
        };
    }

    private static validateTransactionData(data: any): string | null {
        if (data.total === undefined || data.total === null || data.total < 0) {
            return 'Total amount is required and cannot be negative';
        }

        if (data.paid < 0) {
            return 'Paid amount cannot be negative';
        }

        if (data.discount && data.discount < 0) {
            return 'Discount cannot be negative';
        }

        if (data.tax && data.tax < 0) {
            return 'Tax cannot be negative';
        }

        return null;
    }
}