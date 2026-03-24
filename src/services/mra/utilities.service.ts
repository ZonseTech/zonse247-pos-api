import { MraSubmissionModel, } from '../../models/mra-submission.model';
import { TerminalModel } from '../../models/terminal.model';
import { MraBaseService, } from './base.service';
import { MraConfigurationService } from './configuration.service';
import {
    MraEnvironment,
    MraPingResponse,
    MraTerminalProductsResponse,
    MraTinValidationResponse,
    MraBlockingMessageResponse,
    MraUnblockStatusResponse,
    MraVat5ValidationResponse,
} from '../../types/mra.types';

/**
 * MRA Utilities Service for helper operations
 */
export class MraUtilitiesService {
    /**
     * Ping the MRA EIS API to check connectivity
     */
    static async ping(
        tenantId: string,
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<MraPingResponse> {
        try {
            const apiConfig = await MraConfigurationService.getApiConfig(tenantId, environment);

            const baseUrl = apiConfig?.apiBaseUrl || MraBaseService.getApiUrl(environment);
            const client = MraBaseService.getAxiosInstance(baseUrl);

            const response = await client.get<MraPingResponse>('/ping');

            return {
                ...response.data,
                success: true,
            };

        } catch (error: unknown) {
            console.error('[MRA] Ping error:', error);
            return {
                success: false,
                error: {
                    code: 'PING_FAILED',
                    message: MraBaseService.handleApiError(error),
                    timestamp: new Date(),
                },
            };
        }
    }

    /**
     * Get the last online transaction for a terminal
     */
    static async getLastOnlineTransaction(
        _tenantId: string,
        terminalId: string
    ): Promise<{ success: boolean; data?: unknown; message?: string }> {
        try {
            const submissions = await MraSubmissionModel.findMany({
                where: {
                    terminalId,
                    status: 'SUCCESS',
                },
                orderBy: {
                    updatedAt: 'desc',
                },
                take: 1,
            });

            if (submissions.length === 0) {
                return {
                    success: true,
                    data: null,
                    message: 'No online transactions found',
                };
            }

            return {
                success: true,
                data: submissions[0],
            };

        } catch (error: unknown) {
            console.error('[MRA] Get last online transaction error:', error);
            return {
                success: false,
                message: `Failed to get last online transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }

    /**
     * Get the last offline transaction for a terminal
     */
    static async getLastOfflineTransaction(
        _tenantId: string,
        terminalId: string
    ): Promise<{ success: boolean; data?: unknown; message?: string }> {
        try {
            const submissions = await MraSubmissionModel.findMany({
                where: {
                    terminalId,
                    status: 'PENDING',
                },
                orderBy: {
                    createdAt: 'desc',
                },
                take: 1,
            });

            if (submissions.length === 0) {
                return {
                    success: true,
                    data: null,
                    message: 'No offline transactions found',
                };
            }

            return {
                success: true,
                data: submissions[0],
            };

        } catch (error: unknown) {
            console.error('[MRA] Get last offline transaction error:', error);
            return {
                success: false,
                message: `Failed to get last offline transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }

    /**
     * Get all pending (offline) transactions count for a terminal
     */
    static async getPendingTransactionsCount(
        _tenantId: string,
        terminalId: string
    ): Promise<{ success: boolean; count?: number; message?: string }> {
        try {
            const count = await MraSubmissionModel.count({
                where: {
                    terminalId,
                    status: 'PENDING',
                },
            });

            return {
                success: true,
                count,
            };

        } catch (error: unknown) {
            console.error('[MRA] Get pending transactions count error:', error);
            return {
                success: false,
                message: `Failed to count pending transactions: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }

    /**
     * Get submission statistics for a terminal
     */
    static async getSubmissionStats(
        _tenantId: string,
        terminalId: string,
        dateRange?: { startDate: Date; endDate: Date }
    ): Promise<{
        success: boolean;
        data?: {
            totalSubmissions: number;
            successfulSubmissions: number;
            failedSubmissions: number;
            pendingSubmissions: number;
        };
        message?: string;
    }> {
        try {
            const baseWhere: Record<string, unknown> = { terminalId };

            if (dateRange) {
                baseWhere.createdAt = {
                    gte: dateRange.startDate,
                    lte: dateRange.endDate,
                };
            }

            const [total, successful, failed, pending] = await Promise.all([
                MraSubmissionModel.count({ where: baseWhere }),
                MraSubmissionModel.count({ where: { ...baseWhere, status: 'SUCCESS' } }),
                MraSubmissionModel.count({ where: { ...baseWhere, status: 'FAILED' } }),
                MraSubmissionModel.count({ where: { ...baseWhere, status: 'PENDING' } }),
            ]);

            return {
                success: true,
                data: {
                    totalSubmissions: total,
                    successfulSubmissions: successful,
                    failedSubmissions: failed,
                    pendingSubmissions: pending,
                },
            };

        } catch (error: unknown) {
            console.error('[MRA] Get submission stats error:', error);
            return {
                success: false,
                message: `Failed to get submission stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }

    /**
     * Check if MRA service is reachable
     */
    static async isServiceReachable(
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<boolean> {
        try {
            const baseUrl = MraBaseService.getApiUrl(environment);
            const client = MraBaseService.getAxiosInstance(baseUrl);

            const response = await client.get('/ping', { timeout: 5000 });
            return response.status === 200;

        } catch {
            return false;
        }
    }

    /**
     * Get service health status
     */
    static async getServiceHealth(
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<{
        reachable: boolean;
        responseTime?: number;
        environment: string;
        timestamp: Date;
    }> {
        const startTime = Date.now();
        const reachable = await this.isServiceReachable(environment);
        const responseTime = Date.now() - startTime;

        return {
            reachable,
            responseTime: reachable ? responseTime : undefined,
            environment,
            timestamp: new Date(),
        };
    }

    /**
     * Validate environment configuration
     */
    static validateEnvironment(environment: string): MraEnvironment | null {
        const normalized = environment.toUpperCase();
        if (normalized === 'SANDBOX' || normalized === 'PRODUCTION') {
            return normalized as MraEnvironment;
        }
        return null;
    }

    /**
     * Get environment API URL
     */
    static getEnvironmentUrl(environment: MraEnvironment): string {
        return MraBaseService.getApiUrl(environment);
    }

    /**
     * Format error response for consistent error handling
     */
    static formatErrorResponse(
        code: string,
        message: string,
        details?: unknown
    ): {
        success: false;
        error: {
            code: string;
            message: string;
            details?: unknown;
            timestamp: Date;
        };
    } {
        return {
            success: false,
            error: {
                code,
                message,
                details,
                timestamp: new Date(),
            },
        };
    }

    /**
     * Parse MRA error codes
     */
    static parseErrorCode(errorCode: string): {
        category: string;
        description: string;
    } {
        const errorCategories: Record<string, string> = {
            '1': 'Authentication Error',
            '2': 'Validation Error',
            '3': 'Configuration Error',
            '4': 'Transaction Error',
            '5': 'System Error',
        };

        const firstDigit = errorCode.charAt(0);
        return {
            category: errorCategories[firstDigit] || 'Unknown Error',
            description: `Error code: ${errorCode}`,
        };
    }

    // ==================== TERMINAL SITE PRODUCTS ====================

    /**
     * Get terminal site products/services from MRA
     * 
     * Downloads all approved and registered products/services from MRA servers.
     * Ensures that only approved items are listed for sale.
     * 
     * @route GET /v1/utilities/get-terminal-site-products
     */
    static async getTerminalSiteProducts(
        tenantId: string,
        terminalId: string,
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<MraTerminalProductsResponse> {
        try {
            const apiConfig = await MraConfigurationService.getApiConfig(tenantId, environment);
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

            const credentials = {
                secretKey: apiConfig.apiKey || undefined,
                jwtToken: apiConfig.apiSecret || undefined, // JWT stored in apiSecret
            };

            const client = MraBaseService.getAxiosInstance(apiConfig.apiBaseUrl, credentials);

            const requestBody = { terminalId: terminal.mraTerminalId };
            const config = MraBaseService.createRequestConfig(
                requestBody,
                apiConfig.apiKey || undefined,
                apiConfig.apiSecret || undefined
            );

            // MRA API requires POST for this endpoint
            const response = await client.post<MraTerminalProductsResponse>(
                '/utilities/get-terminal-site-products',
                requestBody,
                config
            );

            return response.data;

        } catch (error: unknown) {
            console.error('[MRA] Get terminal site products error:', error);
            return {
                success: false,
                message: MraBaseService.handleApiError(error),
            };
        }
    }

    // ==================== TIN VALIDATION ====================

    /**
     * Validate a Taxpayer Identification Number (TIN)
     * 
     * Verifies if a TIN is valid and retrieves associated taxpayer information.
     */
    static async validateTin(
        tenantId: string,
        terminalId: string,
        tin: string,
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<MraTinValidationResponse> {
        try {
            const apiConfig = await MraConfigurationService.getApiConfig(tenantId, environment);
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

            const credentials = {
                secretKey: apiConfig.apiKey || undefined,
                jwtToken: apiConfig.apiSecret || undefined,
            };

            const client = MraBaseService.getAxiosInstance(apiConfig.apiBaseUrl, credentials);

            const request = { tin };
            const config = MraBaseService.createRequestConfig(
                request,
                apiConfig.apiKey || undefined,
                apiConfig.apiSecret || undefined
            );

            const response = await client.post<MraTinValidationResponse>(
                '/utilities/validate-tin',
                request,
                config
            );

            return response.data;

        } catch (error: unknown) {
            console.error('[MRA] TIN validation error:', error);
            return {
                success: false,
                message: MraBaseService.handleApiError(error),
            };
        }
    }

    // ==================== TERMINAL BLOCKING STATUS ====================

    /**
     * Get terminal blocking message
     * 
     * Checks if the terminal is blocked and retrieves the blocking reason.
     */
    static async getBlockingMessage(
        tenantId: string,
        terminalId: string,
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<MraBlockingMessageResponse> {
        try {
            const apiConfig = await MraConfigurationService.getApiConfig(tenantId, environment);
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

            const credentials = {
                secretKey: apiConfig.apiKey || undefined,
                jwtToken: apiConfig.apiSecret || undefined,
            };

            const client = MraBaseService.getAxiosInstance(apiConfig.apiBaseUrl, credentials);

            const config = MraBaseService.createRequestConfig(
                { terminalId: terminal.mraTerminalId },
                apiConfig.apiKey || undefined,
                apiConfig.apiSecret || undefined
            );

            const response = await client.get<MraBlockingMessageResponse>(
                `/utilities/blocking-message/${terminal.mraTerminalId}`,
                config
            );

            return response.data;

        } catch (error: unknown) {
            console.error('[MRA] Get blocking message error:', error);
            return {
                success: false,
                message: MraBaseService.handleApiError(error),
            };
        }
    }

    /**
     * Check terminal unblock status
     * 
     * Checks if a previously blocked terminal has been unblocked.
     */
    static async checkUnblockStatus(
        tenantId: string,
        terminalId: string,
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<MraUnblockStatusResponse> {
        try {
            const apiConfig = await MraConfigurationService.getApiConfig(tenantId, environment);
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

            const credentials = {
                secretKey: apiConfig.apiKey || undefined,
                jwtToken: apiConfig.apiSecret || undefined,
            };

            const client = MraBaseService.getAxiosInstance(apiConfig.apiBaseUrl, credentials);

            const config = MraBaseService.createRequestConfig(
                { terminalId: terminal.mraTerminalId },
                apiConfig.apiKey || undefined,
                apiConfig.apiSecret || undefined
            );

            const response = await client.get<MraUnblockStatusResponse>(
                `/utilities/check-unblock-status/${terminal.mraTerminalId}`,
                config
            );

            return response.data;

        } catch (error: unknown) {
            console.error('[MRA] Check unblock status error:', error);
            return {
                success: false,
                message: MraBaseService.handleApiError(error),
            };
        }
    }

    // ==================== VAT 5 CERTIFICATE VALIDATION ====================

    /**
     * Validate VAT 5 Certificate
     * 
     * Validates a VAT 5 exemption certificate.
     */
    static async validateVat5Certificate(
        tenantId: string,
        terminalId: string,
        certificateNumber: string,
        supplierTin?: string,
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<MraVat5ValidationResponse> {
        try {
            const apiConfig = await MraConfigurationService.getApiConfig(tenantId, environment);
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

            const credentials = {
                secretKey: apiConfig.apiKey || undefined,
                jwtToken: apiConfig.apiSecret || undefined,
            };

            const client = MraBaseService.getAxiosInstance(apiConfig.apiBaseUrl, credentials);

            const request = {
                certificateNumber,
                ...(supplierTin && { supplierTin }),
            };

            const config = MraBaseService.createRequestConfig(
                request,
                apiConfig.apiKey || undefined,
                apiConfig.apiSecret || undefined
            );

            const response = await client.post<MraVat5ValidationResponse>(
                '/utilities/validate-vat5-certificate',
                request,
                config
            );

            return response.data;

        } catch (error: unknown) {
            console.error('[MRA] VAT 5 certificate validation error:', error);
            return {
                success: false,
                message: MraBaseService.handleApiError(error),
            };
        }
    }

    // ==================== LAST TRANSACTIONS (MRA API) ====================

    /**
     * Get last online transaction from MRA API
     * 
     * Retrieves the last successfully submitted online transaction from MRA servers.
     */
    static async getLastOnlineTransactionFromMra(
        tenantId: string,
        terminalId: string,
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<{ success: boolean; data?: unknown; message?: string }> {
        try {
            const apiConfig = await MraConfigurationService.getApiConfig(tenantId, environment);
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

            const credentials = {
                secretKey: apiConfig.apiKey || undefined,
                jwtToken: apiConfig.apiSecret || undefined,
            };

            const client = MraBaseService.getAxiosInstance(apiConfig.apiBaseUrl, credentials);

            const config = MraBaseService.createRequestConfig(
                { terminalId: terminal.mraTerminalId },
                apiConfig.apiKey || undefined,
                apiConfig.apiSecret || undefined
            );

            const response = await client.get<{ success: boolean; data?: unknown; message?: string }>(
                `/sales/last-online-transaction/${terminal.mraTerminalId}`,
                config
            );

            return response.data;

        } catch (error: unknown) {
            console.error('[MRA] Get last online transaction from MRA error:', error);
            return {
                success: false,
                message: MraBaseService.handleApiError(error),
            };
        }
    }

    /**
     * Get last offline transaction from MRA API
     * 
     * Retrieves the last offline transaction that was successfully synced to MRA.
     */
    static async getLastOfflineTransactionFromMra(
        tenantId: string,
        terminalId: string,
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<{ success: boolean; data?: unknown; message?: string }> {
        try {
            const apiConfig = await MraConfigurationService.getApiConfig(tenantId, environment);
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

            const credentials = {
                secretKey: apiConfig.apiKey || undefined,
                jwtToken: apiConfig.apiSecret || undefined,
            };

            const client = MraBaseService.getAxiosInstance(apiConfig.apiBaseUrl, credentials);

            const config = MraBaseService.createRequestConfig(
                { terminalId: terminal.mraTerminalId },
                apiConfig.apiKey || undefined,
                apiConfig.apiSecret || undefined
            );

            const response = await client.get<{ success: boolean; data?: unknown; message?: string }>(
                `/sales/last-offline-transaction/${terminal.mraTerminalId}`,
                config
            );

            return response.data;

        } catch (error: unknown) {
            console.error('[MRA] Get last offline transaction from MRA error:', error);
            return {
                success: false,
                message: MraBaseService.handleApiError(error),
            };
        }
    }
}
