import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { SaleService } from '../services/sale.service';
import { AuthRequest } from '../lib/express.type';

export class SaleController extends BaseController {
    /**
     * Create a sale
     */
    static async createSale(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const sale = await SaleService.createSale(req.body, req.auth.tenantId, req.auth.branchId);
            BaseController.sendResponse(res, 201, true, 'Sale completed successfully', sale);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to complete sale', undefined, error.message);
        }
    }

    /**
     * Get sale by ID
     */
    static async getSale(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { saleId } = req.params;

            const sale = await SaleService.getSaleById(
                saleId as string,
                req.auth.tenantId,
                req.auth.branchId
            );

            if (!sale) {
                BaseController.sendResponse(res, 404, false, 'Sale not found');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Sale retrieved successfully', sale);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to get sale', undefined, error.message);
        }
    }

    /**
     * List sales
     */
    static async listSales(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { status, userId, terminalId, startDate, endDate, page, limit } = req.query;

            const result = await SaleService.listSales(
                req.auth.tenantId,
                req.auth.branchId,
                {
                    status: status as any,
                    userId: userId as string,
                    terminalId: terminalId as string,
                    startDate: startDate ? new Date(startDate as string) : undefined,
                    endDate: endDate ? new Date(endDate as string) : undefined,
                    page: page ? parseInt(page as string) : undefined,
                    limit: limit ? parseInt(limit as string) : undefined,
                }
            );

            BaseController.sendResponse(res, 200, true, 'Sales retrieved successfully', {
                sales: result.sales,
                pagination: {
                    currentPage: page ? parseInt(page as string) : 1,
                    totalPages: result.totalPages,
                    totalItems: result.total,
                    itemsPerPage: limit ? parseInt(limit as string) : 50
                }
            });
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to list sales', undefined, error.message);
        }
    }

    /**
     * Void a sale
     */
    static async voidSale(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { saleId } = req.params;

            const sale = await SaleService.voidSale(
                saleId as string,
                req.auth.tenantId,
                req.auth.branchId,
                req.body
            );

            BaseController.sendResponse(res, 200, true, 'Sale voided successfully', sale);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to void sale', undefined, error.message);
        }
    }
}
