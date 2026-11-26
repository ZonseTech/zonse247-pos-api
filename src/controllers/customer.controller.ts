import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { CustomerService } from '../services/customer.service';
import { CreateCustomerData, SearchConditions, UpdateCustomerData } from 'customer';
import { parsePaginationParams } from '../utils/pagination.utils';
import { AuditService, getAuditContext } from '../services/audit.service';

export class CustomerController extends BaseController {

    private static getTenantId(req: Request): string {
        const tenantId = (req as any).auth?.tenantId;
        if (!tenantId) {
            throw new Error('Tenant context is required');
        }
        return tenantId;
    }

    private static getBranchId(req: Request): string | undefined {
        const auth = (req as any).auth;
        return auth?.activeBranchId || auth?.currentBranchId || auth?.branchId;
    }

    static async selectAll(req: Request, res: Response): Promise<void> {
        try {
            const params = req.body;
            const customers = await CustomerService.selectAll(params);
            BaseController.sendResponse(res, 200, true, 'Customers retrieved successfully', customers);
        } catch (error: any) {
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async getById(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = CustomerController.getTenantId(req);
            const branchId = CustomerController.getBranchId(req);
            const { customerId } = req.params;

            if (!customerId) {
                return BaseController.sendBadRequest(res, 'Customer ID is required');
            }

            const customer = await CustomerService.getCustomerById(customerId as string, tenantId, branchId);

            if (!customer) {
                return BaseController.sendNotFound(res, 'Customer not found');
            }

            BaseController.sendSuccess(res, 'Customer retrieved successfully', customer);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            BaseController.sendServerError(res, 'Failed to retrieve customer', errorMessage);
        }
    }

    static async list(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = CustomerController.getTenantId(req);
            const branchId = CustomerController.getBranchId(req);
            const pagination = parsePaginationParams(req.query);
            const result = await CustomerService.listCustomers(tenantId, branchId, pagination);
            BaseController.sendPaginated(res, 'Customers retrieved successfully', result.data, result.pagination, 'customers');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            BaseController.sendServerError(res, 'Failed to retrieve customers', errorMessage);
        }
    }

    static async create(req: Request, res: Response): Promise<void> {
        try {
            const auth = (req as any).auth;
            const tenantId = CustomerController.getTenantId(req);
            const branchId = CustomerController.getBranchId(req);
            const { name, email, phone, address, isDefault } = req.body;

            const customerData: CreateCustomerData = {
                name,
                email: email || undefined,
                phone: phone || undefined,
                address: address || undefined,
                isDefault,
                tenantId,
                branchId,
                userId: auth?.userId || undefined,
            };

            if (!customerData.name || customerData.name.trim() === '') {
                return BaseController.sendBadRequest(res, 'Customer name is required');
            }

            const newCustomer = await CustomerService.createCustomer(customerData);

            AuditService.logCreate(getAuditContext(req), 'Customer', (newCustomer as any).customerId || '', customerData.name, customerData as any);

            BaseController.sendCreated(res, 'Customer created successfully', newCustomer);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

            if (errorMessage.includes('email') || errorMessage.includes('required')) {
                BaseController.sendBadRequest(res, errorMessage);
            } else {
                BaseController.sendServerError(res, 'Failed to create customer', errorMessage);
            }
        }
    }

    static async update(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = CustomerController.getTenantId(req);
            const branchId = CustomerController.getBranchId(req);
            const updateData: UpdateCustomerData = req.body;
            const { customerId } = req.params;

            if (!customerId) {
                return BaseController.sendBadRequest(res, 'Customer ID is required for update');
            }

            const success = await CustomerService.updateCustomer(customerId as string, tenantId, updateData, branchId);

            if (!success) {
                return BaseController.sendNotFound(res, 'Customer not found');
            }

            AuditService.logUpdate(getAuditContext(req), 'Customer', customerId as string, customerId as string, undefined, updateData as Record<string, unknown>);

            BaseController.sendSuccess(res, 'Customer updated successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

            if (errorMessage.includes('email') || errorMessage.includes('required') || errorMessage.includes('empty')) {
                BaseController.sendBadRequest(res, errorMessage);
            } else {
                BaseController.sendServerError(res, 'Failed to update customer', errorMessage);
            }
        }
    }

    static async delete(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = CustomerController.getTenantId(req);
            const branchId = CustomerController.getBranchId(req);
            const { customerId } = req.params;

            if (!customerId) {
                return BaseController.sendBadRequest(res, 'Customer ID is required');
            }

            const success = await CustomerService.deleteCustomer(customerId as string, tenantId, branchId);

            if (!success) {
                return BaseController.sendNotFound(res, 'Customer not found');
            }

            AuditService.logDelete(getAuditContext(req), 'Customer', customerId as string, customerId as string);

            BaseController.sendSuccess(res, 'Customer deleted successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            BaseController.sendServerError(res, 'Failed to delete customer', errorMessage);
        }
    }

    static async count(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = CustomerController.getTenantId(req);
            const branchId = CustomerController.getBranchId(req);
            const count = await CustomerService.getCustomersCount(tenantId, branchId);
            BaseController.sendSuccess(res, 'Customer count retrieved successfully', { count });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            BaseController.sendServerError(res, 'Failed to get customer count', errorMessage);
        }
    }

    static async search(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = CustomerController.getTenantId(req);
            const branchId = CustomerController.getBranchId(req);
            const conditions: SearchConditions = req.body.conditions || {};
            const customers = await CustomerService.searchCustomers(tenantId, branchId, conditions);
            BaseController.sendSuccess(res, 'Customer search completed successfully', customers);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            BaseController.sendServerError(res, 'Failed to search customers', errorMessage);
        }
    }
}