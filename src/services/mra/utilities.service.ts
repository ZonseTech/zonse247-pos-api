/**
 * MRA Utilities Service
 * 
 * Handles utility operations:
 * - Ping/connectivity check
 * - Transaction lookups
 * - Environment configuration
 * - Status monitoring
 */

import { MraSubmissionModel } from '../../models/mra-submission.model';
import { MraBaseService } from './base.service';
import { MraConfigurationService } from './configuration.service';
import {
    MraEnvironment,
    MraPingResponse,
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
}
