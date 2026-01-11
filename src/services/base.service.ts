import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse, ServiceConfig } from 'network';
import { getConfig } from '../config/app.config';

export class BaseService {
    private static config: ServiceConfig | null = null;
    private static isOnline = true;
    private static lastOnlineCheck: Date | null = null;
    private static onlineCheckInterval = 30000; // 30 seconds

    private static getServiceConfig(): ServiceConfig {
        if (!this.config) {
            const appConfig = getConfig();
            this.config = {
                baseURL: appConfig.liveApiUrl,
                timeout: appConfig.apiTimeout,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Client-Type': 'web',
                },
            };
        }
        return this.config;
    }

    static initialize(config?: Partial<ServiceConfig>): void {
        const currentConfig = this.getServiceConfig();
        this.config = { ...currentConfig, ...config };
    }

    static reinitialize(): void {
        // Force re-read from app config
        this.config = null;
    }

    /**
     * Check if the remote API is reachable
     */
    static async checkOnlineStatus(): Promise<boolean> {
        const now = new Date();

        // Use cached status if checked recently
        if (this.lastOnlineCheck &&
            (now.getTime() - this.lastOnlineCheck.getTime()) < this.onlineCheckInterval) {
            return this.isOnline;
        }

        try {
            const serviceConfig = this.getServiceConfig();
            await axios.get(`${serviceConfig.baseURL}/health`, {
                timeout: 5000,
            });
            this.isOnline = true;
        } catch {
            this.isOnline = false;
        }

        this.lastOnlineCheck = now;
        return this.isOnline;
    }

    /**
     * Get current online status without making a request
     */
    static getOnlineStatus(): boolean {
        return this.isOnline;
    }

    /**
     * Set online status manually (useful for network event listeners)
     */
    static setOnlineStatus(status: boolean): void {
        this.isOnline = status;
        this.lastOnlineCheck = new Date();
    }

    private static async request<T = any>(
        method: 'get' | 'post' | 'put' | 'delete' | 'patch',
        endpoint: string,
        data?: any,
        config?: AxiosRequestConfig
    ): Promise<ApiResponse<T>> {
        try {
            const serviceConfig = this.getServiceConfig();
            const url = `${serviceConfig.baseURL}${endpoint}`;
            const fullConfig: AxiosRequestConfig = {
                ...serviceConfig,
                ...config,
                method,
                url,
            };

            if (method === 'get' || method === 'delete') {
                fullConfig.params = data;
            } else {
                fullConfig.data = data;
            }

            const response: AxiosResponse = await axios(fullConfig);

            // Mark as online on successful response
            this.isOnline = true;
            this.lastOnlineCheck = new Date();

            return {
                success: response.status >= 200 && response.status < 300,
                data: response.data?.data || response.data,
                message: response.data?.message || 'Request successful',
                error: response.data?.error,
            };
        } catch (error: any) {
            // Mark as offline on connection errors
            if (error.code === 'ECONNABORTED' || error.code === 'ECONNREFUSED' || !error.response) {
                this.isOnline = false;
                this.lastOnlineCheck = new Date();
            }

            if (error.code === 'ECONNABORTED') {
                throw new Error('Request timeout - external API took too long to respond');
            }
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Connection refused - external API is not accessible');
            }
            if (error.response) {
                const { status, data } = error.response;
                throw new Error(data?.message || `API returned status ${status}`);
            } else if (error.request) {
                throw new Error('No response received from external API');
            } else {
                throw new Error(`Failed to make request: ${error.message}`);
            }
        }
    }

    static async get<T = any>(endpoint: string, params?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return this.request<T>('get', endpoint, params, config);
    }

    static async post<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return this.request<T>('post', endpoint, data, config);
    }

    static async put<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return this.request<T>('put', endpoint, data, config);
    }

    static async delete<T = any>(endpoint: string, params?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return this.request<T>('delete', endpoint, params, config);
    }

    static async patch<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return this.request<T>('patch', endpoint, data, config);
    }

    // ==========================================
    // SYNC-SPECIFIC METHODS
    // ==========================================

    /**
     * Push sync data to remote server
     * Includes retry logic and offline handling
     */
    static async pushSyncData<T = any>(
        endpoint: string,
        records: any[],
        options?: {
            retries?: number;
            retryDelay?: number;
        }
    ): Promise<ApiResponse<T>> {
        const retries = options?.retries || 3;
        const retryDelay = options?.retryDelay || 1000;

        // Check if online first
        const isOnline = await this.checkOnlineStatus();
        if (!isOnline) {
            return {
                success: false,
                message: 'Remote server is not reachable',
                error: 'OFFLINE',
            } as ApiResponse<T>;
        }

        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await this.post<T>(endpoint, { records });
                return response;
            } catch (error: any) {
                lastError = error;
                console.log(`[BaseService] Sync attempt ${attempt}/${retries} failed:`, error.message);

                if (attempt < retries) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
                }
            }
        }

        return {
            success: false,
            message: lastError?.message || 'Sync failed after retries',
            error: lastError?.message,
        } as ApiResponse<T>;
    }

    /**
     * Pull sync data from remote server
     */
    static async pullSyncData<T = any>(
        endpoint: string,
        params?: {
            since?: Date;
            limit?: number;
            offset?: number;
        }
    ): Promise<ApiResponse<T>> {
        const queryParams: any = {};

        if (params?.since) {
            queryParams.updatedSince = params.since.toISOString();
        }
        if (params?.limit) {
            queryParams.limit = params.limit;
        }
        if (params?.offset) {
            queryParams.offset = params.offset;
        }

        return this.get<T>(endpoint, queryParams);
    }

    /**
     * Get the base URL for the remote API
     */
    static getBaseURL(): string {
        return this.getServiceConfig().baseURL;
    }
}