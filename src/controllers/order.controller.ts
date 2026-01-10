import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { OrderService } from '../services/order.service';

export class OrderController extends BaseController {
    static async list(req: Request, res: Response): Promise<void> {
        try {
            const orders = await OrderService.getAllOrders();
            OrderController.sendSuccess(res, 'Orders retrieved successfully', orders);
        } catch (error) {
            console.error('Error fetching all orders:', error);
            OrderController.sendServerError(res, 'An unexpected error occurred while fetching orders');
        }
    }

    static async getById(req: Request, res: Response): Promise<void> {
        try {
            const { orderId } = req.params;
            const order = await OrderService.getOrderById(orderId as string);

            if (!order) {
                OrderController.sendNotFound(res, 'Order not found');
                return;
            }

            OrderController.sendSuccess(res, 'Order retrieved successfully', order);
        } catch (error) {
            console.error('Error fetching order:', error);
            OrderController.sendServerError(res, 'An unexpected error occurred while fetching order');
        }
    }

    static async getByRefNumber(req: Request, res: Response): Promise<void> {
        try {
            const { refNumber } = req.params;
            const orders = await OrderService.getOrdersByRefNumber(refNumber as string);

            if (orders.length === 0) {
                OrderController.sendNotFound(res, 'No orders found for this reference number');
                return;
            }

            OrderController.sendSuccess(res, 'Orders retrieved successfully', orders);
        } catch (error) {
            console.error('Error fetching orders by reference:', error);
            OrderController.sendServerError(res, 'An unexpected error occurred while fetching orders');
        }
    }

    static async getByProductId(req: Request, res: Response): Promise<void> {
        try {
            const { productId } = req.params;
            const orders = await OrderService.getOrdersByProductId(productId as string);
            OrderController.sendSuccess(res, 'Orders retrieved successfully', orders);
        } catch (error) {
            console.error('Error fetching orders by product:', error);
            OrderController.sendServerError(res, 'An unexpected error occurred while fetching orders by product');
        }
    }

    static async createItems(req: Request, res: Response): Promise<void> {
        try {
            const { refNumber, transactionId, items } = req.body;

            if (!refNumber || !items || !Array.isArray(items)) {
                OrderController.sendBadRequest(res, 'Reference number and items array are required');
                return;
            }

            const savedItems = await OrderService.createOrderItems(transactionId, refNumber, items);
            OrderController.sendCreated(res, 'Order items created successfully', {
                refNumber,
                items: savedItems,
                count: savedItems.length,
            });
        } catch (error) {
            console.error('Error creating order items:', error);
            OrderController.sendServerError(res, 'An unexpected error occurred while creating order items');
        }
    }

    static async createItemsBatch(req: Request, res: Response): Promise<void> {
        try {
            const { refNumber, transactionId, items } = req.body;

            if (!refNumber || !items || !Array.isArray(items)) {
                OrderController.sendBadRequest(res, 'Reference number and items array are required');
                return;
            }

            const savedItems = await OrderService.createOrderItemsBatch(transactionId, refNumber, items);
            OrderController.sendCreated(res, 'Order items created successfully (batch)', {
                refNumber,
                items: savedItems,
                count: savedItems.length,
            });
        } catch (error) {
            console.error('Error batch creating order items:', error);
            OrderController.sendServerError(res, 'An unexpected error occurred while batch creating order items');
        }
    }

    static async update(req: Request, res: Response): Promise<void> {
        try {
            const { orderId } = req.params;
            const updateData = req.body;

            const success = await OrderService.updateOrder(orderId as string, updateData);

            if (!success) {
                OrderController.sendNotFound(res, 'Order not found');
                return;
            }

            OrderController.sendSuccess(res, 'Order updated successfully');
        } catch (error) {
            console.error('Error updating order:', error);
            OrderController.sendServerError(res, 'An unexpected error occurred while updating order');
        }
    }

    static async delete(req: Request, res: Response): Promise<void> {
        try {
            const { orderId } = req.params;
            const success = await OrderService.deleteOrder(orderId as string);

            if (!success) {
                OrderController.sendNotFound(res, 'Order not found');
                return;
            }

            OrderController.sendSuccess(res, 'Order deleted successfully');
        } catch (error) {
            console.error('Error deleting order:', error);
            OrderController.sendServerError(res, 'An unexpected error occurred while deleting order');
        }
    }

    static async deleteByRefNumber(req: Request, res: Response): Promise<void> {
        try {
            const { refNumber } = req.params;
            const result = await OrderService.deleteOrdersByRefNumber(refNumber as string);

            if (!result.success) {
                OrderController.sendNotFound(res, 'No orders found for this reference number');
                return;
            }

            OrderController.sendSuccess(res, 'Orders deleted successfully', {
                refNumber,
                deletedCount: result.deletedCount,
            });
        } catch (error) {
            console.error('Error deleting orders by reference:', error);
            OrderController.sendServerError(res, 'An unexpected error occurred while deleting orders');
        }
    }

    static async getCount(req: Request, res: Response): Promise<void> {
        try {
            const count = await OrderService.getOrdersCount();
            OrderController.sendSuccess(res, 'Order count retrieved successfully', { count });
        } catch (error) {
            console.error('Error counting orders:', error);
            OrderController.sendServerError(res, 'An unexpected error occurred while counting orders');
        }
    }

    static async getSummary(req: Request, res: Response): Promise<void> {
        try {
            const { refNumber } = req.params;
            const summary = await OrderService.getOrderSummary(refNumber as string);

            if (!summary) {
                OrderController.sendNotFound(res, 'No orders found for this reference number');
                return;
            }

            OrderController.sendSuccess(res, 'Order summary retrieved successfully', summary);
        } catch (error) {
            console.error('Error getting order summary:', error);
            OrderController.sendServerError(res, 'An unexpected error occurred while getting order summary');
        }
    }

    static async getUnsynced(req: Request, res: Response): Promise<void> {
        try {
            const unsyncedOrders = await OrderService.getUnsyncedOrders();
            OrderController.sendSuccess(res, 'Unsynced orders retrieved successfully', unsyncedOrders);
        } catch (error) {
            console.error('Error fetching unsynced orders:', error);
            OrderController.sendServerError(res, 'An unexpected error occurred while fetching unsynced orders');
        }
    }

    static async markAsSynced(req: Request, res: Response): Promise<void> {
        try {
            const { orderId } = req.params;
            const success = await OrderService.markOrderAsSynced(orderId as string);

            if (!success) {
                OrderController.sendNotFound(res, 'Order not found');
                return;
            }

            OrderController.sendSuccess(res, 'Order marked as synced');
        } catch (error) {
            console.error('Error marking order as synced:', error);
            OrderController.sendServerError(res, 'An unexpected error occurred while syncing order');
        }
    }

    static async search(req: Request, res: Response): Promise<void> {
        try {
            const conditions = req.body.conditions || {};
            const orders = await OrderService.searchOrders(conditions);
            OrderController.sendSuccess(res, 'Order search completed successfully', orders);
        } catch (error) {
            console.error('Error searching orders:', error);
            OrderController.sendServerError(res, 'An unexpected error occurred while searching orders');
        }
    }
}