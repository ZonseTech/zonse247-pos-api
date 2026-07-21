import { CreatePaymentServiceProviderRequest, PaymentServiceProvider, PaymentServiceProviderFilters, UpdatePaymentServiceProviderDto } from "payment-service-provider";
import { PaymentServiceProviderModel } from "../models/payment-service-provider.model";
import { PaymentMethodModel } from "../models/payment-methods.model";
import { AuthenticatedUser } from "auth";
import prisma from '../databases/prisma/client';
import { PaginationParams, buildPaginationMeta, PaginatedResult } from '../utils/pagination.utils';

/**
 * Payment service providers (banks, mobile money networks) are a global catalog,
 * not tenant-scoped - the underlying table has no tenantId/branchId columns.
 */
export class PaymentServiceProviderService {

    static async selectAll(params): Promise<Array<PaymentServiceProvider>> {
        return await PaymentServiceProviderModel.findAllByRDBMS(params);
    }

    static async listPaymentServiceProviders(
        filters: PaymentServiceProviderFilters,
        pagination: PaginationParams,
    ): Promise<PaginatedResult<PaymentServiceProvider>> {
        try {
            const where: any = {};
            if (filters.paymentMethodId) where.paymentMethodId = filters.paymentMethodId;

            const [providers, total] = await Promise.all([
                prisma.paymentServiceProvider.findMany({
                    where,
                    skip: pagination.skip,
                    take: pagination.limit,
                    orderBy: { createdAt: 'desc' },
                }),
                prisma.paymentServiceProvider.count({ where }),
            ]);

            return {
                data: providers as unknown as PaymentServiceProvider[],
                pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
            };
        } catch (error) {
            console.error('Error listing payment service providers:', error);
            throw new Error('Failed to retrieve payment service providers');
        }
    }

    /**
     * Providers for a given payment method - resolves a leaf method (e.g. POS,
     * Bank Transfer) to its root category (Bank) first, since providers are
     * linked to the root, not the channel leaves.
     */
    static async getProvidersForMethod(methodId: string): Promise<PaymentServiceProvider[]> {
        const rootMethodId = await PaymentMethodModel.resolveRootId(methodId);
        return PaymentServiceProviderModel.findByPaymentMethodId(rootMethodId);
    }

    static async createPaymentServiceProvider(
        pspData: { name: string; type: string; logoUrl: string; paymentMethodId?: string },
        user: AuthenticatedUser
    ): Promise<PaymentServiceProvider> {
        try {
            const createRequest: CreatePaymentServiceProviderRequest = {
                name: pspData.name,
                type: pspData.type || 'bank',
                logoUrl: pspData.logoUrl,
                paymentMethodId: pspData.paymentMethodId,
                userId: user.userId,
            };

            const validationErrors = PaymentServiceProviderModel.validateCreateRequest(createRequest);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            const existingPSPs = await PaymentServiceProviderModel.findByName(pspData.name.trim());
            if (existingPSPs.length > 0) {
                throw new Error('Payment service provider with this name already exists');
            }

            const newPSP = PaymentServiceProviderModel.buildPaymentServiceProviderData(createRequest);
            return await PaymentServiceProviderModel.create(newPSP);
        } catch (error) {
            console.error('Error creating payment service provider:', error);
            throw error;
        }
    }

    static async updatePaymentServiceProvider(
        pspId: string,
        updateData: UpdatePaymentServiceProviderDto,
        _user: AuthenticatedUser
    ): Promise<void> {
        try {
            const validationErrors = PaymentServiceProviderModel.validateUpdateRequest(updateData);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            const existingPSP = await this.getPaymentServiceProviderById(pspId);
            if (!existingPSP) {
                throw new Error('Payment service provider not found');
            }

            if (updateData.name && updateData.name.trim() !== existingPSP.name) {
                const existingPSPs = await PaymentServiceProviderModel.findByName(updateData.name.trim());
                const duplicate = existingPSPs.find(psp => psp.providerId !== pspId);
                if (duplicate) {
                    throw new Error('Payment service provider with this name already exists');
                }
            }

            const updatedCount = await PaymentServiceProviderModel.update(pspId, updateData as any);
            if (updatedCount === 0) {
                throw new Error('Failed to update payment service provider - no rows affected');
            }
        } catch (error) {
            console.error('Error updating payment service provider:', error);
            throw error;
        }
    }

