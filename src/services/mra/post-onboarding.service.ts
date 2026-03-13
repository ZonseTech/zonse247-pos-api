import { prisma } from '../../databases/prisma/client';
import { TenantModel } from '../../models/tenant.model';
import { TerminalModel } from '../../models/terminal.model';
import { MraUtilitiesService } from './utilities.service';
import { MraConfigurationService } from './configuration.service';
import { MraEventsService, MraTerminalActivatedEvent } from './events.service';
import { MraEnvironment } from '../../types/mra.types';

/**
 * Sync result for tracking what was updated
 */
export interface PostOnboardingSyncResult {
    success: boolean;
    tenantUpdated: boolean;
    productsSync: {
        attempted: boolean;
        success: boolean;
        productCount?: number;
        error?: string;
    };
    configSync: {
        attempted: boolean;
        success: boolean;
        error?: string;
    };
    errors: string[];
}

export class MraPostOnboardingService {
    /**
     * Initialize event handlers for post-onboarding tasks
     * Should be called at application startup
     */
    static initialize(): void {
        console.log('[MRA PostOnboarding] Initializing event handlers...');

        // Register handler for terminal activated event
        MraEventsService.onTerminalActivated(async (data) => {
            console.log('[MRA PostOnboarding] Starting post-activation sync for terminal:', data.terminalId);

            try {
                const result = await MraPostOnboardingService.performPostActivationSync(data);

                if (result.success) {
                    console.log('[MRA PostOnboarding] Sync completed successfully:', {
                        terminal: data.terminalId,
                        productsCount: result.productsSync.productCount,
                    });
                } else {
                    console.warn('[MRA PostOnboarding] Sync completed with errors:', result.errors);
                }
            } catch (error) {
                console.error('[MRA PostOnboarding] Fatal sync error:', error);
            }
        });

        console.log('[MRA PostOnboarding] Event handlers initialized');
    }

    /**
     * Perform all post-activation sync operations
     */
    static async performPostActivationSync(
        data: MraTerminalActivatedEvent
    ): Promise<PostOnboardingSyncResult> {
        const result: PostOnboardingSyncResult = {
            success: true,
            tenantUpdated: false,
            productsSync: { attempted: false, success: false },
            configSync: { attempted: false, success: false },
            errors: [],
        };

        // 1. Update tenant with taxpayer info
        try {
            if (data.taxpayerInfo) {
                await this.updateTenantFromTaxpayerInfo(data.tenantId, data.taxpayerInfo);
                result.tenantUpdated = true;
            }
        } catch (error) {
            const errorMsg = `Tenant update failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
            result.errors.push(errorMsg);
            console.error('[MRA PostOnboarding]', errorMsg);
        }

        // 2. Sync products from MRA
        try {
            result.productsSync = await this.syncProducts(
                data.tenantId,
                data.terminalId,
                data.environment
            );
        } catch (error) {
            const errorMsg = `Products sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
            result.errors.push(errorMsg);
            result.productsSync = { attempted: true, success: false, error: errorMsg };
            console.error('[MRA PostOnboarding]', errorMsg);
        }

        // 3. Sync latest configuration
        try {
            result.configSync = await this.syncConfiguration(
                data.tenantId,
                data.terminalId,
                data.environment
            );
        } catch (error) {
            const errorMsg = `Config sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
            result.errors.push(errorMsg);
            result.configSync = { attempted: true, success: false, error: errorMsg };
            console.error('[MRA PostOnboarding]', errorMsg);
        }

        // 4. Initialize offline counters
        try {
            await this.initializeOfflineCounters(data.terminalId);
        } catch (error) {
            const errorMsg = `Offline counters init failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
            result.errors.push(errorMsg);
            console.error('[MRA PostOnboarding]', errorMsg);
        }

        result.success = result.errors.length === 0;
        return result;
    }

    /**
     * Update tenant record with taxpayer information from MRA
     */
    private static async updateTenantFromTaxpayerInfo(
        tenantId: string,
        taxpayerInfo: MraTerminalActivatedEvent['taxpayerInfo']
    ): Promise<void> {
        if (!taxpayerInfo) return;

        const updateData: Record<string, any> = {};

        // Only update if we have valid data and tenant data is missing
        const tenant = await TenantModel.findById(tenantId);
        if (!tenant) return;

        // Update trading name if not set
        if (taxpayerInfo.tradeName && !tenant.tradingName) {
            updateData.tradingName = taxpayerInfo.tradeName;
        }

        // Update address if not set
        if (taxpayerInfo.address && !tenant.address) {
            updateData.address = taxpayerInfo.address;
        }

        // Only update if we have changes
        if (Object.keys(updateData).length > 0) {
            await TenantModel.update(tenantId, updateData);
            console.log('[MRA PostOnboarding] Updated tenant with taxpayer info:', Object.keys(updateData));
        }
    }

