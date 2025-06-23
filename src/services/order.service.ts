import { v4 as uuidv4 } from 'uuid';
import { OrderModel } from '../models/order.model';

export class OrderService {
    static async getAllOrders(): Promise<OrderItem[]> {
        return await OrderModel.findAll();
    }

    static async getOrderById(orderId: string): Promise<OrderItem | null> {
        return await OrderModel.findById(orderId);
    }

    static async getOrdersByRefNumber(refNumber: string): Promise<OrderItem[]> {
        return await OrderModel.findByRefNumber(refNumber);
    }

    static async getOrdersByProductId(productId: string): Promise<OrderItem[]> {
        return await OrderModel.findByProductId(productId);
    }

    static async searchOrders(conditions: any): Promise<OrderItem[]> {
        return await OrderModel.findByConditions(conditions);
    }

    static async createOrderItems(
        transactionUuid: string,
        items: CartItem[]
    ): Promise<OrderItem[]> {
        const orderItems: OrderItem[] = [];

        for (const item of items) {
            const orderItem: Partial<OrderItem> = {
                transactionUuid,
                productUuid: item.productUuid,
                quantity: item.quantity,
                purchasePrice: item.purchasePrice,
                sellPrice: item.sellPrice,
                uuid: uuidv4(),
            };

            const savedItem = await OrderModel.create(orderItem);
            orderItems.push(savedItem);
        }

        return orderItems;
    }

    static async createOrderItemsBatch(
        transactionUuid: string,
        refNumber: string,
        items: CartItem[]
    ): Promise<OrderItem[]> {
        const orderItems: OrderItem[] = [];

        const createPromises = items.map(async (item) => {
            const orderItem: Partial<OrderItem> = {
                refNumber,
                transactionUuid,
                productUuid: item.productUuid,
                quantity: item.quantity,
                purchasePrice: item.purchasePrice,
                sellPrice: item.sellPrice,
                uuid: uuidv4(),
            };

            return await OrderModel.create(orderItem);
        });

        const savedItems = await Promise.all(createPromises);
        return savedItems;
    }

    static async updateOrder(orderId: string, updateData: Partial<OrderItem>): Promise<boolean> {
        const numReplaced = await OrderModel.update(orderId, updateData);
        return numReplaced > 0;
    }

    static async deleteOrder(orderId: string): Promise<boolean> {
        const numRemoved = await OrderModel.delete(orderId);
        return numRemoved > 0;
    }

    static async deleteOrdersByRefNumber(refNumber: string): Promise<{ success: boolean; deletedCount: number }> {
        const orders = await OrderModel.findByRefNumber(refNumber);

        if (orders.length === 0) {
            return { success: false, deletedCount: 0 };
        }

        let deletedCount = 0;
        for (const order of orders) {
            await OrderModel.delete(order.uuid);
            deletedCount++;
        }

        return { success: true, deletedCount };
    }

    static async getOrdersCount(): Promise<number> {
        return await OrderModel.count();
    }

    static async getOrderSummary(refNumber: string): Promise<OrderSummary | null> {
        const orders = await OrderModel.findByRefNumber(refNumber);

        if (orders.length === 0) {
            return null;
        }

        const summary: OrderSummary = {
            refNumber,
            itemCount: orders.length,
            totalQuantity: orders.reduce((sum, order) => sum + order.quantity, 0),
            totalPurchasePrice: orders.reduce(
                (sum, order) => sum + order.purchasePrice * order.quantity,
                0
            ),
            totalSellPrice: orders.reduce(
                (sum, order) => sum + order.sellPrice * order.quantity,
                0
            ),
            totalProfit: 0,
            items: orders,
        };

        summary.totalProfit = summary.totalSellPrice - summary.totalPurchasePrice;

        return summary;
    }

    static async getUnsyncedOrders(): Promise<OrderItem[]> {
        return await OrderModel.getUnsyncedRecords();
    }

    static async markOrderAsSynced(orderId: string): Promise<boolean> {
        const numReplaced = await OrderModel.markAsSynced(orderId);
        return numReplaced > 0;
    }
}