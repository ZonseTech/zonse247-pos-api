interface APIMethodOptions {
    showProgress?: boolean;
    progressMessage?: string;
    useLocal?: boolean;
}

type APIProps = {
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