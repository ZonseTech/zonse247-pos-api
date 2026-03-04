import { ApiResponse } from "network";
import { Request, Response } from "express";
import { Tenant, TenantFormValues } from "tenant";
import { BaseController } from "./base.controller";
import { TenantService } from "../services/tenant.service";

/**
 * @class   TenantController
 * @desc    Handles all tenant-related HTTP requests
 * @extends BaseController
 */
export class TenantController extends BaseController {
    constructor() {
        super()
    }

    /**
     * @method  list
     * @desc    Retrieve a paginated list of all tenants
     * @param   req - Express request object with query parameters
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with tenants array
     * @throws  500 - Internal server error
     */
    static async list(req: Request, res: Response) {
        try {
            const query = req.query;
            const tenants = await TenantService.getAllTenants(query);
            return BaseController.sendResponse(res, 200, true, 'Tenants retrieved successfully', tenants);
        } catch (error: any) {
            return BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    /**
     * @method  store
     * @desc    Create and register a new tenant
     * @param   req - Express request with TenantFormValues body
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with created tenant
     * @throws  400 - Missing required field, invalid email/TIN format
     * @throws  409 - Tenant already exists
     * @throws  500 - Internal server error
     */
    static async store(req: Request<ApiResponse<Tenant>, TenantFormValues>, res: Response) {
        try {
            const newTenant = await TenantService.registerTenant(req.body);
            return BaseController.sendResponse(res, 201, true, 'Tenant created successfully', newTenant);
        } catch (error: any) {
            let statusCode = 500;
            if (error.message.includes('Missing required field') ||
                error.message.includes('Invalid email format') ||
                error.message.includes('Invalid TIN format')) {
                statusCode = 400;
            } else if (error.message.includes('already exists')) {
                statusCode = 409;
            }

            return BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    /**
     * @method  show
     * @desc    Retrieve a single tenant by ID
     * @param   req - Express request with tenantId param
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with tenant data (excludes verificationToken)
     * @throws  400 - Tenant ID is required
     * @throws  404 - Tenant not found
     * @throws  500 - Internal server error
     */
    static async show(req: Request<{ tenantId: string }, ApiResponse<Omit<Tenant, 'verificationToken'>>>, res: Response) {
        try {
            const { tenantId } = req.params;

            if (!tenantId) {
                return BaseController.sendResponse(res, 400, false, 'Tenant ID is required');
            }

            const tenant = await TenantService.getTenantById(tenantId);
            return BaseController.sendResponse(res, 200, true, 'Tenant retrieved successfully', tenant);
        } catch (error: any) {
            const statusCode = error.message.includes('not found') ? 404 : 500;
            return BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    /**
     * @method  update
     * @desc    Update an existing tenant by ID
     * @param   req - Express request with tenantId param and partial TenantFormValues body
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with updated tenant data
     * @throws  400 - Tenant ID is required
     * @throws  404 - Tenant not found
     * @throws  409 - Tenant already exists or failed to update
     * @throws  500 - Internal server error
     */
    static async update(req: Request<{ tenantId: string }, ApiResponse<Omit<Tenant, 'verificationToken'>>, Partial<TenantFormValues>>, res: Response) {
        try {
            const { tenantId } = req.params;
            const updateData = req.body;

            if (!tenantId) {
                return BaseController.sendResponse(res, 400, false, 'Tenant ID is required');
            }

            const updatedTenant = await TenantService.updateTenant(tenantId, updateData);
            return BaseController.sendResponse(res, 200, true, 'Tenant updated successfully', updatedTenant);
        } catch (error: any) {
            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('already exists') || error.message.includes('Failed to update')) {
                statusCode = 409;
            }

            return BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    /**
     * @method  delete
     * @desc    Soft delete a tenant by ID
     * @param   req - Express request with tenantId param
     * @param   res - Express response object
     * @returns Promise<void> - JSON response with deletion status
     * @throws  400 - Tenant ID is required
     * @throws  404 - Tenant not found
     * @throws  500 - Internal server error
     */
    static async delete(req: Request<{ tenantId: string }, ApiResponse<{ status: boolean }>>, res: Response) {
        try {
            const { tenantId } = req.params;

            if (!tenantId) {
                return BaseController.sendResponse(res, 400, false, 'Tenant ID is required');
            }

            const result = await TenantService.deleteTenant(tenantId);
            return BaseController.sendResponse(res, 200, true, 'Tenant deleted successfully', result);
        } catch (error: any) {
            const statusCode = error.message.includes('not found') ? 404 : 500;
            return BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }
}