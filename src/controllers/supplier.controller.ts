import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { SupplierService } from '../services/supplier.service';
import { AuthRequest } from '../lib/express.type';
import { AuditService, getAuditContext } from '../services/audit.service';
import { parsePaginationParams, buildPaginationMeta } from '../utils/pagination.utils';

export class SupplierController extends BaseController {
    /**
     * Create a new supplier
     */
    static async createSupplier(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const supplier = await SupplierService.createSupplier(req.body, req.auth.tenantId, req.auth.activeBranchId || req.auth.branchId);

            AuditService.logCreate(getAuditContext(req), 'Supplier', (supplier as any).supplierId || '', (supplier as any).name || req.body.name || '', req.body);

            BaseController.sendResponse(res, 201, true, 'Supplier created successfully', supplier);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to create supplier', undefined, error.message);
        }
    }

    /**
     * Get supplier by ID
     */
    static async getSupplier(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { supplierId } = req.params;

            const supplier = await SupplierService.getSupplierById(
                supplierId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );

            if (!supplier) {
                BaseController.sendResponse(res, 404, false, 'Supplier not found');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Supplier retrieved successfully', supplier);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to get supplier', undefined, error.message);
        }
    }

    /**
     * List all suppliers
     * @query page            - Page number (default 1)
     * @query perPage|limit   - Items per page (default 50, max 500)
     * @query search          - Search by name, contact person, email, or phone
     * @query status          - Filter by status: ACTIVE, INACTIVE, SUSPENDED
     * @query includeInactive - Include inactive suppliers (true/false)
     * @query startDate       - Filter by creation date (from)
     * @query endDate         - Filter by creation date (to)
     */
    static async listSuppliers(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const pagination = parsePaginationParams(req.query);
            const includeInactive = req.query.includeInactive === 'true';
            const search = req.query.search as string | undefined;
            const status = req.query.status as string | undefined;
            const startDate = req.query.startDate as string | undefined;
            const endDate = req.query.endDate as string | undefined;

            const { suppliers, total } = await SupplierService.listSuppliers(
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                {
                    includeInactive,
                    search,
                    status,
                    startDate,
                    endDate,
                    skip: pagination.skip,
                    limit: pagination.limit,
                },
            );

            BaseController.sendPaginated(
                res,
                'Suppliers retrieved successfully',
                suppliers,
                buildPaginationMeta(total, pagination.page, pagination.limit),
                'suppliers',
            );
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to list suppliers', undefined, error.message);
        }
    }

    /**
     * Update supplier
     */
    static async updateSupplier(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { supplierId } = req.params;

            const supplier = await SupplierService.updateSupplier(
                supplierId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
                req.body
            );

            AuditService.logUpdate(getAuditContext(req), 'Supplier', supplierId as string, (supplier as any).name || supplierId as string, undefined, req.body);

            BaseController.sendResponse(res, 200, true, 'Supplier updated successfully', supplier);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to update supplier', undefined, error.message);
        }
    }

    /**
     * Products historically supplied by this supplier (aggregated from purchase order history)
     */
    static async getSupplierProducts(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { supplierId } = req.params;

            const products = await SupplierService.getSupplierProductHistory(
                supplierId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId,
            );

            BaseController.sendResponse(res, 200, true, 'Supplier product history retrieved successfully', products);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to get supplier product history', undefined, error.message);
        }
    }

    /**
     * Delete (deactivate) supplier
     */
    static async deleteSupplier(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { supplierId } = req.params;

            await SupplierService.deleteSupplier(
                supplierId as string,
                req.auth.tenantId,
                req.auth.activeBranchId || req.auth.branchId
            );

            AuditService.logDelete(getAuditContext(req), 'Supplier', supplierId as string, supplierId as string);

            BaseController.sendResponse(res, 200, true, 'Supplier deleted successfully');
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to delete supplier', undefined, error.message);
        }
    }
}
