import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { ServiceOrderService } from '../services/service-order';
import { AuthRequest, getEffectiveBranchId, getParam } from '../lib/express.type';
import { ServiceOrderStatus } from '../types/service-order.types';
import { parsePaginationParams, buildPaginationMeta } from '../utils/pagination.utils';

export class ServiceOrderController extends BaseController {
  private static getAuth(req: Request & AuthRequest) {
    const auth = req.auth!;
    return {
      tenantId: auth.tenantId,
      branchId: getEffectiveBranchId(auth),
      userId: auth.userId,
    };
  }

  static async createServiceOrder(req: Request & AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId, branchId, userId } = ServiceOrderController.getAuth(req);
      const order = await ServiceOrderService.createServiceOrder(req.body, tenantId, branchId, userId);
      BaseController.sendCreated(res, 'Service order created successfully', order);
    } catch (error: any) {
      BaseController.sendBadRequest(res, 'Failed to create service order', error.message);
    }
  }

  static async getServiceOrder(req: Request & AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId, branchId } = ServiceOrderController.getAuth(req);
      const serviceOrderId = getParam(req.params.serviceOrderId);
      const order = await ServiceOrderService.getServiceOrderById(serviceOrderId, tenantId, branchId);

      if (!order) {
        BaseController.sendNotFound(res, 'Service order not found');
        return;
      }

      BaseController.sendSuccess(res, 'Service order retrieved successfully', order);
    } catch (error: any) {
      BaseController.sendBadRequest(res, 'Failed to get service order', error.message);
    }
  }

  static async listServiceOrders(req: Request & AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId, branchId } = ServiceOrderController.getAuth(req);
      const { status, customerId, search, from, to } = req.query;
      const { page, limit } = parsePaginationParams(req.query);

      const result = await ServiceOrderService.listServiceOrders(tenantId, branchId, {
        status: status as ServiceOrderStatus | ServiceOrderStatus[],
        customerId: customerId as string,
        search: search as string,
        page,
        limit,
        from: from as string,
        to: to as string,
      });

      BaseController.sendPaginated(
        res,
        'Service orders retrieved successfully',
        result.orders,
        buildPaginationMeta(result.total, page, limit),
        'orders',
      );
    } catch (error: any) {
      BaseController.sendBadRequest(res, 'Failed to list service orders', error.message);
    }
  }

  static async updateServiceOrder(req: Request & AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId, branchId, userId } = ServiceOrderController.getAuth(req);
      const serviceOrderId = getParam(req.params.serviceOrderId);
      const order = await ServiceOrderService.updateServiceOrder(serviceOrderId, tenantId, branchId, req.body, userId);
      BaseController.sendSuccess(res, 'Service order updated successfully', order);
    } catch (error: any) {
      BaseController.sendBadRequest(res, 'Failed to update service order', error.message);
    }
  }

  static async startOrder(req: Request & AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId, branchId } = ServiceOrderController.getAuth(req);
      const serviceOrderId = getParam(req.params.serviceOrderId);
      const order = await ServiceOrderService.startOrder(serviceOrderId, tenantId, branchId);
      BaseController.sendSuccess(res, 'Service order started', order);
    } catch (error: any) {
      BaseController.sendBadRequest(res, 'Failed to start service order', error.message);
    }
  }

  static async startItem(req: Request & AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId, branchId } = ServiceOrderController.getAuth(req);
      const serviceOrderId = getParam(req.params.serviceOrderId);
      const itemId = getParam(req.params.itemId);
      const order = await ServiceOrderService.startItem(serviceOrderId, itemId, tenantId, branchId);
      BaseController.sendSuccess(res, 'Service order item started', order);
    } catch (error: any) {
      BaseController.sendBadRequest(res, 'Failed to start item', error.message);
    }
  }

  static async completeItem(req: Request & AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId, branchId, userId } = ServiceOrderController.getAuth(req);
      const serviceOrderId = getParam(req.params.serviceOrderId);
      const itemId = getParam(req.params.itemId);
      const order = await ServiceOrderService.completeItem(serviceOrderId, itemId, tenantId, branchId, userId, req.body);
      BaseController.sendSuccess(res, 'Service order item completed', order);
    } catch (error: any) {
      BaseController.sendBadRequest(res, 'Failed to complete item', error.message);
    }
  }

  static async cancelItem(req: Request & AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId, branchId, userId } = ServiceOrderController.getAuth(req);
      const serviceOrderId = getParam(req.params.serviceOrderId);
      const itemId = getParam(req.params.itemId);
      const order = await ServiceOrderService.cancelItem(serviceOrderId, itemId, tenantId, branchId, userId);
      BaseController.sendSuccess(res, 'Service order item cancelled', order);
    } catch (error: any) {
      BaseController.sendBadRequest(res, 'Failed to cancel item', error.message);
    }
  }

  static async cancelOrder(req: Request & AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId, branchId, userId } = ServiceOrderController.getAuth(req);
      const serviceOrderId = getParam(req.params.serviceOrderId);
      const order = await ServiceOrderService.cancelOrder(serviceOrderId, tenantId, branchId, userId);
      BaseController.sendSuccess(res, 'Service order cancelled', order);
    } catch (error: any) {
      BaseController.sendBadRequest(res, 'Failed to cancel service order', error.message);
    }
  }

  static async addConsumptions(req: Request & AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId, branchId, userId } = ServiceOrderController.getAuth(req);
      const serviceOrderId = getParam(req.params.serviceOrderId);
      const itemId = getParam(req.params.itemId);
      const order = await ServiceOrderService.addConsumptions(
        serviceOrderId, itemId, tenantId, branchId, userId, req.body.consumptions,
      );
      BaseController.sendSuccess(res, 'Consumptions recorded successfully', order);
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : 400;
      BaseController.sendResponse(res, status, false, 'Failed to add consumptions', undefined, error.message);
    }
  }

  static async recordPayment(req: Request & AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId, branchId } = ServiceOrderController.getAuth(req);
      const serviceOrderId = getParam(req.params.serviceOrderId);
      const payments = Array.isArray(req.body.payments) ? req.body.payments : [req.body];
      const order = await ServiceOrderService.recordPayment(serviceOrderId, tenantId, branchId, payments);
      BaseController.sendSuccess(res, 'Payment recorded successfully', order);
    } catch (error: any) {
      BaseController.sendBadRequest(res, 'Failed to record payment', error.message);
    }
  }

  static async listPayments(req: Request & AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId, branchId } = ServiceOrderController.getAuth(req);
      const serviceOrderId = getParam(req.params.serviceOrderId);
      const payments = await ServiceOrderService.listPayments(serviceOrderId, tenantId, branchId);
      BaseController.sendSuccess(res, 'Payments retrieved successfully', payments);
    } catch (error: any) {
      BaseController.sendBadRequest(res, 'Failed to list payments', error.message);
    }
  }
}
