import type { AxiosInstance, AxiosResponse } from "axios";

export interface APIMethodOptions {
    showProgress?: boolean;
    progressMessage?: string;
    useLocal?: boolean;
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
    subscriptionStatus?: string;
}

export interface ServiceConfig {
    baseURL?: string;
    headers?: Record<string, string>;
    timeout?: number;
}

export type APIProps = {
    config: AxiosInstance;
    get: <T>(
        url: string,
        params?: Record<string, any>,
        baseURL?: string,
        options?: APIMethodOptions
    ) => Promise<AxiosResponse<T, any>>;
    post: <T>(
        url: string,
        body: T,
        headers?: Record<string, any>,
        options?: APIMethodOptions
    ) => Promise<AxiosResponse<T, any>>;
    put: <T>(
        url: string,
        body: T,
        headers?: Record<string, any>,
        options?: APIMethodOptions
    ) => Promise<AxiosResponse<T, any>>;
    delete: <T>(
        url: string,
        headers?: Record<string, any>,
        options?: APIMethodOptions
    ) => Promise<AxiosResponse<T, any>>;
    patch: <T>(
        url: string,
        body: T,
        headers?: Record<string, any>,
        options?: APIMethodOptions
    ) => Promise<AxiosResponse<T, any>>;
};