import { v4 as uuidv4 } from 'uuid';
import { PaymentMethodModel } from '../models/payment-methods.model';
import { CreatePaymentMethodDto, PaymentMethod, UpdatePaymentMethodDto } from 'payment-method';
import { PaymentMethodUncheckedCreateInput } from '../databases/prisma/generated/prisma/models';
import prisma from '../databases/prisma/client';
import { PaginationParams, buildPaginationMeta, PaginatedResult } from '../utils/pagination.utils';

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

    static async listPaymentMethods(
        pagination: PaginationParams,
        options?: { search?: string },
    ): Promise<PaginatedResult<PaymentMethod>> {
        try {
            const where: any = {};
            if (options?.search) {
                where.OR = [
                    { name: { contains: options.search } },
                    { code: { contains: options.search } },
                ];
            }

            const [methods, total] = await Promise.all([
                prisma.paymentMethod.findMany({
                    where,
                    skip: pagination.skip,
                    take: pagination.limit,
                    orderBy: { sortOrder: 'asc' },
                }),
                prisma.paymentMethod.count({ where }),
            ]);

            return {
                data: methods as unknown as PaymentMethod[],
                pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
            };
        } catch (error) {
            console.error('Service: Error listing payment methods:', error);
            throw new Error('Failed to retrieve payment methods');
        }
    }

    /**
     * Root payment methods with their channel children nested underneath
     * (e.g. Bank -> POS, Bank Transfer). Used to drive the cascading
     * payment picker in the checkout UI.
     */
    static async getPaymentMethodTree(): Promise<PaymentMethod[]> {
        try {
            return await PaymentMethodModel.findTree();
        } catch (error) {
            console.error('Service: Error getting payment method tree:', error);
            throw new Error('Failed to retrieve payment method tree');
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
                methodId: uuidv4(),
                tenantId: data.tenantId,
                branchId: data.branchId,
                name: data.name,
                icon: data.icon,
                sortOrder: data.sortOrder,
                parentMethodId: data.parentMethodId,
                isActive: data.isActive ?? true,
            } as unknown as PaymentMethodUncheckedCreateInput

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