/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { v4 as uuidv4 } from 'uuid';
import prisma from '../databases/prisma/client';
import { MraApiConfig, MraEnvironment } from '../types/mra.types';

/**
 * Model for MRA API Configuration
 * Manages tenant-level MRA EIS API settings
 */
export class MraApiConfigModel {
    /**
     * Find configuration by tenant ID and environment
     */
    static async findByTenantAndEnvironment(
        tenantId: string,
        environment: MraEnvironment
    ): Promise<MraApiConfig | null> {
        try {
            const config = await prisma.mRA_API_CONFIG_TABLE.findFirst({
                where: {
                    tenantId,
                    environment: environment as any,
                },
            });

            return config ? this.mapToMraApiConfig(config) : null;
        } catch (error) {
            console.error('Error finding MRA config:', error);
            return null;
        }
    }

    /**
     * Find all configurations for a tenant
     */
    static async findByTenantId(tenantId: string): Promise<MraApiConfig[]> {
        try {
            const configs = await prisma.mRA_API_CONFIG_TABLE.findMany({
                where: { tenantId },
                orderBy: { createdAt: 'desc' },
            });

            return configs.map(this.mapToMraApiConfig);
        } catch (error) {
            console.error('Error finding MRA configs by tenant:', error);
            return [];
        }
    }

    /**
     * Find configuration by ID
     */
    static async findById(configId: string): Promise<MraApiConfig | null> {
        try {
            const config = await prisma.mRA_API_CONFIG_TABLE.findUnique({
                where: { configId },
            });

            return config ? this.mapToMraApiConfig(config) : null;
        } catch (error) {
            console.error('Error finding MRA config by ID:', error);
            return null;
        }
    }

    /**
     * Create new MRA API configuration
     */
    static async create(data: Partial<MraApiConfig>): Promise<MraApiConfig> {
        try {
            const config = await prisma.mRA_API_CONFIG_TABLE.create({
                data: {
                    configId: data.configId || uuidv4(),
                    tenantId: data.tenantId!,
                    environment: (data.environment || MraEnvironment.SANDBOX) as any,
                    apiBaseUrl: data.apiBaseUrl || '',
                    apiKey: data.apiKey || null,
                    apiSecret: data.apiSecret || null,
                    lastSyncTimestamp: data.lastSyncTimestamp || null,
                    syncStatus: (data.syncStatus || 'PENDING') as any,
                    isActive: data.isActive ?? true,
                },
            });

            return this.mapToMraApiConfig(config);
        } catch (error: any) {
            // Handle duplicate entry gracefully
            if (error.code === 'P2002') {
                throw new Error('MRA configuration for this tenant and environment already exists');
            }
            throw new Error(`Error creating MRA config: ${error.message}`);
        }
    }

    /**
     * Update MRA API configuration
     */
    static async update(configId: string, data: Partial<MraApiConfig>): Promise<MraApiConfig | null> {
        try {
            const updateData: any = {};

            if (data.apiBaseUrl !== undefined) updateData.apiBaseUrl = data.apiBaseUrl;
            if (data.apiKey !== undefined) updateData.apiKey = data.apiKey;
            if (data.apiSecret !== undefined) updateData.apiSecret = data.apiSecret;
            if (data.lastSyncTimestamp !== undefined) updateData.lastSyncTimestamp = data.lastSyncTimestamp;
            if (data.syncStatus !== undefined) updateData.syncStatus = data.syncStatus;
            if (data.isActive !== undefined) updateData.isActive = data.isActive;
            if (data.environment !== undefined) updateData.environment = data.environment;

            updateData.updatedAt = new Date();

            const config = await prisma.mRA_API_CONFIG_TABLE.update({
                where: { configId },
                data: updateData,
            });

            return this.mapToMraApiConfig(config);
        } catch (error: any) {
            if (error.code === 'P2025') {
                return null; // Record not found
            }
            throw new Error(`Error updating MRA config: ${error.message}`);
        }
    }

    /**
     * Delete MRA API configuration
     */
    static async delete(configId: string): Promise<boolean> {
        try {
            await prisma.mRA_API_CONFIG_TABLE.delete({
                where: { configId },
            });
            return true;
        } catch (error: any) {
            if (error.code === 'P2025') {
                return false; // Record not found
            }
            throw new Error(`Error deleting MRA config: ${error.message}`);
        }
    }

    /**
     * Get active configuration for tenant
     */
    static async findActiveByTenant(tenantId: string): Promise<MraApiConfig | null> {
        try {
            const config = await prisma.mRA_API_CONFIG_TABLE.findFirst({
                where: {
                    tenantId,
                    isActive: true,
                },
                orderBy: { createdAt: 'desc' },
            });

            return config ? this.mapToMraApiConfig(config) : null;
        } catch (error) {
            console.error('Error finding active MRA config:', error);
            return null;
        }
    }

    /**
     * Upsert MRA API configuration
     */
    static async upsert(
        tenantId: string,
        environment: MraEnvironment,
        data: Partial<MraApiConfig>
    ): Promise<MraApiConfig> {
        try {
            const existing = await this.findByTenantAndEnvironment(tenantId, environment);

            if (existing) {
                const updated = await this.update(existing.configId, data);
                return updated!;
            } else {
                return await this.create({
                    ...data,
                    tenantId,
                    environment,
                });
            }
        } catch (error: any) {
            throw new Error(`Error upserting MRA config: ${error.message}`);
        }
    }

    /**
     * Check if tenant has valid MRA configuration
     */
    static async hasValidConfig(tenantId: string, environment?: MraEnvironment): Promise<boolean> {
        try {
            const condition: any = {
                tenantId,
                isActive: true,
                apiKey: { not: null },
            };

            if (environment) {
                condition.environment = environment;
            }

            const count = await prisma.mRA_API_CONFIG_TABLE.count({
                where: condition,
            });

            return count > 0;
        } catch (error) {
            console.error('Error checking MRA config validity:', error);
            return false;
        }
    }

    /**
     * Map database record to MraApiConfig interface
     */
    private static mapToMraApiConfig(record: any): MraApiConfig {
        return {
            configId: record.configId,
            tenantId: record.tenantId,
            environment: record.environment as MraEnvironment,
            apiBaseUrl: record.apiBaseUrl,
            apiKey: record.apiKey || undefined,
            apiSecret: record.apiSecret || undefined,
            lastSyncTimestamp: record.lastSyncTimestamp || undefined,
            syncStatus: record.syncStatus || undefined,
            isActive: record.isActive ?? true,
            createdAt: record.createdAt || undefined,
            updatedAt: record.updatedAt || undefined,
        };
    }
}
