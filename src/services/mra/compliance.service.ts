/**
 * MRA Compliance Service
 * 
 * Centralized service for MRA compliance decision logic.
 * Determines when MRA submission is required and manages the submission flow.
 * 
 * Use Cases:
 * - Non-MRA tenants: Skip MRA completely, mark sales as NOT_APPLICABLE
 * - MRA tenants with unactivated terminals: Queue for later submission
 * - MRA tenants with activated terminals: Submit in real-time
 */

import { prisma } from '../../databases/prisma/client';
import { TenantModel } from '../../models/tenant.model';
import { TerminalModel } from '../../models/terminal.model';
import { MraSalesService } from './sales.service';
import { MraOfflineSyncService } from './offline-sync.service';
import { MraEnvironment, MraSaleSubmissionRequest } from '../../types/mra.types';
import { Tenant } from 'tenant';

/**
 * MRA compliance status for a tenant/terminal combination
 */
export interface MraComplianceStatus {
    /** Whether MRA compliance is enabled for this tenant */
    isMraEnabled: boolean;
    /** Whether the terminal is activated with MRA */
    isTerminalActivated: boolean;
    /** Whether real-time MRA submission should occur */
    shouldSubmitRealtime: boolean;
    /** Whether sale should be queued for later MRA submission */
    shouldQueueForSync: boolean;
    /** MRA environment (SANDBOX/PRODUCTION) */
    environment: MraEnvironment;
    /** Human-readable status message */
    message: string;
}

/**
 * Result of MRA sale submission attempt
 */
export interface MraSaleSubmissionResult {
    /** Whether submission was attempted or skipped */
    attempted: boolean;
    /** Whether submission succeeded */
    success: boolean;
    /** MRA status to store on sale */
    mraStatus: 'NONE' | 'NOT_APPLICABLE' | 'PENDING' | 'SYNCED' | 'FAILED';
    /** MRA submission ID (if successful) */
    mraSubmissionId?: string;
    /** MRA QR code (if successful) */
    mraQrCode?: string;
    /** MRA verification URL (if successful) */
    mraVerificationUrl?: string;
    /** Error message (if failed) */
    errorMessage?: string;
}

export class MraComplianceService {
    /**
     * Check MRA compliance status for a tenant/terminal
     * This is the single source of truth for whether MRA submission is required.
     * 
     * @param tenantId - Tenant identifier
     * @param terminalId - Terminal identifier (optional for tenant-level check)
     * @returns MRA compliance status
     */
    static async getComplianceStatus(
        tenantId: string,
        terminalId?: string
    ): Promise<MraComplianceStatus> {
        const tenant = await TenantModel.findById(tenantId);

        if (!tenant) {
            return {
                isMraEnabled: false,
                isTerminalActivated: false,
                shouldSubmitRealtime: false,
                shouldQueueForSync: false,
                environment: MraEnvironment.SANDBOX,
                message: 'Tenant not found',
            };
        }

        // If MRA is not enabled, skip entirely
        if (!tenant.isMraEnabled) {
            return {
                isMraEnabled: false,
                isTerminalActivated: false,
                shouldSubmitRealtime: false,
                shouldQueueForSync: false,
                environment: MraEnvironment.SANDBOX,
                message: 'MRA compliance not enabled for this tenant',
            };
        }

        const environment = this.getEnvironment(tenant);

        // If no terminal specified, return tenant-level status
        if (!terminalId) {
            return {
                isMraEnabled: true,
                isTerminalActivated: false,
                shouldSubmitRealtime: false,
                shouldQueueForSync: true,
                environment,
                message: 'MRA enabled, terminal activation status unknown',
            };
        }

        // Check terminal activation status
        const terminal = await TerminalModel.findById(terminalId);
        const isActivated = terminal?.activationStatus === 'ACTIVATED' && !!terminal?.mraTerminalId;

        return {
            isMraEnabled: true,
            isTerminalActivated: isActivated,
            shouldSubmitRealtime: isActivated,
            shouldQueueForSync: !isActivated,
            environment,
            message: isActivated
                ? 'MRA enabled, terminal activated - real-time submission'
                : 'MRA enabled, terminal not activated - queue for sync',
        };
    }

    /**
     * Process a sale for MRA compliance
     * Determines whether to submit, queue, or skip based on tenant/terminal status.
     * 
     * @param tenantId - Tenant identifier
     * @param terminalId - Terminal identifier
     * @param saleId - Sale identifier (for tracking)
     * @param saleData - Sale data for MRA submission
     * @returns Submission result with MRA status
     */
    static async processSaleForMra(
        tenantId: string,
        terminalId: string,
        saleId: string,
        saleData: MraSaleSubmissionRequest
    ): Promise<MraSaleSubmissionResult> {
        const status = await this.getComplianceStatus(tenantId, terminalId);

        // Non-MRA tenant - skip submission entirely
        if (!status.isMraEnabled) {
            return {
                attempted: false,
                success: true,
                mraStatus: 'NOT_APPLICABLE',
            };
        }

        // MRA enabled with activated terminal - submit real-time
        if (status.shouldSubmitRealtime) {
            return await this.submitRealtime(tenantId, terminalId, saleData, status.environment);
        }

        // MRA enabled but terminal not activated - queue for later sync
        if (status.shouldQueueForSync) {
            return await this.queueForSync(tenantId, terminalId, saleId, saleData);
        }

        // Fallback - should not reach here
        return {
            attempted: false,
            success: true,
            mraStatus: 'NONE',
        };
    }

