import type { ValidationParams } from 'on-boarding';
import type { PaymentMethod } from 'payment-method';
import prisma from '../databases/prisma/client';
import { PaymentMethodCreateInput } from '../databases/prisma/generated/prisma/models';

export class PaymentMethodModel {
    static async findAllByRDBMS(conditions: ValidationParams): Promise<Array<PaymentMethod>> {
        try {
            return await prisma.paymentMethod.findMany({
                where: {
                    tenantId: conditions.tenantId,
                },
            }) as unknown as PaymentMethod[];
        } catch (error) {
            throw new Error(
                `Error finding payment methods: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async findAll(): Promise<PaymentMethod[]> {
        try {
            return await prisma.paymentMethod.findMany() as unknown as PaymentMethod[];
        } catch (error) {
            console.error('Error finding all payment methods:', error);
            throw error;
        }
    }

    static async findById(uuid: string): Promise<PaymentMethod | null> {
        try {
            return await prisma.paymentMethod.findUnique({
                where: { methodId: uuid }
            }) as unknown as PaymentMethod | null;
        } catch (error) {
            console.error(`Error finding payment method with ID ${uuid}:`, error);
            throw error;
        }
    }

    static async find(conditions: any = {}): Promise<PaymentMethod[]> {
        try {
            return await prisma.paymentMethod.findMany({
                where: conditions
            }) as unknown as PaymentMethod[];
        } catch (error) {
            console.error('Error finding payment methods with conditions:', error);
            throw error;
        }
    }

    static async create(data: PaymentMethodCreateInput): Promise<PaymentMethod> {
        try {
            return await prisma.paymentMethod.create({
                data: {
                    ...data,
                    synced: 0,
                }
            }) as unknown as PaymentMethod;
        } catch (error) {
            console.error('Error creating payment method:', error);
            throw error;
        }
    }

    static async update(uuid: string, data: Partial<PaymentMethod>): Promise<number> {
        try {
            await prisma.paymentMethod.update({
                where: { methodId: uuid },
                data
            });
            return 1; // Return 1 to indicate successful update
        } catch (error) {
            console.error(`Error updating payment method with ID ${uuid}:`, error);
            throw error;
        }
    }

    static async delete(uuid: string): Promise<number> {
        try {
            await prisma.paymentMethod.delete({
                where: { methodId: uuid }
            });
            return 1; // Return 1 to indicate successful deletion
        } catch (error) {
            console.error(`Error deleting payment method with ID ${uuid}:`, error);
            throw error;
        }
    }

    static async count(conditions: any = {}): Promise<number> {
        try {
            return await prisma.paymentMethod.count({
                where: conditions
            });
        } catch (error) {
            console.error('Error counting payment methods:', error);
            throw error;
        }
    }

    static async findByTenantAndBranch(tenantId: string, branchId: string): Promise<PaymentMethod[]> {
        try {
            return await this.find({ tenantId, branchId });
        } catch (error) {
            console.error(`Error finding payment methods for tenant ${tenantId} and branch ${branchId}:`, error);
            throw error;
        }
    }

    static async findByName(name: string, tenantId: string, branchId: string): Promise<PaymentMethod | null> {
        try {
            const results = await this.find({ name, tenantId, branchId });
            return results.length > 0 ? results[0] : null;
        } catch (error) {
            console.error(`Error finding payment method by name ${name}:`, error);
            throw error;
        }
    }

    static async markAsSynced(uuid: string): Promise<number> {
        try {
            await prisma.paymentMethod.update({
                where: { methodId: uuid },
                data: { synced: 1 }
            });
            return 1; // Return 1 to indicate successful update
        } catch (error) {
            console.error(`Error marking payment method ${uuid} as synced:`, error);
            throw error;
        }
    }

    static async getUnsyncedRecords(): Promise<PaymentMethod[]> {
        try {
            return await prisma.paymentMethod.findMany({
                where: { synced: 0 }
            }) as unknown as PaymentMethod[];
        } catch (error) {
            console.error('Error getting unsynced payment methods:', error);
            throw error;
        }
    }
}