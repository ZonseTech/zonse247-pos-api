import { OrderItem } from 'order';
import { sealDBModel } from '../databases/local';
import { ORDERS_DB } from '../databases/local/tables';

export class OrderModel {
    static async findAll(): Promise<OrderItem[]> {
        return await sealDBModel.findAll(ORDERS_DB);
    }

    static async findById(orderId: string): Promise<OrderItem | null> {
        return await sealDBModel.findById(ORDERS_DB, orderId);
    }

    static async findByTransactionUuid(transactionUuid: string): Promise<Array<OrderItem>> {
        return await sealDBModel.find(ORDERS_DB, { transactionUuid });
    }

    static async findByTransactionRefNumber(refNumber: string): Promise<Array<OrderItem>> {
        return await sealDBModel.find(ORDERS_DB, { refNumber });
    }

    static async findByRefNumber(refNumber: string): Promise<OrderItem[]> {
        return await sealDBModel.find(ORDERS_DB, { refNumber });
    }

    static async findByProductId(productId: string): Promise<OrderItem[]> {
        return await sealDBModel.find(ORDERS_DB, { productId });
    }

    static async findByConditions(conditions: any): Promise<OrderItem[]> {
        return await sealDBModel.find(ORDERS_DB, conditions);
    }

    static async create(orderData: Partial<OrderItem>): Promise<OrderItem> {
        return await sealDBModel.insert(ORDERS_DB, orderData);
    }

    static async update(orderId: string, updateData: Partial<OrderItem>): Promise<number> {
        return await sealDBModel.update(ORDERS_DB, orderId, updateData);
    }

    static async delete(orderId: string): Promise<number> {
        return await sealDBModel.delete(ORDERS_DB, orderId);
    }

    static async count(conditions: any = {}): Promise<number> {
        return await sealDBModel.count(ORDERS_DB, conditions);
    }

    static async getUnsyncedRecords(): Promise<OrderItem[]> {
        return await sealDBModel.getUnsyncedRecords(ORDERS_DB);
    }

    static async markAsSynced(orderId: string): Promise<number> {
        return await sealDBModel.markAsSynced(ORDERS_DB, orderId);
    }
}