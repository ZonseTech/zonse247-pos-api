import { ValidationParams } from 'on-boarding';
import { sealDBModel } from '../databases/local';
import { PAYMENT_METHODS_DB } from '../databases/local/tables';
import { PaymentMethod } from 'payment-method';
import prisma from '../databases/prisma/client';

export class PaymentMethodModel {
    private static tableName = PAYMENT_METHODS_DB;

    static async findAllByRDBMS(conditions: ValidationParams): Promise<PaymentMethod[]> {
        try {
            return await prisma.paymentMethod.findMany({
                where: {
                    tenantId: conditions.tenantId,
                },
            }) as unknown as Array<PaymentMethod>
        } catch (error) {
            throw new Error(
                `Error finding payment methods: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async findAll(): Promise<PaymentMethod[]> {
        try {
            return await sealDBModel.findAll(this.tableName);
        } catch (error) {
            console.error('Error finding all payment methods:', error);
            throw error;
        }
    }

    static async findById(uuid: string): Promise<PaymentMethod | null> {
        try {
            return await sealDBModel.findById<PaymentMethod>(this.tableName, uuid);
        } catch (error) {
            console.error(`Error finding payment method with ID ${uuid}:`, error);
            throw error;
        }
    }

    static async find(conditions: any = {}): Promise<PaymentMethod[]> {
        try {
            return await sealDBModel.find<PaymentMethod[]>(this.tableName, conditions);
        } catch (error) {
            console.error('Error finding payment methods with conditions:', error);
            throw error;
        }
    }

    static async create(data: Omit<PaymentMethod, 'methodId' | 'createdAt' | 'updatedAt' | 'synced'>): Promise<PaymentMethod> {
        try {
            return await sealDBModel.insert(this.tableName, data);
        } catch (error) {
            console.error('Error creating payment method:', error);
            throw error;
        }
    }

    static async update(uuid: string, data: Partial<PaymentMethod>): Promise<number> {
        try {
            return await sealDBModel.update(this.tableName, uuid, data);
        } catch (error) {
            console.error(`Error updating payment method with ID ${uuid}:`, error);
            throw error;
        }
    }

    static async delete(uuid: string): Promise<number> {
        try {
            return await sealDBModel.delete(this.tableName, uuid);
        } catch (error) {
            console.error(`Error deleting payment method with ID ${uuid}:`, error);
            throw error;
        }
    }

    static async count(conditions: any = {}): Promise<number> {
        try {
            return await sealDBModel.count(this.tableName, conditions);
        } catch (error) {
            console.error('Error counting payment methods:', error);
            throw error;
        }
    }

    static async findByClientAndShop(tenantId: string, shopUuid: string): Promise<PaymentMethod[]> {
        try {
            return await this.find({ tenantId, shopUuid });
        } catch (error) {
            console.error(`Error finding payment methods for client ${tenantId} and shop ${shopUuid}:`, error);
            throw error;
        }
    }

    static async findByName(name: string, tenantId: string, shopUuid: string): Promise<PaymentMethod | null> {
        try {
            const results = await this.find({ name, tenantId, shopUuid });
            return results.length > 0 ? results[0] : null;
        } catch (error) {
            console.error(`Error finding payment method by name ${name}:`, error);
            throw error;
        }
    }

    static async markAsSynced(uuid: string): Promise<number> {
        try {
            return await sealDBModel.markAsSynced(this.tableName, uuid);
        } catch (error) {
            console.error(`Error marking payment method ${uuid} as synced:`, error);
            throw error;
        }
    }

    static async getUnsyncedRecords(): Promise<PaymentMethod[]> {
        try {
            return await sealDBModel.getUnsyncedRecords(this.tableName);
        } catch (error) {
            console.error('Error getting unsynced payment methods:', error);
            throw error;
        }
    }
}