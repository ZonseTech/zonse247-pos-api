import { v4 as uuidv4 } from 'uuid';
import { InventoryModel } from '../models/inventory.model';
import { TransactionModel } from '../models/transaction.model';
import { OrderModel } from '../models/order.model';
import { OrderService } from './order.service';
import { CategoryModel } from '../models/category.model';
import { PaymentMethodModel } from '../models/payment-methods.model';
import { PaymentServiceProviderModel } from '../models/payment-service-provider.model';
import { DateRangeFilters, Transaction } from 'transactions';
import { AuthenticatedUser } from 'auth';

export class TransactionService {

    private static getTransactionInclude(_includeItems = false) {
        return {
            customer: true,
            user: true,
            paymentMethod: true,
            paymentServiceProvider: true,
            terminal: true,
            originalTransaction: true,
            refunds: true,
        };
    }

    static async getAllTransactions(filters: {
        includeItems?: boolean;
        search?: string;
        startDate?: Date;
        endDate?: Date;
        status?: string;
        page?: number;
        limit?: number;
        tenantId: string;
        branchId: string;
    }): Promise<{
        data: Transaction[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasMore: boolean;
        };
    }> {
        try {
            const {
                includeItems = true,
                search,
                startDate,
                endDate,
                status,
                page = 1,
                limit = 50,
                tenantId,
                branchId
            } = filters;

            const where: any = {
                tenantId,
                branchId,
            };

            if (status) {
                where.status = status;
            }

            // Handle date filtering - adjust endDate to include the entire day
            if (startDate && endDate) {
                // Set endDate to end of day (23:59:59.999)
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);

                where.date = {
                    gte: startDate,
                    lte: endOfDay,
                };

                console.log('Date filter applied:', {
                    startDate: startDate.toISOString(),
                    endDate: endOfDay.toISOString(),
                });
            } else if (startDate) {
                where.date = { gte: startDate };
                console.log('Start date filter:', startDate.toISOString());
            } else if (endDate) {
                // Set endDate to end of day (23:59:59.999)
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);
                where.date = { lte: endOfDay };
                console.log('End date filter:', endOfDay.toISOString());
            }

            console.log('Transaction query where:', JSON.stringify(where, null, 2));

            if (search) {
                where.OR = [
                    { refNumber: { contains: search, mode: 'insensitive' } },
                    { transactionId: { contains: search, mode: 'insensitive' } },
                    { phoneNumber: { contains: search, mode: 'insensitive' } },
                    { externalTransactionRef: { contains: search, mode: 'insensitive' } },
                    {
                        customer: {
                            name: { contains: search, mode: 'insensitive' }
                        }
                    },
                    {
                        user: {
                            OR: [
                                { fullname: { contains: search, mode: 'insensitive' } },
                                { username: { contains: search, mode: 'insensitive' } },
                            ]
                        }
                    },
                ];
            }

            const total = await TransactionModel.count(where);

            const skip = (page - 1) * limit;
            const totalPages = Math.ceil(total / limit);

            const transactions = await TransactionModel.findAllPaginated(
                where,
                this.getTransactionInclude(includeItems),
                [{ date: 'desc' }, { createdAt: 'desc' }],
                skip,
                limit
            );

            let processedTransactions: Transaction[];
            if (includeItems) {
                processedTransactions = await Promise.all(
                    transactions.map(transaction => this.addItemsToTransaction(transaction))
                );
            } else {
                processedTransactions = await Promise.all(
                    transactions.map(transaction => this.calculateRefundTotals(transaction))
                );
            }

