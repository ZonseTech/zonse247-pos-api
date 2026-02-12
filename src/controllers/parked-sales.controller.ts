import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { ParkedSalesService } from '../services/parked-sales.service';
import { AuthRequest } from '../lib/express.type';

// Valid ParkedSaleStatus values with common aliases
// DB enum: 'PARKED', 'RESUMED', 'CANCELLED', 'COMPLETED', 'EXPIRED'
const VALID_PARKED_SALE_STATUSES: Record<string, string> = {
    'PARKED': 'PARKED',
    'HOLD': 'PARKED',
    'PENDING': 'PARKED',
    'RESUMED': 'RESUMED',
    'CANCELLED': 'CANCELLED',
    'CANCELED': 'CANCELLED',
    'COMPLETED': 'COMPLETED',
    'EXPIRED': 'EXPIRED',
    'parked': 'PARKED',
    'hold': 'PARKED',
    'pending': 'PARKED',
    'resumed': 'RESUMED',
    'cancelled': 'CANCELLED',
    'canceled': 'CANCELLED',
    'completed': 'COMPLETED',
    'expired': 'EXPIRED',
};

/**
 * Validate and map status to valid ParkedSaleStatus enum
 * Returns mapped status or undefined if status is not provided or invalid
 */
function mapParkedSaleStatus(status: string | undefined): string | undefined {
    if (!status) return undefined;
    return VALID_PARKED_SALE_STATUSES[status.toString()];
}

export class ParkedSalesController extends BaseController {
    /**
     * Park a sale (create a parked sale)
     */
    static async parkSale(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const branchId = req.auth.activeBranchId || req.auth.branchId;
            const parkedSale = await ParkedSalesService.parkSale(req.body, req.auth.tenantId, branchId);
            BaseController.sendResponse(res, 201, true, 'Sale parked successfully', parkedSale);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to park sale', undefined, error.message);
        }
    }

    /**
     * List all parked sales
     */
    static async listParkedSales(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { userId, terminalId, status, page, limit, perPage } = req.query;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            const itemsPerPage = perPage ? parseInt(perPage as string) : (limit ? parseInt(limit as string) : 50);
            const currentPage = page ? parseInt(page as string) : 1;

            // Map status to valid ParkedSaleStatus enum value
            const mappedStatus = mapParkedSaleStatus(status as string);

            const result = await ParkedSalesService.listParkedSales(
                req.auth.tenantId,
                branchId,
                {
                    userId: userId as string,
                    terminalId: terminalId as string,
                    status: mappedStatus,
                    page: currentPage,
                    limit: itemsPerPage,
                }
            );

            BaseController.sendResponse(res, 200, true, 'Parked sales retrieved successfully', {
                parkedSales: result.parkedSales,
                pagination: {
                    currentPage,
                    totalPages: result.totalPages,
                    totalItems: result.total,
                    itemsPerPage
                }
            });
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to list parked sales', undefined, error.message);
        }
    }

    /**
     * Get a parked sale by ID
     */
    static async getParkedSale(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { parkedSaleId } = req.params;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            const parkedSale = await ParkedSalesService.getParkedSaleById(
                parkedSaleId as string,
                req.auth.tenantId,
                branchId
            );

            if (!parkedSale) {
                BaseController.sendResponse(res, 404, false, 'Parked sale not found');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Parked sale retrieved successfully', parkedSale);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to get parked sale', undefined, error.message);
        }
    }

    /**
     * Update a parked sale
     */
    static async updateParkedSale(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { parkedSaleId } = req.params;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            const parkedSale = await ParkedSalesService.updateParkedSale(
                parkedSaleId as string,
                req.auth.tenantId,
                branchId,
                req.body
            );

            BaseController.sendResponse(res, 200, true, 'Parked sale updated successfully', parkedSale);
        } catch (error: any) {
            if (error.message === 'Parked sale not found') {
                BaseController.sendResponse(res, 404, false, error.message);
                return;
            }
            BaseController.sendResponse(res, 400, false, 'Failed to update parked sale', undefined, error.message);
        }
    }

    /**
     * Resume a parked sale (retrieve and mark as resumed)
     */
    static async resumeParkedSale(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { parkedSaleId } = req.params;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            const parkedSale = await ParkedSalesService.resumeParkedSale(
                parkedSaleId as string,
                req.auth.tenantId,
                branchId
            );

            BaseController.sendResponse(res, 200, true, 'Parked sale resumed successfully', parkedSale);
        } catch (error: any) {
            if (error.message === 'Parked sale not found') {
                BaseController.sendResponse(res, 404, false, error.message);
                return;
            }
            BaseController.sendResponse(res, 400, false, 'Failed to resume parked sale', undefined, error.message);
        }
    }

    /**
     * Delete a parked sale
     */
    static async deleteParkedSale(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { parkedSaleId } = req.params;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            await ParkedSalesService.deleteParkedSale(
                parkedSaleId as string,
                req.auth.tenantId,
                branchId
            );

            BaseController.sendResponse(res, 200, true, 'Parked sale deleted successfully');
        } catch (error: any) {
            if (error.message === 'Parked sale not found') {
                BaseController.sendResponse(res, 404, false, error.message);
                return;
            }
            BaseController.sendResponse(res, 400, false, 'Failed to delete parked sale', undefined, error.message);
        }
    }

    /**
     * Get parked sales count/stats
     */
    static async getParkedSalesCount(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { userId, terminalId } = req.query;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            const result = await ParkedSalesService.getParkedSalesCount(
                req.auth.tenantId,
                branchId,
                {
                    userId: userId as string,
                    terminalId: terminalId as string,
                }
            );

            BaseController.sendResponse(res, 200, true, 'Parked sales count retrieved successfully', result);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to get parked sales count', undefined, error.message);
        }
    }
}
