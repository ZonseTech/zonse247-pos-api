import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { StockMovementService } from '../services/stock-movement.service';
import { AuthRequest } from '../lib/express.type';

export class StockMovementController extends BaseController {
    /**
     * Get stock movements for a product
     */
    static async getProductMovements(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { productId } = req.params;
            const page = parseInt(req.query.page as string) || 1;
            const perPage = parseInt(req.query.perPage as string) || 50;

            const { movements, total, totalPages } = await StockMovementService.getMovementsByProduct(
                productId as string,
                req.auth.tenantId,
                req.auth.branchId,
                page,
                perPage
            );

            BaseController.sendResponse(
                res,
                200,
                true,
                'Stock movements retrieved successfully',
                {
                    movements,
                    pagination: {
                        currentPage: page,
                        totalPages,
                        totalItems: total,
                        itemsPerPage: perPage
                    }
                }
            );
        } catch (error: any) {
            BaseController.sendResponse(
                res,
                400,
                false,
                'Failed to get stock movements',
                undefined,
                error.message
            );
        }
    }

    /**
     * Get stock movements for a branch
     */
    static async getBranchMovements(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { movementType, startDate, endDate, page, limit } = req.query;

            const result = await StockMovementService.getMovementsByBranch(
                req.auth.tenantId,
                req.auth.branchId,
                {
                    movementType: movementType as any,
                    startDate: startDate ? new Date(startDate as string) : undefined,
                    endDate: endDate ? new Date(endDate as string) : undefined,
                    page: page ? parseInt(page as string) : undefined,
                    limit: limit ? parseInt(limit as string) : undefined,
                }
            );

            BaseController.sendResponse(
                res,
                200,
                true,
                'Stock movements retrieved successfully',
                {
                    movements: result.movements,
                    pagination: {
                        currentPage: page ? parseInt(page as string) : 1,
                        totalPages: result.totalPages,
                        totalItems: result.total,
                        itemsPerPage: limit ? parseInt(limit as string) : 100
                    }
                }
            );
        } catch (error: any) {
            BaseController.sendResponse(
                res,
                400,
                false,
                'Failed to get stock movements',
                undefined,
                error.message
            );
        }
    }
}
