import { v4 as uuidv4 } from 'uuid';
import { PaymentMethodModel } from '../models/payment-methods.model';
import { CreatePaymentMethodDto, PaymentMethod, UpdatePaymentMethodDto } from 'payment-method';
import { PaymentMethodCreateInput } from '../databases/prisma/generated/prisma/models';

export class PaymentMethodService {

    static async selectAll(params): Promise<Array<PaymentMethod>> {
        return await PaymentMethodModel.findAllByRDBMS(params);
    }

    static async getAllPaymentMethods(): Promise<PaymentMethod[]> {
        try {
            return await PaymentMethodModel.findAll();
        } catch (error) {
            console.error('Service: Error getting all payment methods:', error);
            throw new Error('Failed to retrieve payment methods');
        }
    }

    static async getPaymentMethodById(uuid: string): Promise<PaymentMethod | null> {
        try {
            if (!uuid || typeof uuid !== 'string') {
                throw new Error('Invalid payment method ID provided');
            }

            return await PaymentMethodModel.findById(uuid);
        } catch (error) {
            console.error(`Service: Error getting payment method by ID ${uuid}:`, error);
            throw new Error('Failed to retrieve payment method');
        }
    }

    static async createPaymentMethod(data: CreatePaymentMethodDto): Promise<PaymentMethod> {
        try {
            if (!data.name) {
                throw new Error('Name is required');
            }

            const existingPaymentMethod = await PaymentMethodModel.findByName(data.name);

            if (existingPaymentMethod) {
                throw new Error('Payment method with this name already exists');
            }

            const paymentMethodData = {
                name: data.name,
                icon: data.icon,
                sortOrder: data.sortOrder,
                isActive: data.isActive ?? true,
                methodId: uuidv4(),
            } as unknown as PaymentMethodCreateInput

            return await PaymentMethodModel.create(paymentMethodData);
        } catch (error) {
            console.error('Service: Error creating payment method:', error);
            throw error;
        }
    }

    static async updatePaymentMethod(methodId: string, data: UpdatePaymentMethodDto): Promise<PaymentMethod | null> {
        try {
            if (!methodId || typeof methodId !== 'string') {
                throw new Error('Invalid payment method ID provided');
            }

            const existingPaymentMethod = await PaymentMethodModel.findById(methodId);
            if (!existingPaymentMethod) {
                throw new Error('Payment method not found');
            }

            if (data.name && data.name !== existingPaymentMethod.name) {
                const duplicatePaymentMethod = await PaymentMethodModel.findByName(data.name);

                if (duplicatePaymentMethod && duplicatePaymentMethod.methodId !== methodId) {
                    throw new Error('Payment method with this name already exists');
                }
            }

            const numUpdated = await PaymentMethodModel.update(methodId, data);

            if (numUpdated === 0) {
                throw new Error('Payment method not found or no changes made');
            }

            return await PaymentMethodModel.findById(methodId);
        } catch (error) {
            console.error(`Service: Error updating payment method ${methodId}:`, error);
            throw error;
        }
    }

    static async deletePaymentMethod(uuid: string): Promise<boolean> {
        try {
            if (!uuid || typeof uuid !== 'string') {
                throw new Error('Invalid payment method ID provided');
            }

            const existingPaymentMethod = await PaymentMethodModel.findById(uuid);
            if (!existingPaymentMethod) {
                throw new Error('Payment method not found');
            }

            const numDeleted = await PaymentMethodModel.delete(uuid);
            return numDeleted > 0;
        } catch (error) {
            console.error(`Service: Error deleting payment method ${uuid}:`, error);
            throw error;
        }
    }

    static async getPaymentMethodsCount(conditions: any = {}): Promise<number> {
        try {
            return await PaymentMethodModel.count(conditions);
        } catch (error) {
            console.error('Service: Error getting payment methods count:', error);
            throw new Error('Failed to get payment methods count');
        }
    }

    static async searchPaymentMethods(searchTerm: string): Promise<PaymentMethod[]> {
        try {
            const conditions: any = {
                name: { contains: searchTerm }
            };

            return await PaymentMethodModel.find(conditions);
        } catch (error) {
            console.error('Service: Error searching payment methods:', error);
            throw new Error('Failed to search payment methods');
        }
    }

    static async getUnsyncedPaymentMethods(): Promise<PaymentMethod[]> {
        try {
            return await PaymentMethodModel.getUnsyncedRecords();
        } catch (error) {
            console.error('Service: Error getting unsynced payment methods:', error);
            throw new Error('Failed to get unsynced payment methods');
        }
    }

    static async markPaymentMethodAsSynced(uuid: string): Promise<boolean> {
        try {
            if (!uuid || typeof uuid !== 'string') {
                throw new Error('Invalid payment method ID provided');
            }

            const numUpdated = await PaymentMethodModel.markAsSynced(uuid);
            return numUpdated > 0;
        } catch (error) {
            console.error(`Service: Error marking payment method ${uuid} as synced:`, error);
            throw new Error('Failed to mark payment method as synced');
        }
    }
}