/**
 * MRA Offline Sync Service
 * 
 * Handles offline operations and synchronization:
 * - Offline signature generation
 * - Queue management for offline transactions
 * - Batch synchronization when connection restored
 * - Conflict resolution
 */

import { MraSubmissionModel, MraSubmission } from '../../models/mra-submission.model';
import { TerminalModel } from '../../models/terminal.model';
import { MraBaseService, MRA_HEADERS } from './base.service';
import { MraConfigurationService } from './configuration.service';
import {
    MraEnvironment,
    MraOfflineSignatureRequest,
    MraSaleSubmissionRequest,
    MraSaleSubmissionResponse,
} from '../../types/mra.types';

/**
 * Offline submission queue item
 */
interface OfflineQueueItem {
    id: string;
    terminalId: string | null;
    saleId: string;
    saleData: MraSaleSubmissionRequest;
    createdAt: Date;
    attemptCount: number;
}

/**
 * Sync result for batch operations
 */
interface SyncResult {
    success: boolean;
    submissionId: string;
    mraInvoiceId?: string;
    error?: string;
}

/**
 * MRA Offline Sync Service for offline operations
 */
export class MraOfflineSyncService {
    /**
     * Generate offline signature for a transaction
     * 
     * Used when the terminal cannot connect to MRA servers.
     * This creates a locally-signed transaction that can be verified later.
     */
    static generateOfflineSignature(
        request: MraOfflineSignatureRequest
    ): { signature: string; timestamp: Date } {
        const timestamp = new Date();

        const payloadData = request.payload as Record<string, unknown>;
        const payload = {
            ...payloadData,
            timestamp: timestamp.toISOString(),
            offlineMode: true,
        };

        // Generate signature using the terminal's secret key
        const signature = MraBaseService.generateSignature(payload, request.secretKey);

        return {
            signature,
            timestamp,
        };
    }