    /**
     * Submit sale to MRA in real-time
     * Used when terminal is activated and online.
     */
    private static async submitRealtime(
        tenantId: string,
        terminalId: string,
        saleData: MraSaleSubmissionRequest,
        environment: MraEnvironment
    ): Promise<MraSaleSubmissionResult> {
        try {
            const response = await MraSalesService.submitSale(
                tenantId,
                terminalId,
                saleData,
                environment
            );

            if (response.success && response.data) {
                return {
                    attempted: true,
                    success: true,
                    mraStatus: 'SYNCED',
                    mraSubmissionId: response.data.mraInvoiceId,
                    mraQrCode: response.data.qrCodeData,
                    mraVerificationUrl: response.data.verificationUrl,
                };
            }

            return {
                attempted: true,
                success: false,
                mraStatus: 'FAILED',
                errorMessage: response.message || 'MRA submission failed',
            };

        } catch (error) {
            console.error('[MRA] Real-time submission error:', error);
            return {
                attempted: true,
                success: false,
                mraStatus: 'FAILED',
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Queue sale for later MRA submission
     * Used when terminal is not activated or offline.
     */
    private static async queueForSync(
        tenantId: string,
        terminalId: string,
        saleId: string,
        saleData: MraSaleSubmissionRequest
    ): Promise<MraSaleSubmissionResult> {
        try {
            // Get branch ID from terminal
            const terminal = await TerminalModel.findById(terminalId);
            if (!terminal?.branchId) {
                return {
                    attempted: false,
                    success: false,
                    mraStatus: 'FAILED',
                    errorMessage: 'Terminal or branch not found',
                };
            }

            // Queue for offline sync (secretKey is not needed for queuing, passed empty)
            await MraOfflineSyncService.queueOfflineSale(
                tenantId,
                terminal.branchId,
                terminalId,
                saleId,
                saleData,
                '' // secretKey not needed for queuing, will be retrieved during sync
            );

            return {
                attempted: false,
                success: true,
                mraStatus: 'PENDING',
            };

        } catch (error) {
            console.error('[MRA] Queue for sync error:', error);
            return {
                attempted: false,
                success: false,
                mraStatus: 'FAILED',
                errorMessage: error instanceof Error ? error.message : 'Failed to queue for sync',
            };
        }
    }

    /**
     * Update sale with MRA submission result
     */
    static async updateSaleWithMraResult(
        saleId: string,
        result: MraSaleSubmissionResult
    ): Promise<void> {
        await prisma.sale.update({
            where: { id: saleId },
            data: {
                mraStatus: result.mraStatus,
                mraSubmissionId: result.mraSubmissionId,
                mraQrCode: result.mraQrCode,
                mraVerificationUrl: result.mraVerificationUrl,
                mraLastSyncAt: result.success ? new Date() : undefined,
            },
        });
    }

    /**
     * Enable MRA compliance for a tenant
     */
    static async enableMraCompliance(
        tenantId: string,
        environment: MraEnvironment = MraEnvironment.SANDBOX,
        activationOptions?: { terminalId?: string; tac?: string; branchId?: string }
    ): Promise<{ success: boolean; message: string; mraTerminalId?: string; taxpayerInfo?: any }> {
        try {
            await TenantModel.update(tenantId, {
                isMraEnabled: true,
                mraEnvironment: environment,
            });

            if (activationOptions?.tac && activationOptions?.terminalId) {
                const { MraOnboardingService } = await import('./onboarding.service');

                const activationResult = await MraOnboardingService.activateTerminal({
                    tenantId,
                    branchId: activationOptions.branchId || '',
                    terminalId: activationOptions.terminalId,
                    tac: activationOptions.tac,
                    environment,
                });

                if (!activationResult.success) {
                    return {
                        success: false,
                        message: `MRA enabled but terminal activation failed: ${activationResult.message}`,
                    };
                }

                return {
                    success: true,
                    message: `MRA compliance enabled and terminal activated in ${environment} mode`,
                    mraTerminalId: activationResult.mraTerminalId,
                    taxpayerInfo: activationResult.taxpayerInfo,
                };
            }

            return {
                success: true,
                message: `MRA compliance enabled for tenant in ${environment} mode`,
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to enable MRA compliance',
            };
        }
    }

    /**
     * Disable MRA compliance for a tenant
     */
    static async disableMraCompliance(
        tenantId: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            await TenantModel.update(tenantId, {
                isMraEnabled: false,
            });

            return {
                success: true,
                message: 'MRA compliance disabled for tenant',
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to disable MRA compliance',
            };
        }
    }

    /**
     * Switch MRA environment for a tenant (SANDBOX <-> PRODUCTION)
     */
    static async switchMraEnvironment(
        tenantId: string,
        environment: MraEnvironment
    ): Promise<{ success: boolean; message: string }> {
        try {
            const tenant = await TenantModel.findById(tenantId);
            if (!tenant?.isMraEnabled) {
                return {
                    success: false,
                    message: 'MRA compliance must be enabled before switching environments',
                };
            }

            await TenantModel.update(tenantId, {
                mraEnvironment: environment,
            });

            return {
                success: true,
                message: `MRA environment switched to ${environment}`,
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to switch MRA environment',
            };
        }
    }

    /**
     * Get MRA environment from tenant
     */
    private static getEnvironment(tenant: Tenant): MraEnvironment {
        const env = tenant.mraEnvironment as string || 'SANDBOX';
        return env === 'PRODUCTION' ? MraEnvironment.PRODUCTION : MraEnvironment.SANDBOX;
    }

    /**
     * Check if a sale requires MRA fiscal data (QR code, verification URL)
     * Used for receipt printing to determine if fiscal info should be shown.
     */
    static async requiresFiscalData(tenantId: string): Promise<boolean> {
        const tenant = await TenantModel.findById(tenantId);
        return tenant?.isMraEnabled === true;
    }
}
