import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { ReturnService, ReturnRequest } from "../services/return.service";
import { AuthRequest } from "../lib/express.type";
import { parsePaginationParams } from "../utils/pagination.utils"; import { AuditService, getAuditContext } from '../services/audit.service';
export class ReturnController extends BaseController {

    /**
     * Get all returns for tenant/branch
     * GET /returns
     */
    static async getAllReturns(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const pagination = parsePaginationParams(req.query);
            const result = await ReturnService.listReturns(
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                pagination,
            );

            BaseController.sendPaginated(res, 'Returns retrieved successfully', result.data, result.pagination, 'returns');
        } catch (error: any) {
            console.error('Error getting all returns:', error);
            BaseController.sendResponse(
                res,
                500,
                false,
                error.message,
                undefined,
                error.message
            );
        }
    }

    /**
     * Initiate a return/refund
     * POST /returns/initiate
     */
    static async initiateReturn(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const returnRequest: ReturnRequest = req.body;

            if (!returnRequest.originalSaleId) {
                BaseController.sendResponse(res, 400, false, 'Original sale ID is required');
                return;
            }

            if (!returnRequest.items || returnRequest.items.length === 0) {
                BaseController.sendResponse(res, 400, false, 'At least one item must be returned');
                return;
            }

            const result = await ReturnService.initiateReturn(returnRequest, {
                tenantId: req.auth.tenantId,
                branchId: req.auth.activeBranchId || req.auth.branchId,
                userId: req.auth.userId,
            });

            AuditService.logCreate(getAuditContext(req), 'Return', (result as any).returnId || returnRequest.originalSaleId, returnRequest.originalSaleId, { items: returnRequest.items?.length, reason: (returnRequest as any).reason });

            BaseController.sendResponse(
                res,
                201,
                true,
                'Return initiated successfully',
                result
            );
        } catch (error: any) {
            console.error('Error initiating return:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (
                error.message.includes('required') ||
                error.message.includes('cannot') ||
                error.message.includes('invalid') ||
                error.message.includes('exceed')
            ) {
                statusCode = 400;
            }

            BaseController.sendResponse(
                res,
                statusCode,
                false,
                error.message,
                undefined,
                error.message
            );
        }
    }

    /**
     * Get all returns for a specific sale
     * GET /returns/sale/:saleId
     */
    static async getReturnsBySale(req: Request<{ saleId: string }> & AuthRequest, res: Response): Promise<void> {
        try {
            const { saleId } = req.params;

            if (!saleId) {
                BaseController.sendResponse(res, 400, false, 'Sale ID is required');
                return;
            }

            const returns = await ReturnService.getReturnsBySale(
                saleId,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );

            BaseController.sendResponse(
                res,
                200,
                true,
                'Returns retrieved successfully',
                returns
            );
        } catch (error: any) {
            console.error('Error getting returns:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            }

            BaseController.sendResponse(
                res,
                statusCode,
                false,
                error.message,
                undefined,
                error.message
            );
        }
    }

    /**
     * Get return details by sale ID
     * GET /returns/:saleId
     */
    static async getReturnById(req: Request<{ saleId: string }> & AuthRequest, res: Response): Promise<void> {
        try {
            const { saleId } = req.params;

            if (!saleId) {
                BaseController.sendResponse(res, 400, false, 'Sale ID is required');
                return;
            }

            const returnData = await ReturnService.getReturnById(
                saleId,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );

            BaseController.sendResponse(
                res,
                200,
                true,
                'Return retrieved successfully',
                returnData
            );
        } catch (error: any) {
            console.error('Error getting return:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            }

            BaseController.sendResponse(
                res,
                statusCode,
                false,
                error.message,
                undefined,
                error.message
            );
        }
    }

    /**
     * Cancel a return
     * DELETE /returns/:saleId
     */
    static async cancelReturn(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { saleId } = req.params;

            if (!saleId) {
                BaseController.sendResponse(res, 400, false, 'Sale ID is required');
                return;
            }

            await ReturnService.cancelReturn(saleId as string, {
                tenantId: req.auth.tenantId,
                branchId: req.auth.activeBranchId || req.auth.branchId,
                userId: req.auth.userId,
            });

            AuditService.logStatusChange(getAuditContext(req), 'cancel', 'Return', saleId as string, saleId as string, 'active', 'cancelled');

            BaseController.sendResponse(
                res,
                200,
                true,
                'Return cancelled successfully',
                { saleId, status: 'cancelled' }
            );
        } catch (error: any) {
            console.error('Error cancelling return:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            }

            BaseController.sendResponse(
                res,
                statusCode,
                false,
                error.message,
                undefined,
                error.message
            );
        }
    }

    /**
     * Restock returned items
     * POST /returns/:saleId/restock
     */
    static async restockItems(req: Request<{ saleId: string }> & AuthRequest, res: Response): Promise<void> {
        try {
            const { saleId } = req.params;
            const { restockItems } = req.body;

            if (!saleId) {
                BaseController.sendResponse(res, 400, false, 'Sale ID is required');
                return;
            }

            if (!restockItems || restockItems.length === 0) {
                BaseController.sendResponse(res, 400, false, 'Restock items are required');
                return;
            }

            await ReturnService.restockReturnedItems(saleId, restockItems, req.auth);

            AuditService.logUpdate(getAuditContext(req), 'Return', saleId, saleId, undefined, { restockItems: restockItems.length });

            BaseController.sendResponse(
                res,
                200,
                true,
                'Items restocked successfully',
                { saleId }
            );
        } catch (error: any) {
            console.error('Error restocking items:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('cannot exceed')) {
                statusCode = 400;
            }

            BaseController.sendResponse(
                res,
                statusCode,
                false,
                error.message,
                undefined,
                error.message
            );
        }
    }

    /**
     * Get return statistics for a date range
     * GET /returns/statistics/summary
     */
    static async getReturnStatistics(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                BaseController.sendResponse(res, 400, false, 'Start date and end date are required');
                return;
            }

            const start = new Date(startDate as string);
            const end = new Date(endDate as string);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                BaseController.sendResponse(res, 400, false, 'Invalid date format');
                return;
            }

            const statistics = await ReturnService.getReturnStatistics(
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                start,
                end
            );

            BaseController.sendResponse(
                res,
                200,
                true,
                'Return statistics retrieved successfully',
                statistics
            );
        } catch (error: any) {
            console.error('Error getting return statistics:', error);

            BaseController.sendResponse(
                res,
                500,
                false,
                error.message,
                undefined,
                error.message
            );
        }
    }
}
