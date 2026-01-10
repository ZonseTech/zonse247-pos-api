import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { CustomerService } from '../services/customer.service';
import { CreateCustomerData, SearchConditions, UpdateCustomerData } from 'customer';

export class CustomerController extends BaseController {

    static async selectAll(req: Request, res: Response): Promise<void> {
        try {
            const params = req.body;
            const customers = await CustomerService.selectAll(params);
            BaseController.sendResponse(res, 200, true, 'Customers retrieved successfully', customers);
        } catch (error: any) {
            console.error('Error fetching roles:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async getById(req: Request, res: Response): Promise<void> {
        try {
            const { customerId } = req.params;

            if (!customerId) {
                return BaseController.sendBadRequest(res, 'Customer ID is required');
            }

            const customer = await CustomerService.getCustomerById(customerId as string);

            if (!customer) {
                return BaseController.sendNotFound(res, 'Customer not found');
            }

            BaseController.sendSuccess(res, 'Customer retrieved successfully', customer);
        } catch (error) {
            console.error('BaseController.getById error:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            BaseController.sendServerError(res, 'Failed to retrieve customer', errorMessage);
        }
    }

    static async list(req: Request, res: Response): Promise<void> {
        try {
            const customers = await CustomerService.getAllCustomers();
            BaseController.sendSuccess(res, 'Customers retrieved successfully', customers);
        } catch (error) {
            console.error('BaseController.list error:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            BaseController.sendServerError(res, 'Failed to retrieve customers', errorMessage);
        }
    }

    static async create(req: Request, res: Response): Promise<void> {
        try {
            const customerData: CreateCustomerData = {
                ...req.body,
                tenantId: (req as any).auth?.tenantId || '',
                branchId: (req as any).auth?.branchId || '',
                userId: (req as any).auth?.userId || '',
            };

            if (!customerData.name || customerData.name.trim() === '') {
                return BaseController.sendBadRequest(res, 'Customer name is required');
            }

            const newCustomer = await CustomerService.createCustomer(customerData);

            BaseController.sendCreated(res, 'Customer created successfully', newCustomer);
        } catch (error) {
            console.error('BaseController.create error:', error);
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
            const updateData: UpdateCustomerData = req.body;
            const { customerId } = req.params;

            if (!customerId) {
                return BaseController.sendBadRequest(res, 'Customer ID is required for update');
            }

            const success = await CustomerService.updateCustomer(customerId as string, updateData);

            if (!success) {
                return BaseController.sendNotFound(res, 'Customer not found');
            }

            BaseController.sendSuccess(res, 'Customer updated successfully');
        } catch (error) {
            console.error('BaseController.update error:', error);
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
            const { customerId } = req.params;

            if (!customerId) {
                return BaseController.sendBadRequest(res, 'Customer ID is required');
            }

            const success = await CustomerService.deleteCustomer(customerId as string);

            if (!success) {
                return BaseController.sendNotFound(res, 'Customer not found');
            }

            BaseController.sendSuccess(res, 'Customer deleted successfully');
        } catch (error) {
            console.error('BaseController.delete error:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            BaseController.sendServerError(res, 'Failed to delete customer', errorMessage);
        }
    }

    static async count(req: Request, res: Response): Promise<void> {
        try {
            const count = await CustomerService.getCustomersCount();
            BaseController.sendSuccess(res, 'Customer count retrieved successfully', { count });
        } catch (error) {
            console.error('BaseController.count error:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            BaseController.sendServerError(res, 'Failed to get customer count', errorMessage);
        }
    }

    static async search(req: Request, res: Response): Promise<void> {
        try {
            const conditions: SearchConditions = req.body.conditions || {};
            const customers = await CustomerService.searchCustomers(conditions);
            BaseController.sendSuccess(res, 'Customer search completed successfully', customers);
        } catch (error) {
            console.error('BaseController.search error:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            BaseController.sendServerError(res, 'Failed to search customers', errorMessage);
        }
    }

    static async getUnsynced(req: Request, res: Response): Promise<void> {
        try {
            const unsyncedCustomers = await CustomerService.getUnsyncedCustomers();
            BaseController.sendSuccess(res, 'Unsynced customers retrieved successfully', unsyncedCustomers);
        } catch (error) {
            console.error('BaseController.getUnsynced error:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            BaseController.sendServerError(res, 'Failed to retrieve unsynced customers', errorMessage);
        }
    }

    static async markSynced(req: Request, res: Response): Promise<void> {
        try {
            const { customerId } = req.params;

            if (!customerId) {
                return BaseController.sendBadRequest(res, 'Customer ID is required');
            }

            const success = await CustomerService.markCustomerAsSynced(customerId as string);

            if (!success) {
                return BaseController.sendNotFound(res, 'Customer not found');
            }

            BaseController.sendSuccess(res, 'Customer marked as synced successfully');
        } catch (error) {
            console.error('BaseController.markSynced error:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            BaseController.sendServerError(res, 'Failed to mark customer as synced', errorMessage);
        }
    }
}