    static async deletePaymentServiceProvider(
        pspId: string,
        _user: AuthenticatedUser
    ): Promise<void> {
        try {
            const existingPSP = await this.getPaymentServiceProviderById(pspId);
            if (!existingPSP) {
                throw new Error('Payment service provider not found');
            }

            const deletedCount = await PaymentServiceProviderModel.delete(pspId);
            if (deletedCount === 0) {
                throw new Error('Failed to delete payment service provider - no rows affected');
            }
        } catch (error) {
            console.error('Error deleting payment service provider:', error);
            throw error;
        }
    }

    static async getPaymentServiceProviderById(pspId: string): Promise<PaymentServiceProvider | null> {
        try {
            return await PaymentServiceProviderModel.findById(pspId);
        } catch (error) {
            console.error('Error fetching payment service provider by ID:', error);
            throw new Error('Failed to fetch payment service provider');
        }
    }

    static async searchByName(name: string): Promise<PaymentServiceProvider[]> {
        try {
            return await PaymentServiceProviderModel.findByName(name);
        } catch (error) {
            console.error('Error searching payment service providers by name:', error);
            throw new Error('Failed to search payment service providers');
        }
    }

    static async markPaymentServiceProviderAsSynced(pspId: string, _user: AuthenticatedUser): Promise<void> {
        try {
            const psp = await this.getPaymentServiceProviderById(pspId);
            if (!psp) {
                throw new Error('Payment service provider not found');
            }

            const updatedCount = await PaymentServiceProviderModel.markAsSynced(pspId);
            if (updatedCount === 0) {
                throw new Error('Failed to mark payment service provider as synced');
            }
        } catch (error) {
            console.error('Error marking payment service provider as synced:', error);
            throw error;
        }
    }

    static async markPaymentServiceProviderAsUnsynced(pspId: string, _user: AuthenticatedUser): Promise<void> {
        try {
            const psp = await this.getPaymentServiceProviderById(pspId);
            if (!psp) {
                throw new Error('Payment service provider not found');
            }

            const updatedCount = await PaymentServiceProviderModel.markAsUnsynced(pspId);
            if (updatedCount === 0) {
                throw new Error('Failed to mark payment service provider as unsynced');
            }
        } catch (error) {
            console.error('Error marking payment service provider as unsynced:', error);
            throw error;
        }
    }

    static async getPaymentServiceProviderCount(filters?: Partial<PaymentServiceProviderFilters>): Promise<number> {
        try {
            const conditions = filters ? { ...filters } : {};
            return await PaymentServiceProviderModel.count(conditions);
        } catch (error) {
            console.error('Error getting payment service provider count:', error);
            throw new Error('Failed to get payment service provider count');
        }
    }

    static async bulkMarkAsSynced(pspIds: string[], user: AuthenticatedUser): Promise<void> {
        try {
            const results = await Promise.allSettled(
                pspIds.map(id => this.markPaymentServiceProviderAsSynced(id, user))
            );

            const failures = results.filter(result => result.status === 'rejected');
            if (failures.length > 0) {
                console.warn(`Failed to sync ${failures.length} out of ${pspIds.length} payment service providers`);
            }
        } catch (error) {
            console.error('Error in bulk sync operation:', error);
            throw new Error('Failed to complete bulk sync operation');
        }
    }

    static async validatePaymentServiceProviderAccess(pspId: string): Promise<boolean> {
        try {
            const psp = await this.getPaymentServiceProviderById(pspId);
            return psp !== null;
        } catch (error) {
            console.error('Error validating payment service provider access:', error);
            return false;
        }
    }
}