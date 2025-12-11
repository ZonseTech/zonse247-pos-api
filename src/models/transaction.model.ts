import { Transaction } from 'transactions';
import prisma from '../databases/prisma/client';
import { TransactionOrderByWithRelationInput } from '../databases/prisma/generated/prisma/models';

export class TransactionModel {

    static async findAll(conditions: any = {}): Promise<Transaction[]> {
        return prisma.transaction.findMany({
            where: conditions,
        });
    }

    static async findById(id: string): Promise<Transaction | null> {
        return prisma.transaction.findUnique({
            where: { transactionId: id },
        });
    }

    static async findByConditions(conditions: any): Promise<Transaction[]> {
        return prisma.transaction.findMany({
            where: conditions,
        });
    }

    static async findByCustomerUuid(customerId: string): Promise<Transaction[]> {
        return prisma.transaction.findMany({
            where: { customerId },
        });
    }

    static async findByUserUuid(userId: string): Promise<Transaction[]> {
        return prisma.transaction.findMany({
            where: { userId },
        });
    }

    static async findByTillUuid(terminalId: string): Promise<Transaction[]> {
        return prisma.transaction.findMany({
            where: { terminalId },
        });
    }

    static async findByStatus(status: string): Promise<Transaction[]> {
        return prisma.transaction.findMany({
            where: { status },
        });
    }

    static async findByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
        return prisma.transaction.findMany({
            where: {
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            },
        });
    }

    static async findByRefNumber(refNumber: string): Promise<Transaction | null> {
        return prisma.transaction.findFirst({
            where: { refNumber },
        });
    }

    static async create(transactionData: Partial<Transaction>): Promise<Transaction> {
        return prisma.transaction.create({
            data: transactionData as any,
        });
    }

    static async update(id: string, data: Partial<Transaction>): Promise<number> {
        const result = await prisma.transaction.update({
            where: { transactionId: id },
            data,
        });
        return result ? 1 : 0;
    }

    static async delete(id: string): Promise<number> {
        const result = await prisma.transaction.delete({
            where: { transactionId: id },
        });
        return result ? 1 : 0;
    }

    static async count(conditions: any = {}): Promise<number> {
        return prisma.transaction.count({
            where: conditions,
        });
    }

    static async findCompletedTransactions() {
        return prisma.transaction.findMany({
            where: { status: 'completed' },
        });
    }

    static async findPendingTransactions(): Promise<Transaction[]> {
        return prisma.transaction.findMany({
            where: { status: 'pending' },
        });
    }

    static async findCancelledTransactions(): Promise<Transaction[]> {
        return prisma.transaction.findMany({
            where: { status: 'cancelled' },
        });
    }

    static async findTransactionsByPaymentMethod(paymentMethodId: string): Promise<Transaction[]> {
        return prisma.transaction.findMany({
            where: { paymentMethodId },
        });
    }

    static async findTransactionsByPhoneNumber(phoneNumber: string): Promise<Transaction[]> {
        return prisma.transaction.findMany({
            where: { phoneNumber },
        });
    }

    static async findTransactionsWithPagination(
        conditions: any = {},
        page = 1,
        limit = 10
    ): Promise<{ transactions: Transaction[], total: number, page: number, limit: number }> {
        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where: conditions,
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.transaction.count({
                where: conditions,
            }),
        ]);

        return {
            transactions,
            total,
            page,
            limit,
        };
    }

    static async findTransactionsWithSorting(
        conditions: any = {},
        sortBy: keyof Transaction = 'date',
        sortOrder: 'asc' | 'desc' = 'desc'
    ): Promise<Transaction[]> {
        const orderBy: TransactionOrderByWithRelationInput = {
            [sortBy]: sortOrder,
        };

        return prisma.transaction.findMany({
            where: conditions,
            orderBy,
        });
    }

    static async getTransactionTotals(conditions: any = {}): Promise<{
        totalAmount: number;
        totalTax: number;
        totalDiscount: number;
        totalProfit: number;
        count: number;
    }> {
        const transactions = await prisma.transaction.findMany({
            where: conditions,
        });

        return transactions.reduce((totals, transaction) => ({
            totalAmount: totals.totalAmount + (Number(transaction.total) || 0),
            totalTax: totals.totalTax + (Number(transaction.tax) || 0),
            totalDiscount: totals.totalDiscount + (Number(transaction.discount) || 0),
            totalProfit: totals.totalProfit + ((Number(transaction.total) || 0) - (Number(transaction.tax) || 0)),
            count: totals.count + 1,
        }), {
            totalAmount: 0,
            totalTax: 0,
            totalDiscount: 0,
            totalProfit: 0,
            count: 0,
        });
    }

    static async getDailySummary(date: string): Promise<{
        totalSales: number;
        totalTransactions: number;
        averageTransactionValue: number;
        totalDiscount: number;
        totalTax: number;
    }> {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        const transactions = await this.findByDateRange(
            startDate.toISOString(),
            endDate.toISOString()
        );

        const completedTransactions = transactions.filter(t => t.status === 'completed');
        const totalSales = completedTransactions.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
        const totalDiscount = completedTransactions.reduce((sum, t) => sum + (Number(t.discount) || 0), 0);
        const totalTax = completedTransactions.reduce((sum, t) => sum + (Number(t.tax) || 0), 0);

        return {
            totalSales,
            totalTransactions: completedTransactions.length,
            averageTransactionValue: completedTransactions.length > 0 ? totalSales / completedTransactions.length : 0,
            totalDiscount,
            totalTax,
        };
    }

    static async getUnsyncedTransactions(): Promise<Transaction[]> {
        return prisma.transaction.findMany({
            where: { synced: 0 },
        });
    }

    static async markAsSynced(id: string): Promise<number> {
        const result = await prisma.transaction.update({
            where: { transactionId: id },
            data: { synced: 1 },
        });
        return result ? 1 : 0;
    }

    static async clearAllTransactions(): Promise<number> {
        const result = await prisma.transaction.deleteMany({});
        return result.count;
    }

    static validateTransactionData(data: Partial<Transaction>): string | null {
        if (data.total && Number(data.total) < 0) {
            return 'Total amount cannot be negative';
        }

        if (data.paid && Number(data.paid) < 0) {
            return 'Paid amount cannot be negative';
        }

        if (data.discount && Number(data.discount) < 0) {
            return 'Discount cannot be negative';
        }

        if (data.tax && Number(data.tax) < 0) {
            return 'Tax cannot be negative';
        }

        if (data.changeAmount && Number(data.changeAmount) < 0) {
            return 'Change amount cannot be negative';
        }

        if (data.status && !['pending', 'completed', 'cancelled', 'refunded'].includes(data.status)) {
            return 'Invalid transaction status';
        }

        if (data.phoneNumber && !/^\+?[\d\s\-()]+$/.test(data.phoneNumber)) {
            return 'Invalid phone number format';
        }

        return null;
    }

    static buildTransactionData(data: any): Partial<Transaction> {
        const {
            createdAt,
            updatedAt: _,
            customer,
            items,
            user,
            ...transactionData
        } = data;

        console.log('====================================');
        console.log(createdAt, customer, items, user);
        console.log('====================================');

        return transactionData;
    }
}