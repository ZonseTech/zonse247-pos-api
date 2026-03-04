/**
 * MRA Configuration Service
 * 
 * Handles MRA API configuration management:
 * - Get/create API configuration
 * - Sync latest configuration from MRA
 */

import { MraApiConfigModel } from '../../models/mra-api-config.model';
import { TerminalModel } from '../../models/terminal.model';
import { MraBaseService, MRA_API_URLS } from './base.service';
import {
    MraEnvironment,
    MraApiConfig,
    MraGetConfigRequest,
    MraGetConfigResponse,
} from '../../types/mra.types';

/**
 * MRA Configuration Service
 */
export class MraConfigurationService {
    /**
     * Get MRA API configuration for a tenant
     */
    static async getApiConfig(tenantId: string, environment?: MraEnvironment): Promise<MraApiConfig | null> {
        const env = environment || MraEnvironment.SANDBOX;
        return MraApiConfigModel.findByTenantAndEnvironment(tenantId, env);
    }

    /**
     * Get or create default API configuration for a tenant
     */
    static async ensureApiConfig(
        tenantId: string,
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<MraApiConfig> {
        let config = await this.getApiConfig(tenantId, environment);

        if (!config) {
            config = await MraApiConfigModel.create({
                tenantId,
                environment,
                apiBaseUrl: MRA_API_URLS[environment],
                isActive: true,
            });
        }

        return config;
    }

    /**
     * Get latest configuration from MRA
     * 
     * Should be called:
     * - At the beginning of each business day
     * - Every time the terminal is (re)started
     */
    static async getLatestConfig(
        tenantId: string,
        terminalId: string,
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<MraGetConfigResponse> {
        try {
            const apiConfig = await this.getApiConfig(tenantId, environment);
            if (!apiConfig) {
                return {
                    success: false,
                    message: 'MRA API configuration not found',
                };
            }

            const terminal = await TerminalModel.findById(terminalId);
            if (!terminal?.mraTerminalId) {
                return {
                    success: false,
                    message: 'Terminal not activated with MRA',
                };
            }

            const client = MraBaseService.getAxiosInstance(apiConfig.apiBaseUrl, apiConfig.apiKey);

            const request: MraGetConfigRequest = {
                terminalId: terminal.mraTerminalId,
                currentConfigVersion: Number(terminal.terminalConfigVersion) || 0,
            };

            const signature = MraBaseService.generateSignature(request, apiConfig.apiKey || '');

            const response = await client.post<MraGetConfigResponse>(
                '/terminal/get-config',
                request,
                {
                    headers: {
                        'X-Signature': signature,
                    },
                }
            );

            if (response.data.success && response.data.data?.hasUpdates) {
                // Update stored configuration
                const { terminalConfig, securityKeys } = response.data.data;

                if (terminalConfig) {
                    await TerminalModel.update(terminalId, {
                        terminalConfigVersion: terminalConfig.configVersion,
                        offlineMaxTransactionAgeHours: terminalConfig.maxOfflineTransactionAge,
                        offlineMaxCumulativeAmount: terminalConfig.maxOfflineCumulativeAmount,
                    });
                }

                if (securityKeys) {
                    await MraApiConfigModel.update(apiConfig.configId, {
                        apiKey: securityKeys.secretKey,
                        apiSecret: securityKeys.ivKey,
                        lastSyncTimestamp: new Date(),
                    });
                }
            }

            // Update last sync timestamp
            await MraApiConfigModel.update(apiConfig.configId, {
                lastSyncTimestamp: new Date(),
                syncStatus: 'SUCCESS',
            });

            return response.data;

        } catch (error: unknown) {
            console.error('[MRA] Get config error:', error);
            return {
                success: false,
                message: MraBaseService.handleApiError(error),
            };
        }
    }

    /**
     * Update API configuration
     */
    static async updateApiConfig(
        configId: string,
        data: Partial<MraApiConfig>
    ): Promise<MraApiConfig | null> {
        return MraApiConfigModel.update(configId, data);
    }

    /**
     * Check if tenant has valid MRA configuration
     */
    static async hasValidConfig(tenantId: string, environment?: MraEnvironment): Promise<boolean> {
        return MraApiConfigModel.hasValidConfig(tenantId, environment);
    }
}
