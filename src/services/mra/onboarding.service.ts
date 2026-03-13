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
import { mraEvents } from './events.service';

/**
 * MRA Onboarding Service for terminal activation and setup
 */
export class MraOnboardingService {
    /**
     * Step 1: Activate terminal with TAC (Terminal Activation Code)
     * 
     * The TAC is obtained by the taxpayer from the MRA EIS Portal after applying for a terminal.
     * This endpoint validates the TAC and returns configuration data.
     * 
     * NOTE: This endpoint does NOT require Authorization header - no JWT exists yet.
     * The TAC is sent only in the request body.
     * 
     * @see https://dev-eis-api.mra.mw/docs/terminal_activation.htm
     */
    static async activateTerminal(input: MraActivateTerminalInput): Promise<MraActivateTerminalResult> {
        const { tenantId, branchId: _branchId, terminalId, tac, environment = MraEnvironment.SANDBOX } = input;

        try {
            // Get or create API configuration
            const apiConfig = await MraConfigurationService.ensureApiConfig(tenantId, environment);
            // For TAC activation, NO Authorization header needed - TAC is in body only
            const client = MraBaseService.getAxiosInstance(apiConfig.apiBaseUrl, {});

            // Get terminal details
            const terminal = await TerminalModel.findById(terminalId);
            if (!terminal) {
                return {
                    success: false,
                    message: 'Terminal not found',
                    requiresConfirmation: false,
                };
            }

            // Prepare activation request matching MRA API format
            const activationRequest: MraTerminalActivationRequest = {
                terminalActivationCode: tac,
                environment: {
                    platform: {
                        osName: terminal.osName || 'Linux',
                        osVersion: terminal.osVersion || '1.0.0',
                        osBuild: terminal.osBuild || 'Ubuntu 22.04',
                        macAddress: terminal.macAddress || '00:00:00:00:00:00',
                    },
                    pos: {
                        productID: terminal.posProductId || 'zonse247-pos',
                        productVersion: terminal.posProductVersion || '1.0.0',
                    },
                },
            };

            console.log('[MRA] Activation request:', JSON.stringify(activationRequest, null, 2));

            // Call MRA activation endpoint
            const response = await client.post<MraTerminalActivationResponse>(
                '/onboarding/activate-terminal',
                activationRequest
            );

            console.log('[MRA] Activation response:', JSON.stringify(response.data, null, 2));

            // MRA uses statusCode 1 for success
            if (response.data.statusCode !== 1 || !response.data.data?.activatedTerminal) {
                const errorMsg = response.data.errors?.[0]?.errorMessage || response.data.remark || 'Activation failed';
                return {
                    success: false,
                    message: errorMsg,
                    requiresConfirmation: false,
                };
            }

            const { activatedTerminal, configuration } = response.data.data;
            const mraTerminalId = activatedTerminal.terminalId;
            const credentials = activatedTerminal.terminalCredentials;
            const terminalConfig = configuration?.terminalConfiguration;
            const taxpayerConfig = configuration?.taxpayerConfiguration;

            // Persist MRA credentials
            if (credentials?.secretKey) {
                await MraApiConfigModel.update(apiConfig.configId, {
                    apiKey: credentials.secretKey,  // Store secretKey for HMAC signing
                    apiSecret: credentials.jwtToken || undefined, // Store JWT token
                    lastSyncTimestamp: new Date(),
                    syncStatus: 'SUCCESS',
                });
            }

            // Update terminal with MRA terminal ID and configuration
            await TerminalModel.update(terminalId, {
                mraTerminalId: mraTerminalId || undefined,
                activationCode: tac,  // Store TAC for confirmation step
                mraApplicationStatus: 'APPROVED',
                terminalConfigVersion: terminalConfig?.versionNo,
                offlineMaxTransactionAgeHours: terminalConfig?.offlineLimit?.maxTransactionAgeInHours,
                offlineMaxCumulativeAmount: terminalConfig?.offlineLimit?.maxCummulativeAmount,
            });

            // Build taxpayer info for event
            const taxpayerInfo = {
                tpin: taxpayerConfig?.tin || '',
                taxpayerName: terminalConfig?.tradingName || '',
                tradingName: terminalConfig?.tradingName,
                vatNumber: taxpayerConfig?.isVATRegistered ? taxpayerConfig?.tin : undefined,
            };

            // Emit terminal activated event for post-onboarding sync
            mraEvents.emitTerminalActivated({
                tenantId,
                branchId: _branchId,
                terminalId,
                mraTerminalId: mraTerminalId || '',
                environment,
                taxpayerInfo,
            });

            return {
                success: true,
                mraTerminalId: mraTerminalId || undefined,
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

            const credentials = {
                secretKey: apiConfig.apiKey || undefined,
                jwtToken: apiConfig.apiSecret || undefined, // JWT token stored in apiSecret
            };

            const client = MraBaseService.getAxiosInstance(apiConfig.apiBaseUrl, credentials);

            // Per MRA API, confirmation only requires terminalId
            const confirmRequest: MraActivationConfirmationRequest = {
                terminalId: terminal.mraTerminalId,
            };

            // Build request config with signature
            const config = MraBaseService.createRequestConfig(
                confirmRequest,
                apiConfig.apiKey || undefined,
                apiConfig.apiSecret || undefined
            );

            const response = await client.post<MraActivationConfirmationResponse>(
                '/onboarding/terminal-activated-confirmation',
                confirmRequest,
                config
            );

            // MRA uses statusCode 1 for success
            if (response.data.statusCode !== 1 || !response.data.data) {
                const errorMsg = response.data.errors?.[0]?.errorMessage || response.data.remark || 'Activation confirmation failed';
                return {
                    success: false,
                    message: errorMsg,
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

            const credentials = {
                secretKey: apiConfig.apiKey || undefined,
                jwtToken: apiConfig.apiSecret || undefined,
            };

            const client = MraBaseService.getAxiosInstance(apiConfig.apiBaseUrl, credentials);

            const request = { terminalId: terminal.mraTerminalId };
            const config = MraBaseService.createRequestConfig(
                request,
                apiConfig.apiKey || undefined,
                apiConfig.apiSecret || undefined
            );

            const response = await client.post<{ success: boolean; message?: string }>(
                '/terminal/deactivate',
                request,
                config
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
