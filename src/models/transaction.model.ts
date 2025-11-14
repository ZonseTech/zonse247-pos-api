import { sealDBModel } from '../databases/local';
import { TABLE_NAMES } from '../databases/local/tables';

export class TransactionModel {

    static async findAll(conditions: any = {}): Promise<Transaction[]> {
        return sealDBModel.find(TABLE_NAMES.TRANSACTIONS, conditions);
    }

    static async findById(id: string): Promise<Transaction | null> {
        return sealDBModel.findById(TABLE_NAMES.TRANSACTIONS, id);
    }

    static async findByConditions(conditions: any): Promise<Transaction[]> {
        return sealDBModel.find(TABLE_NAMES.TRANSACTIONS, conditions);
    }

    static async findByCustomerUuid(customerUuid: string): Promise<Transaction[]> {
        return sealDBModel.find(TABLE_NAMES.TRANSACTIONS, { customerUuid });
    }

    static async findByUserUuid(userUuid: string): Promise<Transaction[]> {
        return sealDBModel.find(TABLE_NAMES.TRANSACTIONS, { userUuid });
    }

    static async findByTillUuid(tillUuid: string): Promise<Transaction[]> {
        return sealDBModel.find(TABLE_NAMES.TRANSACTIONS, { tillUuid });
    }

    static async findByStatus(status: string): Promise<Transaction[]> {
        return sealDBModel.find(TABLE_NAMES.TRANSACTIONS, { status });
    }

    static async findByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
        return sealDBModel.find(TABLE_NAMES.TRANSACTIONS, {
            date: {
                $gte: startDate,
                $lte: endDate
            }
        });
    }

    static async findByRefNumber(refNumber: string): Promise<Transaction | null> {
        const transactions = await sealDBModel.find(TABLE_NAMES.TRANSACTIONS, { refNumber });
        return transactions.length > 0 ? transactions[0] : null;
    }

    static async create(transactionData: Transaction): Promise<Transaction> {
        return sealDBModel.insert(TABLE_NAMES.TRANSACTIONS, transactionData);
    }

    static async update(id: string, data: Partial<Transaction>): Promise<number> {
        return sealDBModel.update(TABLE_NAMES.TRANSACTIONS, id, data);
    }

    static async delete(id: string): Promise<number> {
        return sealDBModel.delete(TABLE_NAMES.TRANSACTIONS, id);
    }

    static async count(conditions: any = {}): Promise<number> {
        return sealDBModel.count(TABLE_NAMES.TRANSACTIONS, conditions);
    }

    static async findCompletedTransactions(): Promise<Transaction[]> {
        return sealDBModel.find(TABLE_NAMES.TRANSACTIONS, { status: 'completed' });
    }

    static async findPendingTransactions(): Promise<Transaction[]> {
        return sealDBModel.find(TABLE_NAMES.TRANSACTIONS, { status: 'pending' });
    }

    static async findCancelledTransactions(): Promise<Transaction[]> {
        return sealDBModel.find(TABLE_NAMES.TRANSACTIONS, { status: 'cancelled' });
    }

    static async findTransactionsByPaymentMethod(paymentMethodUuid: string): Promise<Transaction[]> {
        return sealDBModel.find(TABLE_NAMES.TRANSACTIONS, { paymentMethodUuid });
    }

    static async findTransactionsByPhoneNumber(phoneNumber: string): Promise<Transaction[]> {
        return sealDBModel.find(TABLE_NAMES.TRANSACTIONS, { phoneNumber });
    }

    static async findTransactionsWithPagination(
        conditions: any = {},
        page = 1,
        limit = 10
    ): Promise<{ transactions: Transaction[], total: number, page: number, limit: number }> {
        const allTransactions = await sealDBModel.find(TABLE_NAMES.TRANSACTIONS, conditions);
        const total = allTransactions.length;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const transactions = allTransactions.slice(startIndex, endIndex);

        return {
            transactions,
            total,
            page,
            limit
        };
    }

    static async findTransactionsWithSorting(
        conditions: any = {},
        sortBy: keyof Transaction = 'date',
        sortOrder: 'asc' | 'desc' = 'desc'
    ): Promise<Transaction[]> {
        const transactions = await sealDBModel.find(TABLE_NAMES.TRANSACTIONS, conditions);

        return transactions.sort((a: Transaction, b: Transaction) => {
            const aValue = a[sortBy];
            const bValue = b[sortBy];

            if (aValue === undefined && bValue === undefined) return 0;
            if (aValue === undefined) return sortOrder === 'asc' ? 1 : -1;
            if (bValue === undefined) return sortOrder === 'asc' ? -1 : 1;

            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }

    static async getTransactionTotals(conditions: any = {}): Promise<{
        totalAmount: number;
        totalTax: number;
        totalDiscount: number;
        totalProfit: number;
        count: number;
    }> {
        const transactions = await sealDBModel.find(TABLE_NAMES.TRANSACTIONS, conditions);

        return transactions.reduce((totals, transaction) => ({
            totalAmount: totals.totalAmount + (transaction.total || 0),
            totalTax: totals.totalTax + (transaction.tax || 0),
            totalDiscount: totals.totalDiscount + (transaction.discount || 0),
            totalProfit: totals.totalProfit + ((transaction.total || 0) - (transaction.tax || 0)),
            count: totals.count + 1
        }), {
            totalAmount: 0,
            totalTax: 0,
            totalDiscount: 0,
            totalProfit: 0,
            count: 0
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
        const totalSales = completedTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
        const totalDiscount = completedTransactions.reduce((sum, t) => sum + (t.discount || 0), 0);
        const totalTax = completedTransactions.reduce((sum, t) => sum + (t.tax || 0), 0);

        return {
            totalSales,
            totalTransactions: completedTransactions.length,
            averageTransactionValue: completedTransactions.length > 0 ? totalSales / completedTransactions.length : 0,
            totalDiscount,
            totalTax
        };
    }

    static async getUnsyncedTransactions(): Promise<Transaction[]> {
        return sealDBModel.getUnsyncedRecords(TABLE_NAMES.TRANSACTIONS);
    }

    static async markAsSynced(id: string): Promise<number> {
        return sealDBModel.markAsSynced(TABLE_NAMES.TRANSACTIONS, id);
    }

    static async clearAllTransactions(): Promise<number> {
        return sealDBModel.clearTable(TABLE_NAMES.TRANSACTIONS);
    }

    static validateTransactionData(data: Partial<Transaction>): string | null {
        if (data.total && data.total < 0) {
            return 'Total amount cannot be negative';
        }

        if (data.paid && data.paid < 0) {
            return 'Paid amount cannot be negative';
        }

        if (data.discount && data.discount < 0) {
            return 'Discount cannot be negative';
        }

        if (data.tax && data.tax < 0) {
            return 'Tax cannot be negative';
        }

        if (data.changeAmount && data.changeAmount < 0) {
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
        console.log(createdAt,
            customer,
            items,
            user,);
        console.log('====================================');

        return transactionData;
    }
}