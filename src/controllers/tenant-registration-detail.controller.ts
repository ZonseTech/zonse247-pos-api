import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { TenantRegistrationDetailModel, TenantRegistrationDetail } from "../models/tenant-registration-detail.model";

export class TenantRegistrationDetailController extends BaseController {
    /**
     * List all tenant registration details
     * GET /tenant-registration-details
     */
    static async list(req: Request, res: Response): Promise<void> {
        try {
            const { processed, tenantId, email } = req.query;

            let details: TenantRegistrationDetail[];

            if (tenantId) {
                details = await TenantRegistrationDetailModel.findByTenantId(tenantId as string);
            } else if (email) {
                details = await TenantRegistrationDetailModel.findByEmail(email as string);
            } else if (processed === 'false') {
                details = await TenantRegistrationDetailModel.findUnprocessed();
            } else {
                // Get all - we need to add this method
                details = await TenantRegistrationDetailModel.findAll();
            }

            return BaseController.sendResponse(
                res,
                200,
                true,
                'Tenant registration details retrieved successfully',
                details
            );
        } catch (error: any) {
            console.error('Error retrieving tenant registration details:', error);
            return BaseController.sendResponse(
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
     * Get a single tenant registration detail by ID
     * GET /tenant-registration-details/:detailId
     */
    static async show(req: Request, res: Response): Promise<void> {
        try {
            const { detailId } = req.params;

            if (!detailId) {
                return BaseController.sendResponse(res, 400, false, 'Detail ID is required');
            }

            const detail = await TenantRegistrationDetailModel.findById(detailId as string);

            if (!detail) {
                return BaseController.sendResponse(res, 404, false, 'Registration detail not found');
            }

            return BaseController.sendResponse(
                res,
                200,
                true,
                'Tenant registration detail retrieved successfully',
                detail
            );
        } catch (error: any) {
            console.error('Error retrieving tenant registration detail:', error);
            return BaseController.sendResponse(
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
     * Mark a registration detail as processed
     * PUT /tenant-registration-details/:detailId/mark-processed
     */
    static async markAsProcessed(req: Request, res: Response): Promise<void> {
        try {
            const { detailId } = req.params;

            if (!detailId) {
                return BaseController.sendResponse(res, 400, false, 'Detail ID is required');
            }

            const detail = await TenantRegistrationDetailModel.markAsProcessed(detailId as string);

            if (!detail) {
                return BaseController.sendResponse(res, 404, false, 'Registration detail not found');
            }

            return BaseController.sendResponse(
                res,
                200,
                true,
                'Registration detail marked as processed',
                detail
            );
        } catch (error: any) {
            console.error('Error marking registration detail as processed:', error);
            return BaseController.sendResponse(
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
     * Delete a registration detail
     * DELETE /tenant-registration-details/:detailId
     */
    static async delete(req: Request, res: Response): Promise<void> {
        try {
            const { detailId } = req.params;

            if (!detailId) {
                return BaseController.sendResponse(res, 400, false, 'Detail ID is required');
            }

            const deleted = await TenantRegistrationDetailModel.delete(detailId as string);

            if (!deleted) {
                return BaseController.sendResponse(res, 404, false, 'Registration detail not found');
            }

            return BaseController.sendResponse(
                res,
                200,
                true,
                'Registration detail deleted successfully'
            );
        } catch (error: any) {
            console.error('Error deleting registration detail:', error);
            return BaseController.sendResponse(
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
