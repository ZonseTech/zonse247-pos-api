/**
 * MRA Sales Service
 * 
 * Handles MRA sales/invoice submission:
 * - Submit sale to MRA
 * - Get sale verification data
 * - Handle sale responses
 */

import { TerminalModel } from '../../models/terminal.model';
import { MraBaseService } from './base.service';
import { MraConfigurationService } from './configuration.service';
import {
    MraEnvironment,
    MraSaleSubmissionRequest,
    MraSaleSubmissionResponse,
} from '../../types/mra.types';

/**
 * MRA Sales Service for invoice submission
 */
export class MraSalesService {
    /**
     * Submit a sale/invoice to MRA
     * 
     * Returns verification signature and QR code data that must be printed on the receipt.
     */
    static async submitSale(
        tenantId: string,
        terminalId: string,
        saleData: MraSaleSubmissionRequest,
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<MraSaleSubmissionResponse> {
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

            // Ensure the sale uses the MRA terminal ID
            saleData.terminalId = terminal.mraTerminalId;

            const client = MraBaseService.getAxiosInstance(apiConfig.apiBaseUrl, apiConfig.apiKey);
            const signature = MraBaseService.generateSignature(saleData, apiConfig.apiKey || '');

            const response = await client.post<MraSaleSubmissionResponse>(
                '/sales/submit',
                saleData,
                {
                    headers: {
                        'X-Signature': signature,
                    },
                }
            );

            return response.data;

        } catch (error: unknown) {
            console.error('[MRA] Sale submission error:', error);
            return {
                success: false,
                message: MraBaseService.handleApiError(error),
            };
        }
    }

    /**
     * Submit a refund to MRA
     */
    static async submitRefund(
        tenantId: string,
        terminalId: string,
        refundData: MraSaleSubmissionRequest,
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<MraSaleSubmissionResponse> {
        // Ensure transaction type is set to REFUND
        refundData.transactionType = 'REFUND';
        return this.submitSale(tenantId, terminalId, refundData, environment);
    }

    /**
     * Submit a void/cancellation to MRA
     */
    static async submitVoid(
        tenantId: string,
        terminalId: string,
        voidData: MraSaleSubmissionRequest,
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<MraSaleSubmissionResponse> {
        // Ensure transaction type is set to VOID
        voidData.transactionType = 'VOID';
        return this.submitSale(tenantId, terminalId, voidData, environment);
    }

    /**
     * Get sale verification details from MRA
     */
    static async verifySale(
        tenantId: string,
        terminalId: string,
        invoiceNumber: string,
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

            const client = MraBaseService.getAxiosInstance(apiConfig.apiBaseUrl, apiConfig.apiKey);
            const request = { terminalId: terminal.mraTerminalId, invoiceNumber };
            const signature = MraBaseService.generateSignature(request, apiConfig.apiKey || '');

            const response = await client.post<{ success: boolean; data?: unknown; message?: string }>(
                '/sales/verify',
                request,
                {
                    headers: {
                        'X-Signature': signature,
                    },
                }
            );

            return response.data;

        } catch (error: unknown) {
            console.error('[MRA] Sale verification error:', error);
            return {
                success: false,
                message: MraBaseService.handleApiError(error),
            };
        }
    }

    /**
     * Get sales summary for a date range
     */
    static async getSalesSummary(
        tenantId: string,
        terminalId: string,
        startDate: Date,
        endDate: Date,
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

            const client = MraBaseService.getAxiosInstance(apiConfig.apiBaseUrl, apiConfig.apiKey);
            const request = {
                terminalId: terminal.mraTerminalId,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            };
            const signature = MraBaseService.generateSignature(request, apiConfig.apiKey || '');

            const response = await client.post<{ success: boolean; data?: unknown; message?: string }>(
                '/sales/summary',
                request,
                {
                    headers: {
                        'X-Signature': signature,
                    },
                }
            );

            return response.data;

        } catch (error: unknown) {
            console.error('[MRA] Sales summary error:', error);
            return {
                success: false,
                message: MraBaseService.handleApiError(error),
            };
        }
    }
}
