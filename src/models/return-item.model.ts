import prisma from '../databases/prisma/client';

// Database-agnostic decimal type (MySQL uses Decimal, SQLite uses number)
type DecimalValue = number | { toNumber(): number };

export interface ReturnItem {
    returnItemId: string;
    returnTransactionId: string;
    originalOrderId: string;
    productId: string;
    returnedQuantity: DecimalValue;
    originalQuantity: DecimalValue;
    returnPrice: DecimalValue;
    returnReason?: string;
    restockStatus?: string;
    restockedQuantity?: DecimalValue;
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
        }) as unknown as ReturnItem[];
    }

    static async findById(id: string): Promise<ReturnItem | null> {
        return prisma.returnItem.findUnique({
            where: { returnItemId: id },
        }) as unknown as ReturnItem | null;
    }

    /**
     * Sale ids (returnTransactionId) that had items returned within the given createdAt range
     */
    static async findReturnTransactionIdsInRange(createdAt: { gte?: Date; lte?: Date }): Promise<string[]> {
        const rows = await prisma.returnItem.findMany({
            where: { createdAt },
            select: { returnTransactionId: true },
            distinct: ['returnTransactionId'],
        });
        return rows.map((row) => row.returnTransactionId);
    }

    static async findByReturnTransactionId(returnTransactionId: string): Promise<ReturnItem[]> {
        return prisma.returnItem.findMany({
            where: { returnTransactionId },
        }) as unknown as ReturnItem[];
    }

    static async findByOriginalOrderId(originalOrderId: string): Promise<ReturnItem[]> {
        return prisma.returnItem.findMany({
            where: { originalOrderId },
        }) as unknown as ReturnItem[];
    }

    static async findByProductId(productId: string): Promise<ReturnItem[]> {
        return prisma.returnItem.findMany({
            where: { productId },
        }) as unknown as ReturnItem[];
    }

    static async findByRestockStatus(status: string): Promise<ReturnItem[]> {
        return prisma.returnItem.findMany({
            where: { restockStatus: status },
        }) as unknown as ReturnItem[];
    }

    static async create(data: Partial<ReturnItem>): Promise<ReturnItem> {
        return prisma.returnItem.create({
            data: data as any,
        }) as unknown as ReturnItem;
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
            data: data as any,
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
