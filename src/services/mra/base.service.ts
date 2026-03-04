/**
 * MRA Base Service
 * 
 * Contains shared utilities for MRA EIS integration:
 * - Axios instance management
 * - HMAC signature generation
 * - Error handling
 * - Constants
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import crypto from 'crypto';
import {
    MraEnvironment,
    MraTerminalStatus,
    MRA_ERROR_CODES,
} from '../../types/mra.types';

// API Base URLs
export const MRA_API_URLS = {
    SANDBOX: 'https://dev-eis-api.mra.mw/api/v1',
    PRODUCTION: 'https://eis-api.mra.mw/api/v1'
};

/**
 * MRA Base Service with shared utilities
 */
export class MraBaseService {
    private static instances: Map<string, AxiosInstance> = new Map();

    /**
     * Get or create an Axios instance for a specific tenant/terminal
     */
    static getAxiosInstance(baseUrl: string, apiKey?: string): AxiosInstance {
        const instanceKey = `${baseUrl}-${apiKey || 'default'}`;

        if (!this.instances.has(instanceKey)) {
            const instance = axios.create({
                baseURL: baseUrl,
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...(apiKey && { 'X-API-Key': apiKey }),
                }
            });

            // Request interceptor for logging
            instance.interceptors.request.use(
                (config) => {
                    console.log(`[MRA] ${config.method?.toUpperCase()} ${config.url}`);
                    return config;
                },
                (error) => {
                    console.error('[MRA] Request error:', error.message);
                    return Promise.reject(error);
                }
            );

            // Response interceptor for error handling
            instance.interceptors.response.use(
                (response) => response,
                (error: AxiosError) => {
                    console.error('[MRA] Response error:', error.message);
                    return Promise.reject(error);
                }
            );

            this.instances.set(instanceKey, instance);
        }

        const axiosInstance = this.instances.get(instanceKey);
        if (!axiosInstance) {
            throw new Error('Failed to create Axios instance');
        }
        return axiosInstance;
    }

    /**
     * Generate HMAC-SHA512 signature for API requests
     * 
     * As per MRA documentation, requests must be signed using HMAC-SHA512
     * with the secret key provided during terminal activation.
     */
    static generateSignature(data: unknown, secretKey: string): string {
        const dataString = JSON.stringify(data);
        const hmac = crypto.createHmac('sha512', secretKey);
        hmac.update(dataString);
        return hmac.digest('hex');
    }

    /**
     * Handle API errors and return user-friendly messages
     */
    static handleApiError(error: unknown): string {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;

            if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
                return 'Unable to connect to MRA server. Please check your internet connection.';
            }

            if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ECONNABORTED') {
                return 'Request to MRA server timed out. Please try again.';
            }

            if (axiosError.response) {
                const responseData = axiosError.response.data as { error?: { code?: string; message?: string }; message?: string };

                // Handle specific MRA error codes
                if (responseData?.error?.code) {
                    const errorCode = responseData.error.code;
                    switch (errorCode) {
                        case MRA_ERROR_CODES.INVALID_TAC:
                            return 'Invalid Terminal Activation Code (TAC). Please verify and try again.';
                        case MRA_ERROR_CODES.TAC_EXPIRED:
                            return 'Terminal Activation Code has expired. Please request a new TAC from MRA Portal.';
                        case MRA_ERROR_CODES.TAC_ALREADY_USED:
                            return 'Terminal Activation Code has already been used.';
                        case MRA_ERROR_CODES.TERMINAL_NOT_FOUND:
                            return 'Terminal not found in MRA system.';
                        case MRA_ERROR_CODES.TERMINAL_NOT_ACTIVATED:
                            return 'Terminal is not yet activated with MRA.';
                        case MRA_ERROR_CODES.TERMINAL_BLOCKED:
                            return 'Terminal has been blocked by MRA. Please contact MRA for assistance.';
                        case MRA_ERROR_CODES.INVALID_SIGNATURE:
                            return 'Request signature validation failed.';
                        case MRA_ERROR_CODES.DUPLICATE_INVOICE:
                            return 'Invoice has already been submitted.';
                        default:
                            return responseData.error.message || 'MRA API error occurred.';
                    }
                }

                return responseData?.message || 'MRA API error occurred.';
            }
        }

        if (error instanceof Error) {
            return error.message;
        }

        return 'An unexpected error occurred.';
    }

    /**
     * Map internal activation status to MRA status
     */
    static mapActivationStatus(status?: string | null): MraTerminalStatus {
        switch (status) {
            case 'ACTIVATED':
                return MraTerminalStatus.ACTIVATED;
            case 'DEACTIVATED':
                return MraTerminalStatus.DEACTIVATED;
            case 'SUSPENDED':
                return MraTerminalStatus.SUSPENDED;
            case 'BLOCKED':
                return MraTerminalStatus.BLOCKED;
            default:
                return MraTerminalStatus.PENDING;
        }
    }

    /**
     * Get the API URL for a given environment
     */
    static getApiUrl(environment: MraEnvironment): string {
        return MRA_API_URLS[environment];
    }
}
