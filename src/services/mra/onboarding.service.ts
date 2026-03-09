/**
 * MRA Onboarding Service
 * 
 * Handles MRA terminal onboarding:
 * - Terminal activation with TAC
 * - Activation confirmation
 * - Onboarding status tracking
 */

import { MraApiConfigModel } from '../../models/mra-api-config.model';
import { TerminalModel } from '../../models/terminal.model';
import { MraBaseService } from './base.service';
import {
    MraEnvironment,
    MraTerminalActivationRequest,
    MraTerminalActivationResponse,
    MraActivationConfirmationRequest,
    MraActivationConfirmationResponse,
    MraActivateTerminalInput,
    MraActivateTerminalResult,
    MraOnboardingStatus,
} from '../../types/mra.types';
import { MraConfigurationService } from './configuration.service';

/**
 * MRA Onboarding Service for terminal activation and setup
 */
export class MraOnboardingService {
    /**
     * Step 1: Activate terminal with TAC (Terminal Activation Code)
     * 
     * The TAC is obtained by the taxpayer from the MRA EIS Portal after applying for a terminal.
     * This endpoint validates the TAC and returns configuration data.
     */
    static async activateTerminal(input: MraActivateTerminalInput): Promise<MraActivateTerminalResult> {
        const { tenantId, branchId: _branchId, terminalId, tac, environment = MraEnvironment.SANDBOX } = input;

        try {
            // Get or create API configuration
            const apiConfig = await MraConfigurationService.ensureApiConfig(tenantId, environment);
            const client = MraBaseService.getAxiosInstance(apiConfig.apiBaseUrl, apiConfig.apiKey);

            // Get terminal details
            const terminal = await TerminalModel.findById(terminalId);
            if (!terminal) {
                return {
                    success: false,
                    message: 'Terminal not found',
                    requiresConfirmation: false,
                };
            }

            // Prepare activation request
            const activationRequest: MraTerminalActivationRequest = {
                tac,
                terminalId: terminal.terminalId,
                deviceId: terminal.deviceId || undefined,
                osName: terminal.osName || undefined,
                osVersion: terminal.osVersion || undefined,
                posProductId: terminal.posProductId || undefined,
                posProductVersion: terminal.posProductVersion || undefined,
            };

            // Call MRA activation endpoint
            const response = await client.post<MraTerminalActivationResponse>(
                '/terminal/activate',
                activationRequest
            );

            if (!response.data.success || !response.data.data) {
                return {
                    success: false,
                    message: response.data.message || 'Activation failed',
                    requiresConfirmation: false,
                };
            }

            const { terminalId: mraTerminalId, taxpayerInfo, terminalConfig, securityKeys } = response.data.data;

            // Persist MRA configuration
            await MraApiConfigModel.update(apiConfig.configId, {
                apiKey: securityKeys.secretKey,  // Store as API key for HMAC signing
                apiSecret: securityKeys.ivKey,
                lastSyncTimestamp: new Date(),
                syncStatus: 'SUCCESS',
            });

            // Update terminal with MRA terminal ID and configuration
            await TerminalModel.update(terminalId, {
                mraTerminalId,
                activationCode: tac,  // Store TAC for reference
                mraApplicationStatus: 'APPROVED',
                terminalConfigVersion: terminalConfig.configVersion,
                offlineMaxTransactionAgeHours: terminalConfig.maxOfflineTransactionAge,
                offlineMaxCumulativeAmount: terminalConfig.maxOfflineCumulativeAmount,
            });

            return {
                success: true,
                mraTerminalId,
                message: 'Terminal activated. Please confirm activation.',
                taxpayerInfo,
                requiresConfirmation: true,
            };

        } catch (error: unknown) {
            console.error('[MRA] Terminal activation error:', error);

            const errorMessage = MraBaseService.handleApiError(error);
            return {
                success: false,
                message: errorMessage,
                requiresConfirmation: false,
            };
        }
    }

