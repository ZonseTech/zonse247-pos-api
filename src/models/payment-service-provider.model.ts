import { v4 as uuidv4 } from 'uuid';
import { ValidationParams } from 'on-boarding';
import prisma from '../databases/prisma/client';
import { CreatePaymentServiceProviderRequest, PaymentServiceProvider, UpdatePaymentServiceProviderDto } from 'payment-service-provider';

export class PaymentServiceProviderModel {

    static async findAllByRDBMS(_: ValidationParams): Promise<PaymentServiceProvider[]> {
        try {
            return await prisma.paymentServiceProvider.findMany() as unknown as PaymentServiceProvider[];
        } catch (error) {
            throw new Error(
                `Error finding payment service providers: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async findAll(conditions: any = {}): Promise<PaymentServiceProvider[]> {
        try {
            return await prisma.paymentServiceProvider.findMany({
                where: conditions
            }) as unknown as PaymentServiceProvider[];
        } catch (error) {
            throw new Error(`Error finding payment service providers: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findById(providerId: string): Promise<PaymentServiceProvider | null> {
        try {
            return await prisma.paymentServiceProvider.findUnique({
                where: { providerId }
            }) as unknown as PaymentServiceProvider | null;
        } catch (error) {
            throw new Error(`Error finding payment service provider by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByName(name: string): Promise<PaymentServiceProvider[]> {
        try {
            return await prisma.paymentServiceProvider.findMany({
                where: { name }
            }) as unknown as PaymentServiceProvider[];
        } catch (error) {
            throw new Error(`Error finding payment service providers by name: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Providers linked to a payment method category (e.g. Bank, Mobile Money).
     * Callers should resolve a leaf method (POS, Bank Transfer) to its root first -
     * see PaymentServiceProviderService.getProvidersForMethod.
     */
    static async findByPaymentMethodId(paymentMethodId: string): Promise<PaymentServiceProvider[]> {
        try {
            return await prisma.paymentServiceProvider.findMany({
                where: { paymentMethodId, isActive: true },
                orderBy: { sortOrder: 'asc' }
            }) as unknown as PaymentServiceProvider[];
        } catch (error) {
            throw new Error(`Error finding payment service providers by payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * @deprecated The synced column has been removed. Use updatedAt for delta sync.
     */
    static async findBySynced(_synced: number): Promise<PaymentServiceProvider[]> {
        try {
            // Return empty array - synced field no longer exists
            return [];
        } catch (error) {
            throw new Error(`Error finding payment service providers by sync status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static buildPaymentServiceProviderData(data: CreatePaymentServiceProviderRequest): PaymentServiceProvider {
        const now = new Date();
        return {
            providerId: uuidv4(),
            name: data.name,
            type: data.type || 'bank',
            userId: data.userId,
            paymentMethodId: data.paymentMethodId,
            logoUrl: data.logoUrl,
            createdAt: now,
            updatedAt: now,
        };
    }

    static async create(pspData: PaymentServiceProvider): Promise<PaymentServiceProvider> {
        try {
            return await prisma.paymentServiceProvider.create({
                data: {
                    providerId: pspData.providerId,
                    name: pspData.name,
                    type: pspData.type || 'bank',
                    userId: pspData.userId,
                    logoUrl: pspData.logoUrl,
                    paymentMethodId: pspData.paymentMethodId,
                }
            }) as unknown as PaymentServiceProvider;
        } catch (error) {
            throw new Error(`Error creating payment service provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async update(id: string, updateData: Partial<PaymentServiceProvider>): Promise<number> {
        try {
            const dataWithTimestamp = {
                ...updateData,
                updatedAt: new Date(),
            };

            await prisma.paymentServiceProvider.update({
                where: { providerId: id },
                data: dataWithTimestamp
            });

            return 1; // Return 1 to indicate successful update
        } catch (error) {
            throw new Error(`Error updating payment service provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async delete(id: string): Promise<number> {
        try {
            await prisma.paymentServiceProvider.delete({
                where: { providerId: id }
            });
            return 1; // Return 1 to indicate successful deletion
        } catch (error) {
            throw new Error(`Error deleting payment service provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async count(conditions: any = {}): Promise<number> {
        try {
            return await prisma.paymentServiceProvider.count({
                where: conditions
            });
        } catch (error) {
            throw new Error(`Error counting payment service providers: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * @deprecated The synced column has been removed. Updates updatedAt instead.
     */
    static async markAsSynced(id: string): Promise<number> {
        try {
            await prisma.paymentServiceProvider.update({
                where: { providerId: id },
                data: {
                    updatedAt: new Date()
                }
            });
            return 1;
        } catch (error) {
            throw new Error(`Error marking payment service provider as synced: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * @deprecated The synced column has been removed.
     */
    static async markAsUnsynced(id: string): Promise<number> {
        try {
            await prisma.paymentServiceProvider.update({
                where: { providerId: id },
                data: {
                    updatedAt: new Date()
                }
            });
            return 1;
        } catch (error) {
            throw new Error(`Error marking payment service provider as unsynced: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static validateCreateRequest(data: CreatePaymentServiceProviderRequest): string[] {
        const errors: string[] = [];

        if (!data.name || data.name.trim().length === 0) {
            errors.push('Payment service provider name is required');
        }

        if (data.name && data.name.trim().length > 100) {
            errors.push('Payment service provider name must be less than 100 characters');
        }

        if (!data.userId || data.userId.trim().length === 0) {
            errors.push('User ID is required');
        }

        if (!data.logoUrl || data.logoUrl.trim().length === 0) {
            errors.push('Logo URL is required');
        }

        if (data.logoUrl && !this.isValidUrl(data.logoUrl)) {
            errors.push('Logo URL must be a valid URL');
        }

        return errors;
    }

    static validateUpdateRequest(data: UpdatePaymentServiceProviderDto): string[] {
        const errors: string[] = [];

        if (data.name !== undefined) {
            if (!data.name || data.name.trim().length === 0) {
                errors.push('Payment service provider name cannot be empty');
            }

            if (data.name && data.name.trim().length > 100) {
                errors.push('Payment service provider name must be less than 100 characters');
            }
        }

        if (data.logoUrl !== undefined) {
            if (!data.logoUrl || data.logoUrl.trim().length === 0) {
                errors.push('Logo URL cannot be empty');
            }

            if (data.logoUrl && !this.isValidUrl(data.logoUrl)) {
                errors.push('Logo URL must be a valid URL');
            }
        }

        return errors;
    }

    private static isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
}