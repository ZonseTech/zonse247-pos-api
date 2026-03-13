/**
 * MRA Base Service
 * 
 * Contains shared utilities for MRA EIS integration:
 * - Axios instance management
 * - HMAC signature generation
 * - Error handling
 * - Constants
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
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

// MRA Header names
export const MRA_HEADERS = {
    SIGNATURE: 'x-eis-message-hash',
    ACCESS_KEY: 'x-access-key',
    AUTHORIZATION: 'Authorization',
} as const;

/**
 * MRA API credentials configuration
 */
export interface MraCredentials {
    secretKey?: string;           // For HMAC signature
    jwtToken?: string;            // Bearer token from activation
    vendorAccessKey?: string;     // For production terminal activation
    authorizationHeader?: string; // Raw Authorization header value (no prefix added)
}

/**
 * MRA Base Service with shared utilities
 */
export class MraBaseService {
    private static instances: Map<string, AxiosInstance> = new Map();

    /**
     * Get or create an Axios instance for MRA API calls
     * 
     * @param baseUrl - MRA API base URL
     * @param credentials - Optional credentials for authentication
     */
    static getAxiosInstance(baseUrl: string, credentials?: MraCredentials): AxiosInstance {
        const instanceKey = `${baseUrl}-${credentials?.jwtToken || credentials?.authorizationHeader || 'default'}`;

        if (!this.instances.has(instanceKey)) {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            };

            // Add raw authorization header if provided (takes precedence)
            if (credentials?.authorizationHeader) {
                headers[MRA_HEADERS.AUTHORIZATION] = credentials.authorizationHeader;
            }
            // Add Bearer token if available (from terminal activation)
            else if (credentials?.jwtToken) {
                headers[MRA_HEADERS.AUTHORIZATION] = `Bearer ${credentials.jwtToken}`;
            }

            // Add vendor access key for production (required for terminal activation)
            if (credentials?.vendorAccessKey) {
                headers[MRA_HEADERS.ACCESS_KEY] = credentials.vendorAccessKey;
            }

            const instance = axios.create({
                baseURL: baseUrl,
                timeout: 30000,
                headers,
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
     * Clear cached axios instances (useful for testing or credential refresh)
     */
    static clearInstanceCache(): void {
        this.instances.clear();
    }

    /**
     * Generate HMAC-SHA512 signature for API requests
     * 
     * As per MRA documentation, requests must be signed using HMAC-SHA512
     * with the secret key provided during terminal activation.
     * The signature must be Base64 encoded.
     * 
     * @param data - The request payload to sign
     * @param secretKey - The secret key from terminal activation
     * @returns Base64 encoded HMAC-SHA512 signature
     */
    static generateSignature(data: unknown, secretKey: string): string {
        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        const hmac = crypto.createHmac('sha512', secretKey);
        hmac.update(dataString);
        return hmac.digest('base64'); // MRA requires base64 encoding
    }

    /**
     * Build headers with signature for authenticated MRA requests
     * 
     * @param payload - The request payload to sign
     * @param secretKey - The secret key for HMAC signature
     * @param additionalHeaders - Any additional headers to include
     * @returns Headers object with signature
     */
    static buildSignedHeaders(
        payload: unknown,
        secretKey: string,
        additionalHeaders?: Record<string, string>
    ): Record<string, string> {
        const signature = this.generateSignature(payload, secretKey);
        return {
            [MRA_HEADERS.SIGNATURE]: signature,
            ...additionalHeaders,
        };
    }

    /**
     * Create axios request config with proper MRA headers
     * 
     * @param payload - The request payload
     * @param secretKey - The secret key for signing
     * @param jwtToken - Optional JWT token for authorization
     */
    static createRequestConfig(
        payload: unknown,
        secretKey?: string,
        jwtToken?: string
    ): AxiosRequestConfig {
        const headers: Record<string, string> = {};

        if (secretKey) {
            headers[MRA_HEADERS.SIGNATURE] = this.generateSignature(payload, secretKey);
        }

        if (jwtToken) {
            headers[MRA_HEADERS.AUTHORIZATION] = `Bearer ${jwtToken}`;
        }

        return { headers };
    }

    /**
     * Handle API errors and return user-friendly messages
     */
    static handleApiError(error: unknown): string {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;

            // Log the full error for debugging
            console.error('[MRA API Error]', {
                status: axiosError.response?.status,
                statusText: axiosError.response?.statusText,
                data: axiosError.response?.data,
                code: axiosError.code,
                url: axiosError.config?.url,
            });

            if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
                return 'Unable to connect to MRA server. Please check your internet connection.';
            }

            if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ECONNABORTED') {
                return 'Request to MRA server timed out. Please try again.';
            }

            if (axiosError.response) {
                const responseData = axiosError.response.data as {
                    error?: { code?: string; message?: string };
                    message?: string;
                    detail?: string;
                    errors?: any[];
                };
                const statusCode = axiosError.response.status;
                const headers = axiosError.response.headers as Record<string, any>;

                // Check for x-failure-reason header (MRA specific)
                const failureReason = headers?.['x-failure-reason'];

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
                            return `MRA Error [${errorCode}]: ${responseData.error.message || 'Unknown error'}`;
                    }
                }

                const errorParts: string[] = [];

                if (statusCode) {
                    errorParts.push(`HTTP ${statusCode}`);
                }

                if (failureReason) {
                    errorParts.push(failureReason);
                }

                if (responseData?.message) {
                    errorParts.push(responseData.message);
                }

                if (responseData?.detail) {
                    errorParts.push(responseData.detail);
                }

                if (responseData?.errors && Array.isArray(responseData.errors)) {
                    const errorMessages = responseData.errors
                        .map((e: any) => e.message || e.msg || JSON.stringify(e))
                        .join('; ');
                    if (errorMessages) {
                        errorParts.push(errorMessages);
                    }
                }

                if (errorParts.length > 0) {
                    return `MRA API: ${errorParts.join(' - ')}`;
                }

                return `MRA API error (${statusCode}): ${JSON.stringify(responseData)}`;
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
