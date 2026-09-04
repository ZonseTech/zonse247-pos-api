import { v4 as uuidv4 } from 'uuid';
import validator from 'validator';
import { CustomerModel } from '../models/customer.model';
import { CreateCustomerData, Customer, SearchConditions, UpdateCustomerData } from 'customer';
import prisma from '../databases/prisma/client';
import { PaginationParams, buildPaginationMeta, PaginatedResult } from '../utils/pagination.utils';

export class CustomerService {

    static async selectAll(params): Promise<Array<Customer>> {
        return await CustomerModel.findAllByRDBMS(params);
    }

    static async getCustomerById(customerId: string, tenantId: string, branchId?: string): Promise<Customer | null> {
        if (!customerId) {
            throw new Error('Customer ID is required');
        }

        const sanitizedId = validator.escape(customerId.toString());
        return await CustomerModel.findById(sanitizedId, tenantId, branchId);
    }

    static async getAllCustomers(tenantId: string): Promise<Customer[]> {
        return await CustomerModel.findAll(tenantId);
    }

    static async listCustomers(tenantId: string, branchId: string | undefined, pagination: PaginationParams): Promise<PaginatedResult<Customer>> {
        const where = { tenantId, deletedAt: null, ...(branchId && { branchId }) };

        const [customers, total] = await Promise.all([
            prisma.customer.findMany({
                where,
                skip: pagination.skip,
                take: pagination.limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.customer.count({ where }),
        ]);

        return {
            data: customers as unknown as Customer[],
            pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
        };
    }

    static async createCustomer(customerData: CreateCustomerData): Promise<Customer> {
        if (!customerData.name || customerData.name.trim() === '') {
            throw new Error('Customer name is required');
        }

        if (!customerData.tenantId) {
            throw new Error('Tenant ID is required');
        }

        if (customerData.email && !validator.isEmail(customerData.email)) {
            throw new Error('Invalid email format');
        }

        const newCustomer: any = {
            customerId: uuidv4(),
            name: validator.escape(customerData.name.trim()),
            tenantId: customerData.tenantId,
            branchId: customerData.branchId,
            userId: customerData.userId || undefined,
        };

        if (customerData.email && customerData.email.trim()) {
            newCustomer.email = validator.normalizeEmail(customerData.email) || customerData.email;
        }

        if (customerData.phone && customerData.phone.trim()) {
            newCustomer.phone = validator.escape(customerData.phone.trim());
        }

        if (customerData.address && customerData.address.trim()) {
            newCustomer.address = validator.escape(customerData.address.trim());
        }

        if (customerData.isDefault !== undefined) {
            newCustomer.isDefault = customerData.isDefault;
        }

        return await CustomerModel.create(newCustomer);
    }

    static async updateCustomer(customerId: string, tenantId: string, updateData: UpdateCustomerData, branchId?: string): Promise<boolean> {
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

        if (updateData.isDefault !== undefined) {
            sanitizedUpdateData.isDefault = updateData.isDefault;
        }

        await CustomerModel.update(sanitizedId, tenantId, sanitizedUpdateData, branchId);
        return true;
    }

    static async deleteCustomer(customerId: string, tenantId: string, branchId?: string): Promise<boolean> {
        if (!customerId) {
            throw new Error('Customer ID is required');
        }

        const sanitizedId = validator.escape(customerId.toString());
        await CustomerModel.delete(sanitizedId, tenantId, branchId);
        return true;
    }

    static async getCustomersCount(tenantId: string, branchId?: string): Promise<number> {
        return await CustomerModel.count(tenantId, branchId ? { branchId } : {});
    }

    static async searchCustomers(tenantId: string, branchId: string | undefined, conditions: SearchConditions): Promise<Customer[]> {
        const sanitizedConditions: any = {};

        Object.keys(conditions).forEach(key => {
            // Never allow callers to override tenantId/branchId via search conditions
            if (key === 'tenantId' || key === 'branchId') return;
            if (conditions[key] !== undefined && conditions[key] !== null) {
                if (typeof conditions[key] === 'string') {
                    sanitizedConditions[key] = validator.escape(conditions[key].toString());
                } else {
                    sanitizedConditions[key] = conditions[key];
                }
            }
        });

        if (branchId) {
            sanitizedConditions.branchId = branchId;
        }

        return await CustomerModel.find(tenantId, sanitizedConditions);
    }
}