    /**
     * Sync products from MRA terminal site
     */
    private static async syncProducts(
        tenantId: string,
        terminalId: string,
        environment: MraEnvironment
    ): Promise<{ attempted: boolean; success: boolean; productCount?: number; error?: string }> {
        const result = await MraUtilitiesService.getTerminalSiteProducts(
            tenantId,
            terminalId,
            environment
        );

        if (!result.success) {
            return {
                attempted: true,
                success: false,
                error: result.message || 'Failed to fetch products from MRA',
            };
        }

        const products = result.data?.products || [];

        if (products.length === 0) {
            console.log('[MRA PostOnboarding] No products to sync from MRA');
            return { attempted: true, success: true, productCount: 0 };
        }

        // Store MRA products for reference (could be used for product mapping)
        // This creates a local cache of MRA-approved products
        let syncedCount = 0;

        for (const mraProduct of products) {
            try {
                await this.upsertMraProduct(tenantId, mraProduct);
                syncedCount++;
            } catch (error) {
                console.error('[MRA PostOnboarding] Failed to sync product:', mraProduct.productCode, error);
            }
        }

        console.log(`[MRA PostOnboarding] Synced ${syncedCount}/${products.length} products from MRA`);

        return {
            attempted: true,
            success: true,
            productCount: syncedCount,
        };
    }

    /**
     * Upsert an MRA product to local cache
     */
    private static async upsertMraProduct(
        tenantId: string,
        mraProduct: any
    ): Promise<void> {
        // Check if we have an MRA products table, if not just log
        // This is a soft implementation - can be extended based on schema
        try {
            // Try to find existing product by code and update MRA-specific fields
            const existingProduct = await prisma.product.findFirst({
                where: {
                    tenantId,
                    OR: [
                        { sku: mraProduct.productCode },
                        { barcode: mraProduct.productCode },
                    ],
                },
            });

            if (existingProduct) {
                // Update MRA-specific fields on existing product
                await prisma.product.update({
                    where: { productId: existingProduct.productId },
                    data: {
                        mraProductCode: mraProduct.productCode,
                        mraCategoryCode: mraProduct.categoryCode,
                        mraUnitOfMeasure: mraProduct.unitOfMeasure,
                        mraVatCategory: mraProduct.vatCategory,
                        mraSyncedAt: new Date(),
                    },
                });
                console.log('[MRA PostOnboarding] Updated existing product with MRA data:', existingProduct.productId);
            } else {
                // Log for manual mapping - product doesn't exist in our system
                console.log('[MRA PostOnboarding] MRA product not found locally:', {
                    code: mraProduct.productCode,
                    name: mraProduct.productName,
                });
            }
        } catch (error) {
            // Fields might not exist in schema - that's okay, just log
            console.debug('[MRA PostOnboarding] Product sync skipped (schema may not support MRA fields):', error);
        }
    }

    /**
     * Sync latest configuration from MRA
     */
    private static async syncConfiguration(
        tenantId: string,
        terminalId: string,
        environment: MraEnvironment
    ): Promise<{ attempted: boolean; success: boolean; error?: string }> {
        try {
            const result = await MraConfigurationService.getLatestConfig(
                tenantId,
                terminalId,
                environment
            );

            return {
                attempted: true,
                success: result.success,
                error: result.success ? undefined : result.message,
            };
        } catch (error) {
            return {
                attempted: true,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Initialize offline transaction counters for the terminal
     * Note: These fields may not exist in all schema versions
     */
    private static async initializeOfflineCounters(terminalId: string): Promise<void> {
        const terminal = await TerminalModel.findById(terminalId);

        if (!terminal) {
            throw new Error('Terminal not found');
        }

        // Cast to any to access optional fields that may not be in type definition
        const terminalData = terminal as any;

        // Initialize counters if not already set
        if (terminalData.offlineTransactionCounter === null || terminalData.offlineTransactionCounter === undefined) {
            try {
                await TerminalModel.update(terminalId, {
                    offlineTransactionCounter: 0,
                    offlineCumulativeAmount: 0,
                    lastOfflineTransactionAt: null,
                } as any);
                console.log('[MRA PostOnboarding] Initialized offline counters for terminal:', terminalId);
            } catch {
                // Fields may not exist in schema - skip initialization
                console.debug('[MRA PostOnboarding] Offline counters not available in schema');
            }
        }
    }

    /**
     * Manually trigger post-onboarding sync (for retry or manual invocation)
     */
    static async triggerSync(
        tenantId: string,
        terminalId: string,
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<PostOnboardingSyncResult> {
        const terminal = await TerminalModel.findById(terminalId);

        if (!terminal?.mraTerminalId) {
            return {
                success: false,
                tenantUpdated: false,
                productsSync: { attempted: false, success: false },
                configSync: { attempted: false, success: false },
                errors: ['Terminal is not activated with MRA'],
            };
        }

        return await this.performPostActivationSync({
            tenantId,
            branchId: terminal.branchId,
            terminalId,
            mraTerminalId: terminal.mraTerminalId,
            environment,
        });
    }
}
