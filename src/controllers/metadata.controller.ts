import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { MetadataService } from "../services/metadata.service";

export class MetadataController extends BaseController {

    /**
     * Sync roles metadata from external API
     */
    static async syncRoles(req: Request, res: Response): Promise<void> {
        try {
            const params = req.body;
            const result = await MetadataService.syncRoles(params);
            BaseController.sendResponse(res, 200, true, 'Roles metadata synced successfully', result);
        } catch (error: any) {
            console.error('Error syncing roles metadata:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    /**
     * Sync permissions metadata from external API
     */
    static async syncPermissions(req: Request, res: Response): Promise<void> {
        try {
            const params = req.body;
            const result = await MetadataService.syncPermissions(params);
            BaseController.sendResponse(res, 200, true, 'Permissions metadata synced successfully', result);
        } catch (error: any) {
            console.error('Error syncing permissions metadata:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    /**
     * Sync role-permissions metadata from external API
     */
    static async syncRolePermissions(req: Request, res: Response): Promise<void> {
        try {
            const params = req.body;
            const result = await MetadataService.syncRolePermissions(params);
            BaseController.sendResponse(res, 200, true, 'Role-permissions metadata synced successfully', result);
        } catch (error: any) {
            console.error('Error syncing role-permissions metadata:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    /**
     * Sync default user metadata from external API
     */
    static async syncDefaultUser(req: Request, res: Response): Promise<void> {
        try {
            const params = req.body;
            const result = await MetadataService.syncDefaultUser(params);
            BaseController.sendResponse(res, 200, true, 'Default user metadata synced successfully', result);
        } catch (error: any) {
            console.error('Error syncing default user metadata:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    /**
     * Sync customer metadata from external API
     */
    static async syncCustomer(req: Request, res: Response): Promise<void> {
        try {
            const params = req.body;
            const result = await MetadataService.syncCustomer(params);
            BaseController.sendResponse(res, 200, true, 'Customer metadata synced successfully', result);
        } catch (error: any) {
            console.error('Error syncing customer metadata:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    /**
     * Sync category metadata from external API
     */
    static async syncCategory(req: Request, res: Response): Promise<void> {
        try {
            const params = req.body;
            const result = await MetadataService.syncCategory(params);
            BaseController.sendResponse(res, 200, true, 'Category metadata synced successfully', result);
        } catch (error: any) {
            console.error('Error syncing category metadata:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    /**
     * Sync subscription plans metadata from external API
     */
    static async syncSubscriptionPlans(req: Request, res: Response): Promise<void> {
        try {
            const params = req.body;
            const result = await MetadataService.syncSubscriptionPlans(params);
            BaseController.sendResponse(res, 200, true, 'Subscription plans metadata synced successfully', result);
        } catch (error: any) {
            console.error('Error syncing subscription plans metadata:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    /**
     * Sync tenant subscription metadata from external API
     */
    static async syncTenantSubscription(req: Request, res: Response): Promise<void> {
        try {
            const params = req.body;
            const result = await MetadataService.syncTenantSubscription(params);
            BaseController.sendResponse(res, 200, true, 'Tenant subscription metadata synced successfully', result);
        } catch (error: any) {
            console.error('Error syncing tenant subscription metadata:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    /**
     * Sync payment methods metadata from external API
     */
    static async syncPaymentMethods(req: Request, res: Response): Promise<void> {
        try {
            const params = req.body;
            const result = await MetadataService.syncPaymentMethods(params);
            BaseController.sendResponse(res, 200, true, 'Payment methods metadata synced successfully', result);
        } catch (error: any) {
            console.error('Error syncing payment methods metadata:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    /**
     * Sync payment service provider metadata from external API
     */
    static async syncPaymentServiceProvider(req: Request, res: Response): Promise<void> {
        try {
            const params = req.body;
            const result = await MetadataService.syncPaymentServiceProvider(params);
            BaseController.sendResponse(res, 200, true, 'Payment service provider metadata synced successfully', result);
        } catch (error: any) {
            console.error('Error syncing payment service provider metadata:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    /**
     * Sync all metadata from external API
     */
    static async syncAll(req: Request, res: Response): Promise<void> {
        try {
            const params = req.body;
            const result = await MetadataService.syncAllMetadata(params);
            BaseController.sendResponse(res, 200, true, 'All metadata synced successfully', result);
        } catch (error: any) {
            console.error('Error syncing all metadata:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    /**
     * Get metadata sync status
     */
    static async getStatus(req: Request, res: Response): Promise<void> {
        try {
            const params = req.body;
            const status = await MetadataService.getSyncStatus(params);
            BaseController.sendResponse(res, 200, true, 'Metadata sync status retrieved successfully', status);
        } catch (error: any) {
            console.error('Error getting metadata sync status:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }
}