import { v4 as uuidv4 } from 'uuid';
import validator from 'validator';
import { CustomerModel } from '../models/customer.model';
import type { Role } from 'role-permission';
import { CreateCustomerData, Customer, SearchConditions, UpdateCustomerData } from 'customer';

export class CustomerService {

    static async selectAll(params): Promise<Array<Role>> {
        return await CustomerModel.findAllByRDBMS(params);
    }

    static async getCustomerById(customerId: string): Promise<Customer | null> {
        if (!customerId) {
            throw new Error('Customer ID is required');
        }

        const sanitizedId = validator.escape(customerId.toString());
        return await CustomerModel.findById(sanitizedId);
    }

    static async getAllCustomers(): Promise<Customer[]> {
        return await CustomerModel.findAll();
    }

    static async createCustomer(customerData: CreateCustomerData): Promise<Customer> {
        if (!customerData.name || customerData.name.trim() === '') {
            throw new Error('Customer name is required');
        }

        if (customerData.email && !validator.isEmail(customerData.email)) {
            throw new Error('Invalid email format');
        }

        const newCustomer: any = {
            customerId: uuidv4(),
            name: validator.escape(customerData.name.trim()),
            tenantId: customerData.tenantId,
            branchId: customerData.branchId,
            userId: customerData.userId,
            synced: 0,
        };

        // Only add optional fields if they have values
        if (customerData.email && customerData.email.trim()) {
            newCustomer.email = validator.normalizeEmail(customerData.email) || customerData.email;
        }

        if (customerData.phone && customerData.phone.trim()) {
            newCustomer.phone = validator.escape(customerData.phone.trim());
        }

        if (customerData.address && customerData.address.trim()) {
            newCustomer.address = validator.escape(customerData.address.trim());
        }

        return await CustomerModel.create(newCustomer);
    }

    static async updateCustomer(customerId: string, updateData: UpdateCustomerData): Promise<boolean> {
        if (!customerId) {
            throw new Error('Customer ID is required for update');
        }

        if (updateData.email && !validator.isEmail(updateData.email)) {
            throw new Error('Invalid email format');
        }

        const sanitizedId = validator.escape(customerId.toString());

        const sanitizedUpdateData: Partial<Customer> = {};

        if (updateData.name !== undefined) {
            if (updateData.name.trim() === '') {
                throw new Error('Customer name cannot be empty');
            }
            sanitizedUpdateData.name = validator.escape(updateData.name.trim());
        }

        if (updateData.email !== undefined) {
            sanitizedUpdateData.email = updateData.email ? validator.normalizeEmail(updateData.email) || undefined : undefined;
        }

        if (updateData.phone !== undefined) {
            sanitizedUpdateData.phone = updateData.phone ? validator.escape(updateData.phone.trim()) : undefined;
        }

        if (updateData.address !== undefined) {
            sanitizedUpdateData.address = updateData.address ? validator.escape(updateData.address.trim()) : undefined;
        }

        await CustomerModel.update(sanitizedId, sanitizedUpdateData);
        return true;
    }

    static async deleteCustomer(customerId: string): Promise<boolean> {
        if (!customerId) {
            throw new Error('Customer ID is required');
        }

        const sanitizedId = validator.escape(customerId.toString());
        await CustomerModel.delete(sanitizedId);
        return true;
    }

    static async getCustomersCount(): Promise<number> {
        return await CustomerModel.count();
    }

    static async searchCustomers(conditions: SearchConditions): Promise<Customer[]> {
        const sanitizedConditions: any = {};

        Object.keys(conditions).forEach(key => {
            if (conditions[key] !== undefined && conditions[key] !== null) {
                if (typeof conditions[key] === 'string') {
                    sanitizedConditions[key] = validator.escape(conditions[key].toString());
                } else {
                    sanitizedConditions[key] = conditions[key];
                }
            }
        });

        return await CustomerModel.find(sanitizedConditions);
    }

    static async getUnsyncedCustomers(): Promise<Customer[]> {
        return await CustomerModel.getUnsyncedRecords();
    }

    static async markCustomerAsSynced(customerId: string): Promise<boolean> {
        if (!customerId) {
            throw new Error('Customer ID is required');
        }

        const sanitizedId = validator.escape(customerId.toString());
        await CustomerModel.markAsSynced(sanitizedId);
        return true;
    }

    static async validateCustomerExists(customerId: string): Promise<boolean> {
        const customer = await this.getCustomerById(customerId);
        return customer !== null;
    }
}