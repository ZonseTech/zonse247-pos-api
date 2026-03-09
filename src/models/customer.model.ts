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

    static async findById(customerId: string): Promise<Customer | null> {
        try {
            return await prisma.customer.findUnique({
                where: { customerId },
            });
        } catch (error) {
            throw new Error(
                `Error finding customer by ID: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async findAll(): Promise<Customer[]> {
        try {
            return await prisma.customer.findMany();
        } catch (error) {
            throw new Error(
                `Error finding all customers: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async find(conditions: any = {}): Promise<Customer[]> {
        try {
            return await prisma.customer.findMany({
                where: conditions,
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

    static async update(customerId: string, updateData: Partial<Customer>): Promise<Customer> {
        try {
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

    static async delete(customerId: string): Promise<Customer> {
        try {
            return await prisma.customer.delete({
                where: { customerId },
            });
        } catch (error) {
            throw new Error(
                `Error deleting customer: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async count(conditions: any = {}): Promise<number> {
        try {
            return await prisma.customer.count({
                where: conditions,
            });
        } catch (error) {
            throw new Error(
                `Error counting customers: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async getUnsyncedRecords(): Promise<Customer[]> {
        try {
            return await prisma.customer.findMany({
                where: { lastSyncedAt: null },
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