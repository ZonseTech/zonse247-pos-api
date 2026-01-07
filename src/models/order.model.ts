import { OrderItem } from 'order';
import prisma from '../databases/prisma/client';

export class OrderModel {
    static async findAll(): Promise<OrderItem[]> {
        return await prisma.order.findMany() as unknown as OrderItem[];
    }

    static async findById(orderId: string): Promise<OrderItem | null> {
        return await prisma.order.findUnique({
            where: { orderId },
        }) as unknown as OrderItem | null;
    }

    static async findByTransactionUuid(transactionId: string): Promise<Array<OrderItem>> {
        return await prisma.order.findMany({
            where: { transactionId },
        }) as unknown as OrderItem[];
    }

    static async findByTransactionRefNumber(refNumber: string): Promise<Array<OrderItem>> {
        return await prisma.order.findMany({
            where: { refNumber },
        }) as unknown as OrderItem[];
    }

    static async findByRefNumber(refNumber: string): Promise<OrderItem[]> {
        return await prisma.order.findMany({
            where: { refNumber },
        }) as unknown as OrderItem[];
    }

    static async findByProductId(productId: string): Promise<OrderItem[]> {
        return await prisma.order.findMany({
            where: { productId },
        }) as unknown as OrderItem[];
    }

    static async findByConditions(conditions: any): Promise<OrderItem[]> {
        return await prisma.order.findMany({
            where: conditions,
        }) as unknown as OrderItem[];
    }

    static async create(orderData: Partial<OrderItem>): Promise<OrderItem> {
        return await prisma.order.create({
            data: orderData as any,
        }) as unknown as OrderItem;
    }

    static async update(orderId: string, updateData: Partial<OrderItem>): Promise<number> {
        const result = await prisma.order.update({
            where: { orderId },
            data: updateData as any,
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
        }) as unknown as OrderItem[];
    }

    static async markAsSynced(orderId: string): Promise<number> {
        const result = await prisma.order.update({
            where: { orderId },
            data: { synced: 1 },
        });
        return result ? 1 : 0;
    }
}