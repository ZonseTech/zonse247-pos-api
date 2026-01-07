import prisma from '../databases/prisma/client';
import { Decimal } from '../databases/prisma/generated/prisma/internal/prismaNamespace';

export interface ReturnItem {
    returnItemId: string;
    returnTransactionId: string;
    originalOrderId: string;
    productId: string;
    returnedQuantity: Decimal;
    originalQuantity: Decimal;
    returnPrice: Decimal;
    returnReason?: string;
    restockStatus?: string;
    restockedQuantity?: Decimal;
    restockedAt?: Date;
    condition?: string;
    notes?: string;
    synced?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export class ReturnItemModel {

    static async findAll(conditions: any = {}): Promise<ReturnItem[]> {
        return prisma.returnItem.findMany({
            where: conditions,
        });
    }

    static async findById(id: string): Promise<ReturnItem | null> {
        return prisma.returnItem.findUnique({
            where: { returnItemId: id },
        });
    }

    static async findByReturnTransactionId(returnTransactionId: string): Promise<ReturnItem[]> {
        return prisma.returnItem.findMany({
            where: { returnTransactionId },
        });
    }

    static async findByOriginalOrderId(originalOrderId: string): Promise<ReturnItem[]> {
        return prisma.returnItem.findMany({
            where: { originalOrderId },
        });
    }

    static async findByProductId(productId: string): Promise<ReturnItem[]> {
        return prisma.returnItem.findMany({
            where: { productId },
        });
    }

    static async findByRestockStatus(status: string): Promise<ReturnItem[]> {
        return prisma.returnItem.findMany({
            where: { restockStatus: status },
        });
    }

    static async create(data: Partial<ReturnItem>): Promise<ReturnItem> {
        return prisma.returnItem.create({
            data: data as any,
        });
    }

    static async createMany(items: Partial<ReturnItem>[]): Promise<number> {
        const result = await prisma.returnItem.createMany({
            data: items as any[],
        });
        return result.count;
    }

    static async update(id: string, data: Partial<ReturnItem>): Promise<number> {
        const result = await prisma.returnItem.update({
            where: { returnItemId: id },
            data,
        });
        return result ? 1 : 0;
    }

    static async updateRestockStatus(
        id: string,
        status: string,
        restockedQuantity?: number
    ): Promise<number> {
        const updateData: any = {
            restockStatus: status,
            updatedAt: new Date()
        };

        if (restockedQuantity !== undefined) {
            updateData.restockedQuantity = restockedQuantity;
            updateData.restockedAt = new Date();
        }

        const result = await prisma.returnItem.update({
            where: { returnItemId: id },
            data: updateData,
        });
        return result ? 1 : 0;
    }

    static async delete(id: string): Promise<number> {
        const result = await prisma.returnItem.delete({
            where: { returnItemId: id },
        });
        return result ? 1 : 0;
    }

    static async count(conditions: any = {}): Promise<number> {
        return prisma.returnItem.count({
            where: conditions,
        });
    }

    static async getTotalReturnedQuantityByProduct(productId: string): Promise<number> {
        const returnItems = await this.findByProductId(productId);
        return returnItems.reduce((sum, item) => sum + Number(item.returnedQuantity), 0);
    }

    static async getPendingRestockItems(): Promise<ReturnItem[]> {
        return this.findByRestockStatus('pending');
    }

    static async getRestockedItems(): Promise<ReturnItem[]> {
        return this.findByRestockStatus('restocked');
    }
}
