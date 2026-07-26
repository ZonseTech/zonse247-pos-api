import type { ValidationParams } from 'on-boarding';
import type { PaymentMethod } from 'payment-method';
import prisma from '../databases/prisma/client';
import { PaymentMethodUncheckedCreateInput } from '../databases/prisma/generated/prisma/models';

export class PaymentMethodModel {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static async findAllByRDBMS(conditions: ValidationParams): Promise<Array<PaymentMethod>> {
        try {
            return await prisma.paymentMethod.findMany({
                where: {
                    // tenantId: conditions.tenantId,
                },
                orderBy: { sortOrder: 'asc' }
            }) as unknown as PaymentMethod[];
        } catch (error) {
            throw new Error(
                `Error finding payment methods: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async findAll(tenantId: string, branchId: string): Promise<PaymentMethod[]> {
        try {
            return await prisma.paymentMethod.findMany({
                where: { tenantId, branchId, deletedAt: null },
                orderBy: { sortOrder: 'asc' }
            }) as unknown as PaymentMethod[];
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

    /**
     * Root payment methods (Cash, Bank, Mobile Money, ...) with their channel
     * children (e.g. Bank -> POS, Bank Transfer) nested underneath.
     */
    static async findTree(tenantId: string, branchId: string): Promise<PaymentMethod[]> {
        try {
            return await prisma.paymentMethod.findMany({
                where: { tenantId, branchId, deletedAt: null, parentMethodId: null },
                orderBy: { sortOrder: 'asc' },
                include: {
                    children: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } }
                }
            }) as unknown as PaymentMethod[];
        } catch (error) {
            console.error('Error finding payment method tree:', error);
            throw error;
        }
    }

    /**
     * Resolves a method to its root category id. Leaf methods (e.g. POS, Bank
     * Transfer) resolve to their parent (Bank); root methods resolve to themselves.
     * The tree is exactly one level deep, so a single lookup is sufficient.
     */
    static async resolveRootId(methodId: string): Promise<string> {
        const method = await PaymentMethodModel.findById(methodId);
        return method?.parentMethodId || methodId;
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

    static async create(data: PaymentMethodUncheckedCreateInput): Promise<PaymentMethod> {
        try {
            return await prisma.paymentMethod.create({
                data,
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

    static async findByName(name: string, tenantId: string, branchId: string): Promise<PaymentMethod | null> {
        try {
            const results = await this.find({ name, tenantId, branchId, deletedAt: null });
            return results.length > 0 ? results[0] : null;
        } catch (error) {
            console.error(`Error finding payment method by name ${name}:`, error);
            throw error;
        }
    }

    /**
     * @deprecated The synced column has been removed. Use updatedAt/lastSyncedAt for delta sync.
     */
    static async markAsSynced(uuid: string): Promise<number> {
        try {
            await prisma.paymentMethod.update({
                where: { methodId: uuid },
                data: { lastSyncedAt: new Date() }
            });
            return 1;
        } catch (error) {
            console.error(`Error marking payment method ${uuid} as synced:`, error);
            throw error;
        }
    }

    /**
     * @deprecated The synced column has been removed. Use updatedAt for delta sync queries.
     */
    static async getUnsyncedRecords(): Promise<PaymentMethod[]> {
        try {
            // Return records that have never been synced (lastSyncedAt is null)
            return await prisma.paymentMethod.findMany({
                where: { lastSyncedAt: null }
            }) as unknown as PaymentMethod[];
        } catch (error) {
            console.error('Error getting unsynced payment methods:', error);
            throw error;
        }
    }
}