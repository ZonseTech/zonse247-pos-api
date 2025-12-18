import { OrderItem } from 'order';
import prisma from '../databases/prisma/client';

export class OrderModel {
    static async findAll(): Promise<OrderItem[]> {
        return await prisma.order.findMany();
    }

    static async findById(orderId: string): Promise<OrderItem | null> {
        return await prisma.order.findUnique({
            where: { orderId },
        });
    }

    static async findByTransactionUuid(transactionId: string): Promise<Array<OrderItem>> {
        return await prisma.order.findMany({
            where: { transactionId },
        });
    }

    static async findByTransactionRefNumber(refNumber: string): Promise<Array<OrderItem>> {
        return await prisma.order.findMany({
            where: { refNumber },
        });
    }

    static async findByRefNumber(refNumber: string): Promise<OrderItem[]> {
        return await prisma.order.findMany({
            where: { refNumber },
        });
    }

    static async findByProductId(productId: string): Promise<OrderItem[]> {
        return await prisma.order.findMany({
            where: { productId },
        });
    }

    static async findByConditions(conditions: any): Promise<OrderItem[]> {
        return await prisma.order.findMany({
            where: conditions,
        });
    }

    static async create(orderData: Partial<OrderItem>): Promise<OrderItem> {
        return await prisma.order.create({
            data: orderData as any,
        });
    }

    static async update(orderId: string, updateData: Partial<OrderItem>): Promise<number> {
        const result = await prisma.order.update({
            where: { orderId },
            data: updateData,
        });
        return result ? 1 : 0;
    }

    static async delete(orderId: string): Promise<number> {
        const result = await prisma.order.delete({
            where: { orderId },
        });
        return result ? 1 : 0;
    }

    static async count(conditions: any = {}): Promise<number> {
        return await prisma.order.count({
            where: conditions,
        });
    }

    static async getUnsyncedRecords(): Promise<OrderItem[]> {
        return await prisma.order.findMany({
            where: { synced: 0 },
        });
    }

    static async markAsSynced(orderId: string): Promise<number> {
        const result = await prisma.order.update({
            where: { orderId },
            data: { synced: 1 },
        });
        return result ? 1 : 0;
    }
}