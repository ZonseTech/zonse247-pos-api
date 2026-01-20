import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { SaleService } from '../services/sale.service';
import { AuthRequest } from '../lib/express.type';

// Valid SaleStatus values with common aliases (module-level for reliable access)
const VALID_SALE_STATUSES: Record<string, string> = {
    'PENDING': 'PENDING',
    'COMPLETED': 'COMPLETED',
    'VOIDED': 'VOIDED',
    'REFUNDED': 'REFUNDED',
    'PARTIALLY_REFUNDED': 'PARTIALLY_REFUNDED',
    // Common aliases
    'RETURNED': 'REFUNDED',
    'RETURN': 'REFUNDED',
    'VOID': 'VOIDED',
    'CANCELLED': 'VOIDED',
    'CANCELED': 'VOIDED',
    'PARTIAL_REFUND': 'PARTIALLY_REFUNDED',
};

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
    // Lowercase versions
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
 * Validate and map status to valid SaleStatus enum
 * Returns mapped status or undefined if status is not provided or invalid
 */
function mapSaleStatus(status: string | undefined): string | undefined {
    if (!status) return undefined;
    const statusUpper = status.toString().toUpperCase();
    return VALID_SALE_STATUSES[statusUpper];
}

/**
 * Validate and map status to valid ParkedSaleStatus enum
 * Returns mapped status or undefined if status is not provided or invalid
 */
function mapParkedSaleStatus(status: string | undefined): string | undefined {
    if (!status) return undefined;
    return VALID_PARKED_SALE_STATUSES[status.toString()];
}

export class SaleController extends BaseController {
    /**
     * Create a sale
     * Uses activeBranchId for branch switching support
     */
    static async createSale(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const branchId = req.auth.activeBranchId || req.auth.branchId;
            const sale = await SaleService.createSale(req.body, req.auth.tenantId, branchId);
            BaseController.sendResponse(res, 201, true, 'Sale completed successfully', sale);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to complete sale', undefined, error.message);
        }
    }

    /**
     * Get sale by ID
     * Uses activeBranchId for branch switching support
     */
    static async getSale(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { saleId } = req.params;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            const sale = await SaleService.getSaleById(
                saleId as string,
                req.auth.tenantId,
                branchId
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
     * Uses activeBranchId for branch switching support
     */
    static async listSales(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const {
                status,
                userId,
                terminalId,
                paymentMethodId,
                startDate,
                endDate,
                page,
                limit,
                perPage,
                includeItems,
                search
            } = req.query;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            // Validate and map status
            const validStatus = mapSaleStatus(status as string);
            if (status && !validStatus) {
                BaseController.sendResponse(
                    res,
                    400,
                    false,
                    'Invalid status. Valid values: PENDING, COMPLETED, VOIDED, REFUNDED, PARTIALLY_REFUNDED'
                );
                return;
            }

            // Parse dates properly - ensure they're treated as local dates
            let parsedStartDate: Date | undefined;
            let parsedEndDate: Date | undefined;

            if (startDate) {
                const dateStr = startDate.toString();
                parsedStartDate = new Date(dateStr + 'T00:00:00');
            }

            if (endDate) {
                const dateStr = endDate.toString();
                parsedEndDate = new Date(dateStr + 'T00:00:00');
            }

            // Support both limit and perPage parameters
            const itemsPerPage = perPage ? parseInt(perPage as string) : (limit ? parseInt(limit as string) : 50);
            const currentPage = page ? parseInt(page as string) : 1;

            const result = await SaleService.listSales(
                req.auth.tenantId,
                branchId,
                {
                    status: validStatus as any,
                    userId: userId as string,
                    terminalId: terminalId as string,
                    paymentMethodId: paymentMethodId as string,
                    startDate: parsedStartDate,
                    endDate: parsedEndDate,
                    page: currentPage,
                    limit: itemsPerPage,
                    includeItems: includeItems === 'true',
                    search: search as string,
                }
            );

            BaseController.sendResponse(res, 200, true, 'Sales retrieved successfully', {
                sales: result.sales,
                pagination: {
                    currentPage,
                    totalPages: result.totalPages,
                    totalItems: result.total,
                    itemsPerPage
                }
            });
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to list sales', undefined, error.message);
        }
    }

    /**
     * Void a sale
     * Uses activeBranchId for branch switching support
     */
    static async voidSale(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { saleId } = req.params;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            const sale = await SaleService.voidSale(
                saleId as string,
                req.auth.tenantId,
                branchId,
                req.body
            );

            BaseController.sendResponse(res, 200, true, 'Sale voided successfully', sale);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to void sale', undefined, error.message);
        }
    }

    /**
     * Get sales summary
     * Uses activeBranchId for branch switching support
     */
    static async getSummaries(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { status, userId, terminalId, paymentMethodId, startDate, endDate } = req.query;
            const branchId = req.auth.activeBranchId || req.auth.branchId;

            // Validate and map status
            const validStatus = mapSaleStatus(status as string);
            if (status && !validStatus) {
                BaseController.sendResponse(
                    res,
                    400,
                    false,
                    'Invalid status. Valid values: PENDING, COMPLETED, VOIDED, REFUNDED, PARTIALLY_REFUNDED'
                );
                return;
            }

            // Parse dates properly
            let parsedStartDate: Date | undefined;
            let parsedEndDate: Date | undefined;

            if (startDate) {
                const dateStr = startDate.toString();
                parsedStartDate = new Date(dateStr + 'T00:00:00');
            }

            if (endDate) {
                const dateStr = endDate.toString();
                parsedEndDate = new Date(dateStr + 'T00:00:00');
            }

            const result = await SaleService.getSalesSummary(
                req.auth.tenantId,
                branchId,
                {
                    status: validStatus,
                    userId: userId as string,
                    terminalId: terminalId as string,
                    paymentMethodId: paymentMethodId as string,
                    startDate: parsedStartDate,
                    endDate: parsedEndDate,
                }
            );

            BaseController.sendResponse(res, 200, true, 'Sales summaries retrieved successfully', result);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to get sales summaries', undefined, error.message);
        }
    }

    // ==========================================
    // PARKED SALES METHODS
    // ==========================================

    /**
     * Park a sale (create a parked sale)
     */
    static async parkSale(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const branchId = req.auth.activeBranchId || req.auth.branchId;
            const parkedSale = await SaleService.parkSale(req.body, req.auth.tenantId, branchId);
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

            const result = await SaleService.listParkedSales(
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

            const parkedSale = await SaleService.getParkedSaleById(
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

            const parkedSale = await SaleService.updateParkedSale(
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

            const parkedSale = await SaleService.resumeParkedSale(
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

            await SaleService.deleteParkedSale(
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

            const result = await SaleService.getParkedSalesCount(
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
