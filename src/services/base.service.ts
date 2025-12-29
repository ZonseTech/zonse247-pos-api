import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse, ServiceConfig } from 'network';

export class BaseService {
    private static config: ServiceConfig = {
        baseURL: process.env.API_HOST
            ? `http://${process.env.API_HOST}:${process.env.API_PORT || '3000'}/api/v1`
            : 'http://localhost:3000/api/v1',
        timeout: parseInt(process.env.API_TIMEOUT || '10000'),
        headers: {
            'Content-Type': 'application/json',
            'X-Client-Type': 'desktop',
        },
    };

    static initialize(config?: Partial<ServiceConfig>): void {
        this.config = { ...this.config, ...config };
    }

    private static async request<T = any>(
        method: 'get' | 'post' | 'put' | 'delete' | 'patch',
        endpoint: string,
        data?: any,
        config?: AxiosRequestConfig
    ): Promise<ApiResponse<T>> {
        try {
            const url = `${this.config.baseURL}${endpoint}`;
            const fullConfig: AxiosRequestConfig = {
                ...this.config,
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

            return {
                success: response.status >= 200 && response.status < 300,
                data: response.data?.data || response.data,
                message: response.data?.message || 'Request successful',
                error: response.data?.error,
            };
        } catch (error: any) {
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
}