            return {
                data: processedTransactions,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasMore: page < totalPages,
                },
            };
        } catch (error: any) {
            throw new Error(`Failed to retrieve transactions: ${error.message}`);
        }
    }

    static async getTransactionsByDateRange(filters: DateRangeFilters): Promise<Transaction[]> {
        try {
            const conditions = this.buildDateRangeConditions(filters);
            const transactions = await TransactionModel.findByConditions(
                conditions,
                this.getTransactionInclude(filters.includeItems)
            );

            // If items are requested, fetch them separately
            if (filters.includeItems) {
                return await Promise.all(
                    transactions.map(transaction => this.addItemsToTransaction(transaction))
                );
            }

            return await Promise.all(
                transactions.map(transaction => this.calculateRefundTotals(transaction))
            );
        } catch (error: any) {
            throw new Error(`Failed to retrieve transactions by date range: ${error.message}`);
        }
    }

    static async getTransactionById(id: string, includeItems = true, tenantId: string, branchId: string): Promise<Transaction> {
        if (!id) {
            throw new Error('Transaction ID is required');
        }

        const transaction = await TransactionModel.findById(
            id,
            tenantId,
            branchId,
            this.getTransactionInclude(includeItems)
        );

        if (!transaction) {
            throw new Error('Transaction not found');
        }

        let enrichedTransaction = await this.calculateRefundTotals(transaction);

        if (includeItems) {
            enrichedTransaction = await this.addItemsToTransaction(enrichedTransaction);
        }

        return enrichedTransaction;
    }

    static async createTransaction(data: any, auth: AuthenticatedUser): Promise<Transaction> {
        const validationError = this.validateTransactionData(data);
        if (validationError) {
            throw new Error(validationError);
        }

        // Validate payment method exists if provided
        if (data.paymentMethodId) {
            const paymentMethod = await PaymentMethodModel.findById(data.paymentMethodId);
            if (!paymentMethod) {
                throw new Error(`Payment method with ID '${data.paymentMethodId}' not found. Please create the payment method first or use a valid payment method ID.`);
            }
        }

        // Validate payment service provider exists if provided
        if (data.paymentServiceProviderId) {
            const provider = await PaymentServiceProviderModel.findById(data.paymentServiceProviderId);
            if (!provider) {
                throw new Error(`Payment service provider with ID '${data.paymentServiceProviderId}' not found. Please create the provider first or use a valid provider ID.`);
            }
        }

        const transactionUuid = uuidv4();
        const transactionData = this.buildTransactionData({ ...data, ...auth }, transactionUuid);

        const transaction = await TransactionModel.create(transactionData);

        if (transactionData.paid >= transactionData.total) {
            await OrderService.createOrderItems(transactionUuid, transactionData.refNumber, data.items);
            await InventoryModel.decrementInventory(data.items, auth);
        }

        // Fetch the transaction with relations
        const enrichedTransaction = await TransactionModel.findById(
            transaction.transactionId,
            undefined,
            undefined,
            this.getTransactionInclude(true)
        );

        if (!enrichedTransaction) {
            throw new Error('Failed to retrieve created transaction');
        }

        return await this.addItemsToTransaction(enrichedTransaction);
    }

    static async updateTransaction(id: string, data: Partial<Transaction>, tenantId: string, branchId: string): Promise<Transaction> {
        if (!id) {
            throw new Error('Transaction ID is required');
        }

        const existingTransaction = await TransactionModel.findById(id, tenantId, branchId);
        if (!existingTransaction) {
            throw new Error('Transaction not found');
        }

        const numUpdated = await TransactionModel.update(id, data);
        if (numUpdated === 0) {
            throw new Error('Failed to update transaction');
        }

        const updatedTransaction = await TransactionModel.findById(
            id,
            tenantId,
            branchId,
            this.getTransactionInclude(true)
        );

        if (!updatedTransaction) {
            throw new Error('Failed to retrieve updated transaction');
        }

        return await this.addItemsToTransaction(updatedTransaction);
    }

    static async deleteTransaction(id: string, tenantId: string, branchId: string): Promise<{ status: boolean }> {
        if (!id) {
            throw new Error('Transaction ID is required');
        }

        const existingTransaction = await TransactionModel.findById(id, tenantId, branchId);
        if (!existingTransaction) {
            throw new Error('Transaction not found');
        }

        const numDeleted = await TransactionModel.delete(id);
        if (numDeleted === 0) {
            throw new Error('Failed to delete transaction');
        }

        return { status: true };
    }

    static async getTransactionSummary(id: string, tenantId: string, branchId: string): Promise<Transaction & { analytics: any }> {
        const transaction = await this.getTransactionById(id, true, tenantId, branchId);

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

    private static async addItemsToTransaction(transaction: Transaction): Promise<Transaction> {
        if (!transaction.transactionId) {
            return transaction;
        }

        try {
            const orderItems = await OrderModel.findByTransactionRefNumber(transaction.refNumber);
            const itemsWithProducts = await Promise.all(
                orderItems.map(async (item) => {
                    try {
                        const product = await InventoryModel.findByUuid(item.productId);
                        product.categoryDetails = await CategoryModel.findById(product.categoryId);

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

            return {
                ...transaction,
                items: itemsWithProducts as any,
            };
        } catch (error) {
            console.error(`Error fetching items for transaction ${transaction.transactionId}:`, error);
            return {
                ...transaction,
                items: [],
            };
        }
    }

    private static async calculateRefundTotals(transaction: Transaction): Promise<Transaction> {
        if (!transaction.isRefund && transaction.refunds && Array.isArray(transaction.refunds)) {
            const totalRefunded = transaction.refunds.reduce(
                (sum, refund: any) => sum + (Number(refund.refundedAmount) || 0),
                0
            );
            return {
                ...transaction,
                totalRefunded,
            };
        }

        return {
            ...transaction,
            totalRefunded: 0,
        };
    }

    private static buildDateRangeConditions(filters: DateRangeFilters): any {
        const baseQuery: Array<Record<string, any>> = [
            { date: { $gte: filters.startDate.toJSON(), $lte: filters.endDate.toJSON() } },
            { status: filters.status },
        ];

        if (filters.tenantId) {
            baseQuery.push({ tenantId: filters.tenantId });
        }
        if (filters.branchId) {
            baseQuery.push({ branchId: filters.branchId });
        }
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
            externalTransactionRef: data.transactionId || null, // External payment reference (e.g., from Airtel Money, bank transfer)
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