    /**
     * Queue a sale for offline submission
     */
    static async queueOfflineSale(
        tenantId: string,
        branchId: string,
        terminalId: string,
        saleId: string,
        saleData: MraSaleSubmissionRequest,
        _secretKey: string
    ): Promise<{ success: boolean; queueId?: string; message?: string }> {
        try {
            // Store in the MRA submission table with PENDING status
            const submission = await MraSubmissionModel.create({
                data: {
                    tenantId,
                    branchId,
                    terminalId,
                    saleId,
                    status: 'PENDING',
                    requestPayload: saleData as unknown,
                },
            });

            console.log(`[MRA] Sale queued for offline sync: ${submission.id}`);

            return {
                success: true,
                queueId: submission.id,
                message: 'Sale queued for offline synchronization',
            };

        } catch (error: unknown) {
            console.error('[MRA] Queue offline sale error:', error);
            return {
                success: false,
                message: `Failed to queue sale: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }

    /**
     * Get all pending offline submissions for a terminal
     */
    static async getPendingSubmissions(
        terminalId: string
    ): Promise<{ success: boolean; data?: OfflineQueueItem[]; message?: string }> {
        try {
            const submissions = await MraSubmissionModel.findMany({
                where: {
                    terminalId,
                    status: 'PENDING',
                },
                orderBy: {
                    createdAt: 'asc',
                },
            });

            const queueItems: OfflineQueueItem[] = submissions.map((s: MraSubmission) => ({
                id: s.id,
                terminalId: s.terminalId,
                saleId: s.saleId,
                saleData: s.requestPayload as MraSaleSubmissionRequest,
                createdAt: s.createdAt,
                attemptCount: s.attemptCount,
            }));

            return {
                success: true,
                data: queueItems,
            };

        } catch (error: unknown) {
            console.error('[MRA] Get pending submissions error:', error);
            return {
                success: false,
                message: `Failed to get pending submissions: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }

    /**
     * Sync a single pending submission
     */
    static async syncSubmission(
        tenantId: string,
        submissionId: string,
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<SyncResult> {
        try {
            const submission = await MraSubmissionModel.findById(submissionId);
            if (!submission) {
                return {
                    success: false,
                    submissionId,
                    error: 'Submission not found',
                };
            }

            const apiConfig = await MraConfigurationService.getApiConfig(tenantId, environment);
            if (!apiConfig) {
                return {
                    success: false,
                    submissionId,
                    error: 'API configuration not found',
                };
            }

            const saleData = submission.requestPayload as MraSaleSubmissionRequest;

            const credentials = {
                secretKey: apiConfig.apiKey || undefined,
                jwtToken: apiConfig.apiSecret || undefined,
            };

            const client = MraBaseService.getAxiosInstance(apiConfig.apiBaseUrl, credentials);

            // Include offline timestamp to indicate this was created offline
            const request = {
                ...saleData,
                offlineTimestamp: submission.createdAt.toISOString(),
            };

            const config = MraBaseService.createRequestConfig(
                request,
                apiConfig.apiKey || undefined,
                apiConfig.apiSecret || undefined
            );

            // Add offline sync header
            if (config.headers) {
                config.headers['X-Offline-Sync'] = 'true';
            }

            // Mark as processing
            await MraSubmissionModel.markAsProcessing(submissionId);

            const response = await client.post<MraSaleSubmissionResponse>(
                '/sales/submit-offline-transaction',
                request,
                config
            );

            if (response.data.success && response.data.data) {
                // Update submission status to SUCCESS
                await MraSubmissionModel.markAsSuccess(submissionId, response.data);

                return {
                    success: true,
                    submissionId,
                    mraInvoiceId: response.data.data.mraInvoiceId,
                };
            }

            // Mark as failed
            await MraSubmissionModel.markAsFailed(
                submissionId,
                response.data.error?.message || 'Unknown error'
            );

            return {
                success: false,
                submissionId,
                error: response.data.error?.message || 'Submission failed',
            };

        } catch (error: unknown) {
            console.error(`[MRA] Sync submission ${submissionId} error:`, error);

            // Mark as failed on error
            await MraSubmissionModel.markAsFailed(
                submissionId,
                error instanceof Error ? error.message : 'Unknown error'
            ).catch((err) => console.error('[MRA] Error marking submission as failed:', err));

            return {
                success: false,
                submissionId,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Sync all pending submissions for a terminal
     */
    static async syncAllPending(
        tenantId: string,
        terminalId: string,
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<{
        success: boolean;
        results: SyncResult[];
        summary: {
            total: number;
            successful: number;
            failed: number;
        };
    }> {
        const pendingResult = await this.getPendingSubmissions(terminalId);

        if (!pendingResult.success || !pendingResult.data) {
            return {
                success: false,
                results: [],
                summary: { total: 0, successful: 0, failed: 0 },
            };
        }

        const results: SyncResult[] = [];
        let successful = 0;
        let failed = 0;

        // Process submissions sequentially to maintain order
        for (const item of pendingResult.data) {
            const result = await this.syncSubmission(tenantId, item.id, environment);
            results.push(result);

            if (result.success) {
                successful++;
            } else {
                failed++;
            }

            // Add small delay between submissions
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`[MRA] Sync complete for terminal ${terminalId}: ${successful} successful, ${failed} failed`);

        return {
            success: true,
            results,
            summary: {
                total: pendingResult.data.length,
                successful,
                failed,
            },
        };
    }

    /**
     * Check if terminal has pending offline submissions
     */
    static async hasPendingSubmissions(terminalId: string): Promise<boolean> {
        try {
            const count = await MraSubmissionModel.count({
                where: {
                    terminalId,
                    status: 'PENDING',
                },
            });
            return count > 0;
        } catch {
            return false;
        }
    }

    /**
     * Retry failed submissions
     */
    static async retryFailedSubmissions(
        tenantId: string,
        terminalId: string,
        maxRetries = 3,
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<{
        success: boolean;
        retried: number;
        still_failed: number;
    }> {
        try {
            const failedSubmissions = await MraSubmissionModel.getFailedForRetry(terminalId, maxRetries);

            let retried = 0;
            let stillFailed = 0;

            for (const submission of failedSubmissions) {
                const result = await this.syncSubmission(
                    tenantId,
                    submission.id,
                    environment
                );

                if (result.success) {
                    retried++;
                } else {
                    stillFailed++;
                }

                // Add delay between retries
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            return {
                success: true,
                retried,
                still_failed: stillFailed,
            };

        } catch (error: unknown) {
            console.error('[MRA] Retry failed submissions error:', error);
            return {
                success: false,
                retried: 0,
                still_failed: 0,
            };
        }
    }

    /**
     * Clear synced submissions older than specified days
     */
    static async clearOldSyncedSubmissions(
        terminalId: string,
        olderThanDays = 30
    ): Promise<{ success: boolean; deleted: number; message?: string }> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

            const result = await MraSubmissionModel.deleteMany({
                where: {
                    terminalId,
                    status: 'SUCCESS',
                    updatedAt: { lt: cutoffDate },
                },
            });

            return {
                success: true,
                deleted: result.count,
            };

        } catch (error: unknown) {
            console.error('[MRA] Clear old submissions error:', error);
            return {
                success: false,
                deleted: 0,
                message: `Failed to clear old submissions: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }

    /**
     * Get offline mode status for a terminal
     */
    static async getOfflineStatus(
        terminalId: string
    ): Promise<{
        isOffline: boolean;
        pendingCount: number;
        failedCount: number;
        lastSyncAttempt?: Date;
    }> {
        try {
            const terminal = await TerminalModel.findById(terminalId);

            const [pendingCount, failedCount] = await Promise.all([
                MraSubmissionModel.count({
                    where: { terminalId, status: 'PENDING' },
                }),
                MraSubmissionModel.count({
                    where: { terminalId, status: 'FAILED' },
                }),
            ]);

            return {
                isOffline: pendingCount > 0 || failedCount > 0,
                pendingCount,
                failedCount,
                lastSyncAttempt: terminal?.updatedAt,
            };

        } catch {
            return {
                isOffline: true,
                pendingCount: 0,
                failedCount: 0,
            };
        }
    }
}
