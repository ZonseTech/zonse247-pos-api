import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { ServiceOrderService } from '../services/service-order.service';
import { ServiceOrderStatus } from '../types/service-order.types';

const VALID_STATUSES: ServiceOrderStatus[] = [
  'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PARTIALLY_PAID', 'PAID',
];

export class ServiceOrderController extends BaseController {
  private static getAuth(req: Request) {
    const auth = (req as any).auth;
    return {
      tenantId: auth.tenantId,
      branchId: auth.activeBranchId || auth.branchId,
      userId: auth.userId,
    };
  }

  // ── Create ──────────────────────────────────────────────────────
  static async createServiceOrder(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, branchId, userId } = ServiceOrderController.getAuth(req);
      const order = await ServiceOrderService.createServiceOrder(req.body, tenantId, branchId, userId);
      BaseController.sendResponse(res, 201, true, 'Service order created successfully', order);
    } catch (error: any) {
      BaseController.sendResponse(res, 400, false, 'Failed to create service order', undefined, error.message);
    }
  }

  // ── Read ────────────────────────────────────────────────────────
  static async getServiceOrder(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, branchId } = ServiceOrderController.getAuth(req);
      const serviceOrderId = req.params.serviceOrderId as string;
      const order = await ServiceOrderService.getServiceOrderById(serviceOrderId, tenantId, branchId);

      if (!order) {
        BaseController.sendResponse(res, 404, false, 'Service order not found');
        return;
      }

      BaseController.sendResponse(res, 200, true, 'Service order retrieved successfully', order);
    } catch (error: any) {
      BaseController.sendResponse(res, 400, false, 'Failed to get service order', undefined, error.message);
    }
  }

  static async listServiceOrders(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, branchId } = ServiceOrderController.getAuth(req);
      const { status, customerId, search, page, limit, from, to } = req.query;

      const validatedStatus = status && VALID_STATUSES.includes(status as ServiceOrderStatus)
        ? (status as ServiceOrderStatus)
        : undefined;

      if (status && !validatedStatus) {
        BaseController.sendResponse(res, 400, false, `Invalid status. Valid values are: ${VALID_STATUSES.join(', ')}`);
        return;
      }

      const result = await ServiceOrderService.listServiceOrders(tenantId, branchId, {
        status: validatedStatus,
        customerId: customerId as string,
        search: search as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        from: from as string,
        to: to as string,
      });

      BaseController.sendResponse(res, 200, true, 'Service orders retrieved successfully', {
        orders: result.orders,
        pagination: {
          currentPage: page ? parseInt(page as string) : 1,
          totalPages: result.totalPages,
          totalItems: result.total,
          itemsPerPage: limit ? parseInt(limit as string) : 50,
        },
      });
    } catch (error: any) {
      BaseController.sendResponse(res, 400, false, 'Failed to list service orders', undefined, error.message);
    }
  }

  // ── Update ──────────────────────────────────────────────────────
  static async updateServiceOrder(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, branchId, userId } = ServiceOrderController.getAuth(req);
      const serviceOrderId = req.params.serviceOrderId as string;
      const order = await ServiceOrderService.updateServiceOrder(serviceOrderId, tenantId, branchId, req.body, userId);
      BaseController.sendResponse(res, 200, true, 'Service order updated successfully', order);
    } catch (error: any) {
      BaseController.sendResponse(res, 400, false, 'Failed to update service order', undefined, error.message);
    }
  }

  // ── Status transitions ──────────────────────────────────────────
  static async startOrder(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, branchId } = ServiceOrderController.getAuth(req);
      const serviceOrderId = req.params.serviceOrderId as string;
      const order = await ServiceOrderService.startOrder(serviceOrderId, tenantId, branchId);
      BaseController.sendResponse(res, 200, true, 'Service order started', order);
    } catch (error: any) {
      BaseController.sendResponse(res, 400, false, 'Failed to start service order', undefined, error.message);
    }
  }

  static async startItem(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, branchId } = ServiceOrderController.getAuth(req);
      const serviceOrderId = req.params.serviceOrderId as string;
      const itemId = req.params.itemId as string;
      const order = await ServiceOrderService.startItem(serviceOrderId, itemId, tenantId, branchId);
      BaseController.sendResponse(res, 200, true, 'Service order item started', order);
    } catch (error: any) {
      BaseController.sendResponse(res, 400, false, 'Failed to start item', undefined, error.message);
    }
  }

  static async completeItem(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, branchId, userId } = ServiceOrderController.getAuth(req);
      const serviceOrderId = req.params.serviceOrderId as string;
      const itemId = req.params.itemId as string;
      const order = await ServiceOrderService.completeItem(serviceOrderId, itemId, tenantId, branchId, userId, req.body);
      BaseController.sendResponse(res, 200, true, 'Service order item completed', order);
    } catch (error: any) {
      BaseController.sendResponse(res, 400, false, 'Failed to complete item', undefined, error.message);
    }
  }

  static async cancelItem(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, branchId, userId } = ServiceOrderController.getAuth(req);
      const serviceOrderId = req.params.serviceOrderId as string;
      const itemId = req.params.itemId as string;
      const order = await ServiceOrderService.cancelItem(serviceOrderId, itemId, tenantId, branchId, userId);
      BaseController.sendResponse(res, 200, true, 'Service order item cancelled', order);
    } catch (error: any) {
      BaseController.sendResponse(res, 400, false, 'Failed to cancel item', undefined, error.message);
    }
  }

  static async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, branchId, userId } = ServiceOrderController.getAuth(req);
      const serviceOrderId = req.params.serviceOrderId as string;
      const order = await ServiceOrderService.cancelOrder(serviceOrderId, tenantId, branchId, userId);
      BaseController.sendResponse(res, 200, true, 'Service order cancelled', order);
    } catch (error: any) {
      BaseController.sendResponse(res, 400, false, 'Failed to cancel service order', undefined, error.message);
    }
  }

  // ── Add Consumptions (post-completion) ──────────────────────────
  static async addConsumptions(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, branchId, userId } = ServiceOrderController.getAuth(req);
      const serviceOrderId = req.params.serviceOrderId as string;
      const itemId = req.params.itemId as string;
      const order = await ServiceOrderService.addConsumptions(
        serviceOrderId,
        itemId,
        tenantId,
        branchId,
        userId,
        req.body.consumptions
      );
      BaseController.sendResponse(res, 200, true, 'Consumptions recorded successfully', order);
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : 400;
      BaseController.sendResponse(res, status, false, 'Failed to add consumptions', undefined, error.message);
    }
  }

  // ── Payments ────────────────────────────────────────────────────
  static async recordPayment(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, branchId } = ServiceOrderController.getAuth(req);
      const serviceOrderId = req.params.serviceOrderId as string;
      const payments = Array.isArray(req.body.payments) ? req.body.payments : [req.body];
      const order = await ServiceOrderService.recordPayment(serviceOrderId, tenantId, branchId, payments);
      BaseController.sendResponse(res, 200, true, 'Payment recorded successfully', order);
    } catch (error: any) {
      BaseController.sendResponse(res, 400, false, 'Failed to record payment', undefined, error.message);
    }
  }

  static async listPayments(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, branchId } = ServiceOrderController.getAuth(req);
      const serviceOrderId = req.params.serviceOrderId as string;
      const payments = await ServiceOrderService.listPayments(serviceOrderId, tenantId, branchId);
      BaseController.sendResponse(res, 200, true, 'Payments retrieved successfully', payments);
    } catch (error: any) {
      BaseController.sendResponse(res, 400, false, 'Failed to list payments', undefined, error.message);
    }
  }
}
