import { v4 as uuidv4 } from 'uuid';
import { PaymentMethodModel } from '../models/payment-methods.model';

export class PaymentMethodService {
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

    static async getPaymentMethodsByClientAndShop(clientUuid: string, shopUuid: string): Promise<PaymentMethod[]> {
        try {
            if (!clientUuid || !shopUuid) {
                throw new Error('Client UUID and Shop UUID are required');
            }

            return await PaymentMethodModel.findByClientAndShop(clientUuid, shopUuid);
        } catch (error) {
            console.error(`Service: Error getting payment methods for client ${clientUuid} and shop ${shopUuid}:`, error);
            throw new Error('Failed to retrieve payment methods');
        }
    }

    static async createPaymentMethod(data: CreatePaymentMethodDto): Promise<PaymentMethod> {
        try {
            if (!data.name || !data.clientUuid || !data.shopUuid || !data.userUuid) {
                throw new Error('Name, clientUuid, shopUuid, and userUuid are required');
            }

            const existingPaymentMethod = await PaymentMethodModel.findByName(
                data.name,
                data.clientUuid,
                data.shopUuid
            );

            if (existingPaymentMethod) {
                throw new Error('Payment method with this name already exists');
            }

            const paymentMethodData = {
                ...data,
                uuid: uuidv4(),
            };

            return await PaymentMethodModel.create(paymentMethodData);
        } catch (error) {
            console.error('Service: Error creating payment method:', error);
            throw error;
        }
    }

    static async updatePaymentMethod(uuid: string, data: UpdatePaymentMethodDto): Promise<PaymentMethod | null> {
        try {
            if (!uuid || typeof uuid !== 'string') {
                throw new Error('Invalid payment method ID provided');
            }

            const existingPaymentMethod = await PaymentMethodModel.findById(uuid);
            if (!existingPaymentMethod) {
                throw new Error('Payment method not found');
            }

            if (data.name && data.name !== existingPaymentMethod.name) {
                const duplicatePaymentMethod = await PaymentMethodModel.findByName(
                    data.name,
                    existingPaymentMethod.clientUuid,
                    existingPaymentMethod.shopUuid
                );

                if (duplicatePaymentMethod && duplicatePaymentMethod.uuid !== uuid) {
                    throw new Error('Payment method with this name already exists');
                }
            }

            const numUpdated = await PaymentMethodModel.update(uuid, data);

            if (numUpdated === 0) {
                throw new Error('Payment method not found or no changes made');
            }

            return await PaymentMethodModel.findById(uuid);
        } catch (error) {
            console.error(`Service: Error updating payment method ${uuid}:`, error);
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

    static async searchPaymentMethods(searchTerm: string, clientUuid?: string, shopUuid?: string): Promise<PaymentMethod[]> {
        try {
            const conditions: any = {
                name: { $regex: new RegExp(searchTerm, 'i') }
            };

            if (clientUuid) conditions.clientUuid = clientUuid;
            if (shopUuid) conditions.shopUuid = shopUuid;

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