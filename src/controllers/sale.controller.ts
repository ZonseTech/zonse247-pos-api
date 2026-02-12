import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { SaleService } from '../services/sale.service';
import { AuthRequest } from '../lib/express.type';

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

/**
 * Validate and map status to valid SaleStatus enum
 * Returns mapped status or undefined if status is not provided or invalid
 */
function mapSaleStatus(status: string | undefined): string | undefined {
    if (!status) return undefined;
    const statusUpper = status.toString().toUpperCase();
    return VALID_SALE_STATUSES[statusUpper];
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
}
