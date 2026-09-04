import { Customer } from 'customer';
import { ValidationParams } from 'on-boarding';
import prisma from '../databases/prisma/client';

export class CustomerModel {
    static async findAllByRDBMS(params: ValidationParams): Promise<Customer[]> {
        try {
            return await prisma.customer.findMany({
                where: {
                    tenantId: params.tenantId,
                    branchId: params.branchId,
                },
            }) as unknown as Array<Customer>;
        } catch (error) {
            throw new Error(
                `Error finding customers: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async findById(customerId: string, tenantId: string, branchId?: string): Promise<Customer | null> {
        try {
            return await prisma.customer.findFirst({
                where: { customerId, tenantId, deletedAt: null, ...(branchId && { branchId }) },
            });
        } catch (error) {
            throw new Error(
                `Error finding customer by ID: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async findAll(tenantId: string): Promise<Customer[]> {
        try {
            return await prisma.customer.findMany({
                where: { tenantId, deletedAt: null },
            });
        } catch (error) {
            throw new Error(
                `Error finding all customers: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async find(tenantId: string, conditions: any = {}): Promise<Customer[]> {
        try {
            return await prisma.customer.findMany({
                where: { tenantId, deletedAt: null, ...conditions },
            });
        } catch (error) {
            throw new Error(
                `Error finding customers: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async create(
        customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<Customer> {
        try {
            return await prisma.customer.create({
                data: customerData,
            });
        } catch (error) {
            throw new Error(
                `Error creating customer: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async update(customerId: string, tenantId: string, updateData: Partial<Customer>, branchId?: string): Promise<Customer> {
        try {
            const customer = await prisma.customer.findFirst({
                where: { customerId, tenantId, deletedAt: null, ...(branchId && { branchId }) },
            });
            if (!customer) {
                throw new Error('Customer not found');
            }
            return await prisma.customer.update({
                where: { customerId },
                data: updateData,
            });
        } catch (error) {
            throw new Error(
                `Error updating customer: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async delete(customerId: string, tenantId: string, branchId?: string): Promise<Customer> {
        try {
            const customer = await prisma.customer.findFirst({
                where: { customerId, tenantId, deletedAt: null, ...(branchId && { branchId }) },
            });
            if (!customer) {
                throw new Error('Customer not found');
            }
            return await prisma.customer.update({
                where: { customerId },
                data: { deletedAt: new Date() },
            });
        } catch (error) {
            throw new Error(
                `Error deleting customer: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async count(tenantId: string, conditions: any = {}): Promise<number> {
        try {
            return await prisma.customer.count({
                where: { tenantId, deletedAt: null, ...conditions },
            });
        } catch (error) {
            throw new Error(
                `Error counting customers: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async getUnsyncedRecords(tenantId: string): Promise<Customer[]> {
        try {
            return await prisma.customer.findMany({
                where: { tenantId, lastSyncedAt: null, deletedAt: null },
            });
        } catch (error) {
            throw new Error(
                `Error getting unsynced customers: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async markAsSynced(customerId: string): Promise<Customer> {
        try {
            return await prisma.customer.update({
                where: { customerId },
                data: { lastSyncedAt: new Date() },
            });
        } catch (error) {
            throw new Error(
                `Error marking customer as synced: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }
}