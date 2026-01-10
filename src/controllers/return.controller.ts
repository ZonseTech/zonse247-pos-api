import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { ReturnService, ReturnRequest } from "../services/return.service";
import { AuthRequest } from "../lib/express.type";

export class ReturnController extends BaseController {

    /**
     * Get all returns for tenant/branch
     * GET /returns
     */
    static async getAllReturns(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const returns = await ReturnService.getAllReturns(req.auth.tenantId, req.auth.branchId);

            BaseController.sendResponse(
                res,
                200,
                true,
                'Returns retrieved successfully',
                returns
            );
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

            if (!returnRequest.originalTransactionId) {
                BaseController.sendResponse(res, 400, false, 'Original transaction ID is required');
                return;
            }

            if (!returnRequest.items || returnRequest.items.length === 0) {
                BaseController.sendResponse(res, 400, false, 'At least one item must be returned');
                return;
            }

            const result = await ReturnService.initiateReturn(returnRequest, {
                tenantId: req.auth.tenantId,
                branchId: req.auth.branchId,
                userId: req.auth.userId,
            });

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
     * Get all returns for a specific transaction
     * GET /returns/transaction/:transactionId
     */
    static async getReturnsByTransaction(req: Request<{ transactionId: string }>, res: Response): Promise<void> {
        try {
            const { transactionId } = req.params;

            if (!transactionId) {
                BaseController.sendResponse(res, 400, false, 'Transaction ID is required');
                return;
            }

            const returns = await ReturnService.getReturnsByTransaction(transactionId);

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
     * Get return details by return transaction ID
     * GET /returns/:returnTransactionId
     */
    static async getReturnById(req: Request<{ returnTransactionId: string }>, res: Response): Promise<void> {
        try {
            const { returnTransactionId } = req.params;

            if (!returnTransactionId) {
                BaseController.sendResponse(res, 400, false, 'Return transaction ID is required');
                return;
            }

            const returnData = await ReturnService.getReturnById(returnTransactionId);

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
     * DELETE /returns/:returnTransactionId
     */
    static async cancelReturn(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { returnTransactionId } = req.params;

            if (!returnTransactionId) {
                BaseController.sendResponse(res, 400, false, 'Return transaction ID is required');
                return;
            }

            await ReturnService.cancelReturn(returnTransactionId as string, {
                tenantId: req.auth.tenantId,
                branchId: req.auth.branchId,
                userId: req.auth.userId,
            });

            BaseController.sendResponse(
                res,
                200,
                true,
                'Return cancelled successfully',
                { returnTransactionId, status: 'cancelled' }
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
     * POST /returns/:returnTransactionId/restock
     */
    static async restockItems(req: Request<{ returnTransactionId: string }>, res: Response): Promise<void> {
        try {
            const { returnTransactionId } = req.params;
            const { restockItems } = req.body;

            if (!returnTransactionId) {
                BaseController.sendResponse(res, 400, false, 'Return transaction ID is required');
                return;
            }

            if (!restockItems || restockItems.length === 0) {
                BaseController.sendResponse(res, 400, false, 'Restock items are required');
                return;
            }

            await ReturnService.restockReturnedItems(returnTransactionId, restockItems);

            BaseController.sendResponse(
                res,
                200,
                true,
                'Items restocked successfully',
                { returnTransactionId }
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
    static async getReturnStatistics(req: Request, res: Response): Promise<void> {
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

            const statistics = await ReturnService.getReturnStatistics(start, end);

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
