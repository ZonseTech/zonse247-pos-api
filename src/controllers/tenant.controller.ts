import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { TenantService } from "../services/tenant.service";
import { BranchService } from "../services/branch.service";
import { ApiResponse } from "network";
import { MsonkhoOnlineStatus, Tenant, TenantFormValues, VerifyTenantRequest } from "tenant";

export class TenantController extends BaseController {
    constructor() {
        super()
    }

    static async list(req: Request, res: Response): Promise<void> {
        try {
            const query = req.query;
            const tenants = await TenantService.getAllTenants(query);
            return BaseController.sendResponse(res, 200, true, 'Tenants retrieved successfully', tenants);
        } catch (error: any) {
            console.error('Error retrieving tenants:', error);
            return BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async store(req: Request<ApiResponse<Tenant>, TenantFormValues>, res: Response): Promise<void> {
        try {
            const newTenant = await TenantService.registerTenant(req.body);
            return BaseController.sendResponse(res, 201, true, 'Tenant created successfully', newTenant);
        } catch (error: any) {
            console.error('Error creating tenant:', error);

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

    static async show(req: Request<{ tenantId: string }, ApiResponse<Omit<Tenant, 'verificationToken'>>>, res: Response): Promise<void> {
        try {
            const { tenantId } = req.params;

            if (!tenantId) {
                return BaseController.sendResponse(res, 400, false, 'Tenant ID is required');
            }

            const tenant = await TenantService.getTenantById(tenantId);
            return BaseController.sendResponse(res, 200, true, 'Tenant retrieved successfully', tenant);
        } catch (error: any) {
            console.error('Error retrieving tenant:', error);

            const statusCode = error.message.includes('not found') ? 404 : 500;
            return BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async showByCode(req: Request<{ tenantCode: string }, ApiResponse<Omit<Tenant, 'verificationToken'>>>, res: Response): Promise<void> {
        try {
            const { tenantCode } = req.params;

            if (!tenantCode) {
                return BaseController.sendResponse(res, 400, false, 'Tenant code is required');
            }

            const tenant = await TenantService.getTenantByCode(tenantCode);
            return BaseController.sendResponse(res, 200, true, 'Tenant retrieved successfully', tenant);
        } catch (error: any) {
            console.error('Error retrieving tenant:', error);

            const statusCode = error.message.includes('not found') ? 404 : 500;
            return BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async delete(req: Request<{ id: string }, ApiResponse<{ status: boolean }>>, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                return BaseController.sendResponse(res, 400, false, 'Tenant ID is required');
            }

            const result = await TenantService.deleteTenant(id);
            return BaseController.sendResponse(res, 200, true, 'Tenant deleted successfully', result);
        } catch (error: any) {
            console.error('Error deleting tenant:', error);

            const statusCode = error.message.includes('not found') ? 404 : 500;
            return BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async update(req: Request<{ id: string }, ApiResponse<Omit<Tenant, 'verificationToken'>>, Partial<TenantFormValues>>, res: Response): Promise<void> {
        try {
            const tenantId = req.params.id;
            const updateData = req.body;

            if (!tenantId) {
                return BaseController.sendResponse(res, 400, false, 'Tenant ID is required');
            }

            const updatedTenant = await TenantService.updateTenant(tenantId, updateData);
            return BaseController.sendResponse(res, 200, true, 'Tenant updated successfully', updatedTenant);
        } catch (error: any) {
            console.error('Error updating tenant:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('already exists') || error.message.includes('Failed to update')) {
                statusCode = 409;
            }

            return BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async verify(req: Request<ApiResponse<Omit<Tenant, 'verificationToken'>>, VerifyTenantRequest>, res: Response): Promise<void> {
        try {
            const { verificationToken: encryptedVerificationToken } = req.body;

            if (!encryptedVerificationToken) {
                return BaseController.sendResponse(res, 400, false, 'Verification token is required');
            }

            const safeTenantData = await TenantService.verifyTenant(encryptedVerificationToken);
            return BaseController.sendResponse(res, 200, true, 'Tenant verified successfully', safeTenantData);
        } catch (error: any) {
            console.error('Error verifying tenant:', error);

            const statusCode = error.message.includes('Invalid credentials') ? 401 : 500;
            return BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async verifyTenantAccount(req: Request<ApiResponse<Omit<Tenant, 'verificationToken'>>, VerifyTenantRequest>, res: Response): Promise<void> {
        try {
            const { verificationToken: encryptedVerificationToken } = req.body;

            if (!encryptedVerificationToken) {
                return BaseController.sendResponse(res, 400, false, 'Verification token is required');
            }

            const safeTenantData = await TenantService.verifyTenantAccount(encryptedVerificationToken);
            return BaseController.sendResponse(res, 200, true, 'Tenant verified successfully', safeTenantData);
        } catch (error: any) {
            console.error('Error verifying tenant:', error);

            const statusCode = error.message.includes('Invalid credentials') ? 401 : 500;
            return BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async getTenantBranches(req: Request<{ tenantId: string }>, res: Response): Promise<void> {
        try {
            const { tenantId } = req.params;

            if (!tenantId) {
                return BaseController.sendResponse(res, 400, false, 'Tenant ID is required');
            }

            const branches = await BranchService.getBranchesByTenantId(tenantId);
            return BaseController.sendResponse(res, 200, true, 'Tenant branches retrieved successfully', branches);
        } catch (error: any) {
            console.error('Error fetching tenant branches:', error);
            return BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async getTenantAccountBranches(req: Request<{ tenantId: string }>, res: Response): Promise<void> {
        try {
            const { tenantId } = req.params;

            if (!tenantId) {
                return BaseController.sendResponse(res, 400, false, 'Tenant ID is required');
            }

            const branches = await BranchService.getAccountBranchesByTenantId(tenantId);
            return BaseController.sendResponse(res, 200, true, 'Tenant branches retrieved successfully', branches);
        } catch (error: any) {
            console.error('Error fetching tenant branches:', error);
            return BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async getOnboardingStatus(req: Request<{ tenantId: string }>, res: Response): Promise<void> {
        try {
            const { tenantId } = req.params;

            if (!tenantId) {
                return BaseController.sendResponse(res, 400, false, 'Tenant ID is required');
            }

            const onboardingStatus = await TenantService.getOnboardingStatus(tenantId);
            return BaseController.sendResponse(res, 200, true, 'Onboarding status retrieved successfully', onboardingStatus);
        } catch (error: any) {
            console.error('Error retrieving onboarding status:', error);

            const statusCode = error.message.includes('not found') ? 404 : 500;
            return BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async resendWelcomeEmail(req: Request<{ tenantId: string }>, res: Response): Promise<void> {
        try {
            const { tenantId } = req.params;

            if (!tenantId) {
                return BaseController.sendResponse(res, 400, false, 'Tenant ID is required');
            }

            const result = await TenantService.resendWelcomeEmail(tenantId);
            return BaseController.sendResponse(res, 200, true, 'Welcome email resent successfully', { sent: result });
        } catch (error: any) {
            console.error('Error resending welcome email:', error);

            const statusCode = error.message.includes('not found') ? 404 : 500;
            return BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async updateMsonkhoStatus(req: Request<{ tenantId: string }, ApiResponse<Omit<Tenant, 'verificationToken'>>, { status: MsonkhoOnlineStatus }>, res: Response): Promise<void> {
        try {
            const { tenantId } = req.params;
            const { status } = req.body;

            if (!tenantId) {
                return BaseController.sendResponse(res, 400, false, 'Tenant ID is required');
            }

            if (!status || !['VERIFIED', 'PENDING', 'FAILED'].includes(status)) {
                return BaseController.sendResponse(res, 400, false, 'Valid Msonkho status is required');
            }

            const updatedTenant = await TenantService.updateMsonkhoStatus(tenantId, status);
            return BaseController.sendResponse(res, 200, true, 'Msonkho status updated successfully', updatedTenant);
        } catch (error: any) {
            console.error('Error updating Msonkho status:', error);

            const statusCode = error.message.includes('not found') ? 404 : 500;
            return BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }
}