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
            console.error('CustomerModel.findById error:', error);
            throw error;
        }
    }

    static async findAll(): Promise<Customer[]> {
        try {
            return await prisma.customer.findMany();
        } catch (error) {
            console.error('CustomerModel.findAll error:', error);
            throw error;
        }
    }

    static async find(conditions: any = {}): Promise<Customer[]> {
        try {
            return await prisma.customer.findMany({
                where: conditions,
            });
        } catch (error) {
            console.error('CustomerModel.find error:', error);
            throw error;
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
            console.error('CustomerModel.create error:', error);
            throw error;
        }
    }

    static async update(customerId: string, updateData: Partial<Customer>): Promise<Customer> {
        try {
            return await prisma.customer.update({
                where: { customerId },
                data: updateData,
            });
        } catch (error) {
            console.error('CustomerModel.update error:', error);
            throw error;
        }
    }

    static async delete(customerId: string): Promise<Customer> {
        try {
            return await prisma.customer.delete({
                where: { customerId },
            });
        } catch (error) {
            console.error('CustomerModel.delete error:', error);
            throw error;
        }
    }

    static async count(conditions: any = {}): Promise<number> {
        try {
            return await prisma.customer.count({
                where: conditions,
            });
        } catch (error) {
            console.error('CustomerModel.count error:', error);
            throw error;
        }
    }

    static async getUnsyncedRecords(): Promise<Customer[]> {
        try {
            return await prisma.customer.findMany({
                where: { synced: 0 },
            });
        } catch (error) {
            console.error('CustomerModel.getUnsyncedRecords error:', error);
            throw error;
        }
    }

    static async markAsSynced(customerId: string): Promise<Customer> {
        try {
            return await prisma.customer.update({
                where: { customerId },
                data: { synced: 1 },
            });
        } catch (error) {
            console.error('CustomerModel.markAsSynced error:', error);
            throw error;
        }
    }
}