    /**
     * Step 2: Confirm terminal activation
     * 
     * After successfully persisting the configuration, the terminal must confirm
     * activation with MRA. The TAC expires after this confirmation.
     */
    static async confirmActivation(
        tenantId: string,
        terminalId: string,
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<{ success: boolean; message: string }> {
        try {
            const apiConfig = await MraConfigurationService.getApiConfig(tenantId, environment);
            if (!apiConfig) {
                return { success: false, message: 'MRA API configuration not found' };
            }

            const terminal = await TerminalModel.findById(terminalId);
            if (!terminal) {
                return { success: false, message: 'Terminal not found' };
            }

            if (!terminal.mraTerminalId) {
                return { success: false, message: 'Terminal not yet activated with MRA' };
            }

            const client = MraBaseService.getAxiosInstance(apiConfig.apiBaseUrl, apiConfig.apiKey);

            const confirmRequest: MraActivationConfirmationRequest = {
                terminalId: terminal.mraTerminalId,
                configVersion: Number(terminal.terminalConfigVersion) || 1,
                deviceInfo: {
                    deviceId: terminal.deviceId || '',
                    osName: terminal.osName || '',
                    osVersion: terminal.osVersion || '',
                    posProductId: terminal.posProductId || '',
                    posProductVersion: terminal.posProductVersion || '',
                },
            };

            // Sign the request
            const signature = MraBaseService.generateSignature(confirmRequest, apiConfig.apiKey || '');

            const response = await client.post<MraActivationConfirmationResponse>(
                '/terminal/confirm-activation',
                confirmRequest,
                {
                    headers: {
                        'X-Signature': signature,
                    },
                }
            );

            if (!response.data.success) {
                return {
                    success: false,
                    message: response.data.message || 'Activation confirmation failed',
                };
            }

            // Update terminal activation status
            await TerminalModel.update(terminalId, {
                activationStatus: 'ACTIVATED',
                activationDate: new Date(),
            });

            return {
                success: true,
                message: 'Terminal activation confirmed successfully',
            };

        } catch (error: unknown) {
            console.error('[MRA] Activation confirmation error:', error);
            return {
                success: false,
                message: MraBaseService.handleApiError(error),
            };
        }
    }

    /**
     * Get MRA onboarding status for a terminal
     */
    static async getOnboardingStatus(
        tenantId: string,
        branchId: string,
        terminalId: string,
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<MraOnboardingStatus> {
        const terminal = await TerminalModel.findById(terminalId);
        const apiConfig = await MraConfigurationService.getApiConfig(tenantId, environment);

        return {
            tenantId,
            branchId,
            terminalId,
            mraTerminalId: terminal?.mraTerminalId || undefined,
            status: MraBaseService.mapActivationStatus(terminal?.activationStatus),
            tacUsed: !!terminal?.activationCode,
            configPersisted: !!apiConfig && !!apiConfig.apiKey,
            activationConfirmed: terminal?.activationStatus === 'ACTIVATED',
            lastConfigSync: apiConfig?.lastSyncTimestamp || undefined,
            configVersion: terminal?.terminalConfigVersion ? Number(terminal.terminalConfigVersion) : undefined,
        };
    }

    /**
     * Check if terminal is activated with MRA
     */
    static async isTerminalActivated(terminalId: string): Promise<boolean> {
        const terminal = await TerminalModel.findById(terminalId);
        return terminal?.activationStatus === 'ACTIVATED' && !!terminal?.mraTerminalId;
    }

    /**
     * Deactivate terminal with MRA (for terminal transfer/replacement)
     */
    static async deactivateTerminal(
        tenantId: string,
        terminalId: string,
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<{ success: boolean; message: string }> {
        try {
            const apiConfig = await MraConfigurationService.getApiConfig(tenantId, environment);
            if (!apiConfig) {
                return { success: false, message: 'MRA API configuration not found' };
            }

            const terminal = await TerminalModel.findById(terminalId);
            if (!terminal?.mraTerminalId) {
                return { success: false, message: 'Terminal not activated with MRA' };
            }

            const client = MraBaseService.getAxiosInstance(apiConfig.apiBaseUrl, apiConfig.apiKey);

            const request = { terminalId: terminal.mraTerminalId };
            const signature = MraBaseService.generateSignature(request, apiConfig.apiKey || '');

            const response = await client.post<{ success: boolean; message?: string }>(
                '/terminal/deactivate',
                request,
                {
                    headers: {
                        'X-Signature': signature,
                    },
                }
            );

            if (response.data.success) {
                // Update local terminal status
                await TerminalModel.update(terminalId, {
                    activationStatus: 'DEACTIVATED',
                    mraTerminalId: null,
                });
            }

            return {
                success: response.data.success,
                message: response.data.message || 'Terminal deactivated',
            };

        } catch (error: unknown) {
            console.error('[MRA] Terminal deactivation error:', error);
            return {
                success: false,
                message: MraBaseService.handleApiError(error),
            };
        }
    }
}
