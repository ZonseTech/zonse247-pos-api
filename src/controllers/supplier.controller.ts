import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { SupplierService } from '../services/supplier.service';
import { AuthRequest } from '../lib/express.type';

export class SupplierController extends BaseController {
    /**
     * Create a new supplier
     */
    static async createSupplier(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const supplier = await SupplierService.createSupplier(req.body, req.auth.tenantId, req.auth.branchId);
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
                req.auth.branchId
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
     */
    static async listSuppliers(req: Request & AuthRequest, res: Response): Promise<void> {
        try {
            const { includeInactive } = req.query;
            const page = parseInt(req.query.page as string) || 1;
            const perPage = parseInt(req.query.perPage as string) || 50;

            const { suppliers, total, totalPages } = await SupplierService.listSuppliers(
                req.auth.tenantId,
                req.auth.branchId,
                includeInactive === 'true',
                page,
                perPage
            );

            BaseController.sendResponse(res, 200, true, 'Suppliers retrieved successfully', {
                suppliers,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: total,
                    itemsPerPage: perPage
                }
            });
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
                req.auth.branchId,
                req.body
            );

            BaseController.sendResponse(res, 200, true, 'Supplier updated successfully', supplier);
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to update supplier', undefined, error.message);
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
                req.auth.branchId
            );

            BaseController.sendResponse(res, 200, true, 'Supplier deleted successfully');
        } catch (error: any) {
            BaseController.sendResponse(res, 400, false, 'Failed to delete supplier', undefined, error.message);
        }
    }
}
