import { CreatePaymentServiceProviderRequest, PaymentServiceProvider, PaymentServiceProviderFilters, UpdatePaymentServiceProviderDto } from "payment-service-provider";
import { PaymentServiceProviderModel } from "../models/payment-service-provider.model";
import { AuthenticatedUser } from "auth";

export class PaymentServiceProviderService {

    static async selectAll(params): Promise<Array<PaymentServiceProvider>> {
        return await PaymentServiceProviderModel.findAllByRDBMS(params);
    }

    static async getAllPaymentServiceProviders(filters: PaymentServiceProviderFilters): Promise<PaymentServiceProvider[]> {
        try {
            return await PaymentServiceProviderModel.findByTenantIdAndBranchId(filters.tenantId, filters.branchId);
        } catch (error) {
            console.error('Error fetching payment service providers:', error);
            throw new Error('Failed to fetch payment service providers');
        }
    }

    static async createPaymentServiceProvider(
        pspData: { name: string; logoUrl: string },
        user: AuthenticatedUser
    ): Promise<PaymentServiceProvider> {
        try {
            const createRequest: CreatePaymentServiceProviderRequest = {
                name: pspData.name,
                logoUrl: pspData.logoUrl,
                tenantId: user.tenantId,
                branchId: user.branchId,
                userId: user.userId,
            };

            const validationErrors = PaymentServiceProviderModel.validateCreateRequest(createRequest);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            const existingPSPs = await PaymentServiceProviderModel.findByTenantIdAndName(
                user.tenantId,
                pspData.name.trim()
            );

            const duplicateInBranch = existingPSPs.find(psp => psp.branchId === user.branchId);
            if (duplicateInBranch) {
                throw new Error('Payment service provider with this name already exists in the branch');
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
        user: AuthenticatedUser
    ): Promise<void> {
        try {
            const validationErrors = PaymentServiceProviderModel.validateUpdateRequest(updateData);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            const existingPSP = await this.getPaymentServiceProviderById(pspId, {
                tenantId: user.tenantId,
                branchId: user.branchId
            });

            if (!existingPSP) {
                throw new Error('Payment service provider not found or access denied');
            }

            if (updateData.name && updateData.name.trim() !== existingPSP.name) {
                const existingPSPs = await PaymentServiceProviderModel.findByTenantIdAndName(
                    user.tenantId,
                    updateData.name.trim()
                );

                const duplicateInBranch = existingPSPs.find(
                    psp => psp.branchId === user.branchId && psp.providerId !== pspId
                );
                if (duplicateInBranch) {
                    throw new Error('Payment service provider with this name already exists in the branch');
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
        user: AuthenticatedUser
    ): Promise<void> {
        try {
            const existingPSP = await this.getPaymentServiceProviderById(pspId, {
                tenantId: user.tenantId,
                branchId: user.branchId
            });

            if (!existingPSP) {
                throw new Error('Payment service provider not found or access denied');
            }

            // TODO: Add check for related entities (transactions, etc.)
            // const relatedTransactions = await TransactionModel.findByPSPId(pspId);
            // if (relatedTransactions.length > 0) {
            //     throw new Error('Cannot delete payment service provider with associated transactions');
            // }

            const deletedCount = await PaymentServiceProviderModel.delete(pspId);
            if (deletedCount === 0) {
                throw new Error('Failed to delete payment service provider - no rows affected');
            }
        } catch (error) {
            console.error('Error deleting payment service provider:', error);
            throw error;
        }
    }

    static async getPaymentServiceProviderById(
        pspId: string,
        filters: PaymentServiceProviderFilters
    ): Promise<PaymentServiceProvider | null> {
        try {
            const psp = await PaymentServiceProviderModel.findById(pspId);

            if (!psp ||
                psp.tenantId !== filters.tenantId ||
                psp.branchId !== filters.branchId) {
                return null;
            }

            return psp;
        } catch (error) {
            console.error('Error fetching payment service provider by ID:', error);
            throw new Error('Failed to fetch payment service provider');
        }
    }

    static async getPaymentServiceProvidersByTenant(tenantId: string): Promise<PaymentServiceProvider[]> {
        try {
            return await PaymentServiceProviderModel.findByTenantId(tenantId);
        } catch (error) {
            console.error('Error fetching payment service providers by tenant:', error);
            throw new Error('Failed to fetch payment service providers by tenant');
        }
    }

    static async getPaymentServiceProvidersByBranch(branchId: string): Promise<PaymentServiceProvider[]> {
        try {
            return await PaymentServiceProviderModel.findByBranchId(branchId);
        } catch (error) {
            console.error('Error fetching payment service providers by branch:', error);
            throw new Error('Failed to fetch payment service providers by branch');
        }
    }

    static async searchPaymentServiceProvidersByName(
        name: string,
        filters: PaymentServiceProviderFilters
    ): Promise<PaymentServiceProvider[]> {
        try {
            const allPSPs = await PaymentServiceProviderModel.findByTenantIdAndBranchId(
                filters.tenantId,
                filters.branchId
            );

            return allPSPs.filter(psp =>
                psp.name.toLowerCase().includes(name.toLowerCase())
            );
        } catch (error) {
            console.error('Error searching payment service providers by name:', error);
            throw new Error('Failed to search payment service providers');
        }
    }

    static async getUnsyncedPaymentServiceProviders(tenantId: string): Promise<PaymentServiceProvider[]> {
        try {
            return await PaymentServiceProviderModel.findUnsyncedByTenant(tenantId);
        } catch (error) {
            console.error('Error fetching unsynced payment service providers:', error);
            throw new Error('Failed to fetch unsynced payment service providers');
        }
    }

    static async markPaymentServiceProviderAsSynced(pspId: string, user: AuthenticatedUser): Promise<void> {
        try {
            const psp = await this.getPaymentServiceProviderById(pspId, {
                tenantId: user.tenantId,
                branchId: user.branchId
            });

            if (!psp) {
                throw new Error('Payment service provider not found or access denied');
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

    static async markPaymentServiceProviderAsUnsynced(pspId: string, user: AuthenticatedUser): Promise<void> {
        try {
            const psp = await this.getPaymentServiceProviderById(pspId, {
                tenantId: user.tenantId,
                branchId: user.branchId
            });

            if (!psp) {
                throw new Error('Payment service provider not found or access denied');
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

    static async validatePaymentServiceProviderAccess(
        pspId: string,
        user: AuthenticatedUser
    ): Promise<boolean> {
        try {
            const psp = await this.getPaymentServiceProviderById(pspId, {
                tenantId: user.tenantId,
                branchId: user.branchId
            });
            return psp !== null;
        } catch (error) {
            console.error('Error validating payment service provider access:', error);
            return false;
        }
    }
}