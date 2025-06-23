import { v4 as uuidv4 } from 'uuid';
import { sealDBModel } from '../databases/local';
import { PAYMENT_SERVICE_PROVIDERS_DB } from '../databases/local/tables';

export class PaymentServiceProviderModel {
    static async findAll(conditions: any = {}): Promise<PaymentServiceProvider[]> {
        try {
            return await sealDBModel.find(PAYMENT_SERVICE_PROVIDERS_DB, conditions);
        } catch (error) {
            throw new Error(`Error finding payment service providers: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findById(id: string): Promise<PaymentServiceProvider | null> {
        try {
            return await sealDBModel.findById<PaymentServiceProvider>(PAYMENT_SERVICE_PROVIDERS_DB, id);
        } catch (error) {
            throw new Error(`Error finding payment service provider by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByClientUuid(clientUuid: string): Promise<PaymentServiceProvider[]> {
        try {
            return await sealDBModel.find(PAYMENT_SERVICE_PROVIDERS_DB, { clientUuid });
        } catch (error) {
            throw new Error(`Error finding payment service providers by client ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByShopUuid(shopUuid: string): Promise<PaymentServiceProvider[]> {
        try {
            return await sealDBModel.find(PAYMENT_SERVICE_PROVIDERS_DB, { shopUuid });
        } catch (error) {
            throw new Error(`Error finding payment service providers by shop ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByClientUuidAndShopUuid(clientUuid: string, shopUuid: string): Promise<PaymentServiceProvider[]> {
        try {
            return await sealDBModel.find(PAYMENT_SERVICE_PROVIDERS_DB, {
                clientUuid,
                shopUuid
            });
        } catch (error) {
            throw new Error(`Error finding payment service providers by client ID and shop ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByName(name: string): Promise<PaymentServiceProvider[]> {
        try {
            return await sealDBModel.find(PAYMENT_SERVICE_PROVIDERS_DB, { name });
        } catch (error) {
            throw new Error(`Error finding payment service providers by name: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByClientUuidAndName(clientUuid: string, name: string): Promise<PaymentServiceProvider[]> {
        try {
            return await sealDBModel.find(PAYMENT_SERVICE_PROVIDERS_DB, {
                clientUuid,
                name
            });
        } catch (error) {
            throw new Error(`Error finding payment service provider by client ID and name: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findBySynced(synced: number): Promise<PaymentServiceProvider[]> {
        try {
            return await sealDBModel.find(PAYMENT_SERVICE_PROVIDERS_DB, { synced });
        } catch (error) {
            throw new Error(`Error finding payment service providers by sync status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findUnsyncedByClient(clientUuid: string): Promise<PaymentServiceProvider[]> {
        try {
            return await sealDBModel.find(PAYMENT_SERVICE_PROVIDERS_DB, {
                clientUuid,
                synced: 0
            });
        } catch (error) {
            throw new Error(`Error finding unsynced payment service providers by client: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static buildPaymentServiceProviderData(data: CreatePaymentServiceProviderRequest): PaymentServiceProvider {
        const now = new Date();
        return {
            uuid: uuidv4(),
            name: data.name,
            clientUuid: data.clientUuid,
            shopUuid: data.shopUuid,
            userUuid: data.userUuid,
            logoUrl: data.logoUrl,
            createdAt: now,
            updatedAt: now,
            synced: 0
        };
    }

    static async create(pspData: PaymentServiceProvider): Promise<PaymentServiceProvider> {
        try {
            return await sealDBModel.insert(PAYMENT_SERVICE_PROVIDERS_DB, pspData);
        } catch (error) {
            throw new Error(`Error creating payment service provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async update(id: string, updateData: Partial<PaymentServiceProvider>): Promise<number> {
        try {
            const dataWithTimestamp = {
                ...updateData,
                updatedAt: new Date(),
                synced: 0
            };
            return await sealDBModel.update(PAYMENT_SERVICE_PROVIDERS_DB, id, dataWithTimestamp);
        } catch (error) {
            throw new Error(`Error updating payment service provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async delete(id: string): Promise<number> {
        try {
            return await sealDBModel.delete(PAYMENT_SERVICE_PROVIDERS_DB, id);
        } catch (error) {
            throw new Error(`Error deleting payment service provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async count(conditions: any = {}): Promise<number> {
        try {
            return await sealDBModel.count(PAYMENT_SERVICE_PROVIDERS_DB, conditions);
        } catch (error) {
            throw new Error(`Error counting payment service providers: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async markAsSynced(id: string): Promise<number> {
        try {
            return await this.update(id, { synced: 1 });
        } catch (error) {
            throw new Error(`Error marking payment service provider as synced: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async markAsUnsynced(id: string): Promise<number> {
        try {
            return await this.update(id, { synced: 0 });
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

        if (!data.clientUuid || data.clientUuid.trim().length === 0) {
            errors.push('Client ID is required');
        }

        if (!data.shopUuid || data.shopUuid.trim().length === 0) {
            errors.push('Shop ID is required');
        }

        if (!data.userUuid || data.userUuid.trim().length === 0) {
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

        if (data.synced !== undefined && ![0, 1].includes(data.synced)) {
            errors.push('Synced status must be 0 or 1');
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