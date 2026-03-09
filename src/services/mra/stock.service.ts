/**
 * MRA Stock Service
 * 
 * Handles MRA stock/product status operations:
 * - Check product status
 * - Product category mapping
 * - Stock reporting to MRA
 */

import { TerminalModel } from '../../models/terminal.model';
import { MraBaseService } from './base.service';
import { MraConfigurationService } from './configuration.service';
import {
    MraEnvironment,
    MraProductStatusRequest,
    MraProductStatusResponse,
} from '../../types/mra.types';

/**
 * MRA Stock Service for product and stock operations
 */
export class MraStockService {
    /**
     * Check product status in MRA system
     * 
     * Verifies if a product is mapped to MRA standardized category codes.
     */
    static async checkProductStatus(
        tenantId: string,
        terminalId: string,
        productCode: string,
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<MraProductStatusResponse> {
        try {
            const apiConfig = await MraConfigurationService.getApiConfig(tenantId, environment);
            if (!apiConfig) {
                return {
                    success: false,
                    error: {
                        code: 'CONFIG_NOT_FOUND',
                        message: 'MRA API configuration not found',
                        timestamp: new Date(),
                    },
                };
            }

            const terminal = await TerminalModel.findById(terminalId);
            if (!terminal?.mraTerminalId) {
                return {
                    success: false,
                    error: {
                        code: 'TERMINAL_NOT_ACTIVATED',
                        message: 'Terminal not activated with MRA',
                        timestamp: new Date(),
                    },
                };
            }

            const client = MraBaseService.getAxiosInstance(apiConfig.apiBaseUrl, apiConfig.apiKey);

            const request: MraProductStatusRequest = {
                terminalId: terminal.mraTerminalId,
                productCode,
            };

            const signature = MraBaseService.generateSignature(request, apiConfig.apiKey || '');

            const response = await client.post<MraProductStatusResponse>(
                '/products/status',
                request,
                {
                    headers: {
                        'X-Signature': signature,
                    },
                }
            );

            return response.data;

        } catch (error: unknown) {
            return {
                success: false,
                error: {
                    code: 'REQUEST_FAILED',
                    message: MraBaseService.handleApiError(error),
                    timestamp: new Date(),
                },
            };
        }
    }

    /**
     * Register a product with MRA
     */
    static async registerProduct(
        tenantId: string,
        terminalId: string,
        productData: {
            productCode: string;
            productName: string;
            categoryCode: string;
            unitPrice: number;
            unitOfMeasure: string;
            hsCode?: string;
            taxCode?: string;
        },
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
                ...productData,
            };

            const signature = MraBaseService.generateSignature(request, apiConfig.apiKey || '');

            const response = await client.post<{ success: boolean; data?: unknown; message?: string }>(
                '/products/register',
                request,
                {
                    headers: {
                        'X-Signature': signature,
                    },
                }
            );

            return response.data;

        } catch (error: unknown) {
            console.error('[MRA] Product registration error:', error);
            return {
                success: false,
                message: MraBaseService.handleApiError(error),
            };
        }
    }

    /**
     * Update product stock level with MRA
     */
    static async updateStockLevel(
        tenantId: string,
        terminalId: string,
        productCode: string,
        stockLevel: number,
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<{ success: boolean; message?: string }> {
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
                productCode,
                stockLevel,
                updatedAt: new Date().toISOString(),
            };

            const signature = MraBaseService.generateSignature(request, apiConfig.apiKey || '');

            const response = await client.post<{ success: boolean; message?: string }>(
                '/products/stock-update',
                request,
                {
                    headers: {
                        'X-Signature': signature,
                    },
                }
            );

            return response.data;

        } catch (error: unknown) {
            console.error('[MRA] Stock update error:', error);
            return {
                success: false,
                message: MraBaseService.handleApiError(error),
            };
        }
    }

    /**
     * Get MRA product categories
     */
    static async getProductCategories(
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<{ success: boolean; data?: unknown; message?: string }> {
        try {
            const baseUrl = MraBaseService.getApiUrl(environment);
            const client = MraBaseService.getAxiosInstance(baseUrl);

            const response = await client.get<{ success: boolean; data?: unknown; message?: string }>(
                '/products/categories'
            );

            return response.data;

        } catch (error: unknown) {
            console.error('[MRA] Get categories error:', error);
            return {
                success: false,
                message: MraBaseService.handleApiError(error),
            };
        }
    }

    /**
     * Get tax codes from MRA
     */
    static async getTaxCodes(
        environment: MraEnvironment = MraEnvironment.SANDBOX
    ): Promise<{ success: boolean; data?: unknown; message?: string }> {
        try {
            const baseUrl = MraBaseService.getApiUrl(environment);
            const client = MraBaseService.getAxiosInstance(baseUrl);

            const response = await client.get<{ success: boolean; data?: unknown; message?: string }>(
                '/tax-codes'
            );

            return response.data;

        } catch (error: unknown) {
            console.error('[MRA] Get tax codes error:', error);
            return {
                success: false,
                message: MraBaseService.handleApiError(error),
            };
        }
    }
}
