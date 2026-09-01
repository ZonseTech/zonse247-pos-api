import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { SaleService } from '../services/sale.service';
import { AuthRequest } from '../lib/express.type';
import { AuditService, getAuditContext } from '../services/audit.service';

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
     * Get value from body, fallback to auth
     */
    private static getValue(bodyValue: any, authValue: any): string {
        // Use body value if it exists and is not empty string
        if (bodyValue !== undefined && bodyValue !== null && bodyValue !== '') {
            return bodyValue;
        }
        return authValue;
    }

    /**
     * Get auth values with activeBranchId fallback
     */
    private static getAuthValues(auth: any): { tenantId: string; branchId: string } {
        return {
            tenantId: auth.tenantId,
            branchId: auth.activeBranchId || auth.currentBranchId || auth.branchId,
        };
    }

    /**
     * Create a sale
     * Takes tenantId, branchId, userId from body if provided, otherwise from auth
     */
    static async createSale(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const tenantId = SaleController.getValue(req.body.tenantId, req.auth.tenantId);
            const branchId = SaleController.getValue(req.body.branchId, req.auth.activeBranchId || req.auth.currentBranchId || req.auth.branchId);
            const userId = SaleController.getValue(req.body.userId, req.auth.userId);

            const sale = await SaleService.createSale(req.body, tenantId, branchId, userId);

            AuditService.logCreate(getAuditContext(req), 'Sale', (sale as any).saleId || '', (sale as any).receiptNumber || 'Sale', { totalAmount: (sale as any).totalAmount });

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
            const { tenantId, branchId } = SaleController.getAuthValues(req.auth);

            const sale = await SaleService.getSaleById(saleId as string, tenantId, branchId);

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
            const { tenantId, branchId } = SaleController.getAuthValues(req.auth);

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

            const itemsPerPage = perPage ? parseInt(perPage as string) : (limit ? parseInt(limit as string) : 50);
            const currentPage = page ? parseInt(page as string) : 1;

            const result = await SaleService.listSales(
                tenantId,
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
            const { tenantId, branchId } = SaleController.getAuthValues(req.auth);

            const sale = await SaleService.voidSale(saleId as string, tenantId, branchId, req.body);

            AuditService.logStatusChange(getAuditContext(req), 'void', 'Sale', saleId as string, saleId as string, 'COMPLETED', 'VOIDED', { reason: req.body.reason });

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
            const { tenantId, branchId } = SaleController.getAuthValues(req.auth);

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
                tenantId,
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

    /**
     * Get the day close report (units sold, revenue, cost of sales, gross
     * profit, expenses, net profit per day)
     */
    static async getDayCloseReport(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { startDate, endDate } = req.query;
            const { tenantId, branchId } = SaleController.getAuthValues(req.auth);

            let parsedStartDate: Date | undefined;
            let parsedEndDate: Date | undefined;

            if (startDate) {
                parsedStartDate = new Date(startDate.toString() + 'T00:00:00');
            }

            if (endDate) {
                parsedEndDate = new Date(endDate.toString() + 'T00:00:00');
            }

            const result = await SaleService.getDayCloseReport(tenantId, branchId, {
                startDate: parsedStartDate,
                endDate: parsedEndDate,
            });

            BaseController.sendResponse(res, 200, true, 'Day close report retrieved successfully', result);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to get day close report', undefined, error.message);
        }
    }

    /**
     * Get the day close report totals (Total Revenue, Cost of Sales, Gross
     * Profit, Net Profit) across the requested date range
     */
    static async getDayCloseReportSummary(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { startDate, endDate } = req.query;
            const { tenantId, branchId } = SaleController.getAuthValues(req.auth);

            let parsedStartDate: Date | undefined;
            let parsedEndDate: Date | undefined;

            if (startDate) {
                parsedStartDate = new Date(startDate.toString() + 'T00:00:00');
            }

            if (endDate) {
                parsedEndDate = new Date(endDate.toString() + 'T00:00:00');
            }

            const result = await SaleService.getDayCloseReportSummary(tenantId, branchId, {
                startDate: parsedStartDate,
                endDate: parsedEndDate,
            });

            BaseController.sendResponse(res, 200, true, 'Day close report summary retrieved successfully', result);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to get day close report summary', undefined, error.message);
        }
    }
}
