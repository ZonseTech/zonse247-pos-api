import 'dotenv/config';

export const NODE_ENV = process.env.NODE_ENV || "development";
export const APP_NAME = process.env.APP_NAME || "Zonse247 POS";

export const isProduction = NODE_ENV === "production";

// Runtime configuration that can be set programmatically
// This is needed because env vars may not be available in packaged Electron builds
export interface RuntimeConfig {
    // API/External config
    liveApiUrl: string;
    apiHost: string;
    apiPort: string;
    apiTimeout: number;

    // Server config
    serverPort: string;
    serverHost: string;
    serverTimeout: number;
    trustProxy: boolean;
    nodeEnv: string;

    // Security/CORS config
    corsRequestSizeLimit: string;
    corsAllowedOrigins: string;

    // App info
    appVersion: string;
}

// Default configuration values - used when env vars are not available
const DEFAULT_CONFIG: RuntimeConfig = {
    liveApiUrl: 'http://139.59.103.109:2025/api/v1',
    apiHost: '127.0.0.1',
    apiPort: '3000',
    apiTimeout: 30000,
    serverPort: '3000',
    serverHost: '127.0.0.1',
    serverTimeout: 30000,
    trustProxy: false,
    nodeEnv: 'production',
    corsRequestSizeLimit: '10mb',
    corsAllowedOrigins: 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000',
    appVersion: '1.0.0',
};

// Current runtime config - starts with defaults, can be overridden
let runtimeConfig: RuntimeConfig = { ...DEFAULT_CONFIG };

// Initialize config from environment variables (if available) or use defaults
export function initializeConfig(overrides?: Partial<RuntimeConfig>): RuntimeConfig {
    runtimeConfig = {
        // API/External config
        liveApiUrl: process.env.LIVE_API_URL || overrides?.liveApiUrl || DEFAULT_CONFIG.liveApiUrl,
        apiHost: process.env.API_HOST || overrides?.apiHost || DEFAULT_CONFIG.apiHost,
        apiPort: process.env.API_PORT || overrides?.apiPort || DEFAULT_CONFIG.apiPort,
        apiTimeout: parseInt(process.env.API_TIMEOUT || '') || overrides?.apiTimeout || DEFAULT_CONFIG.apiTimeout,

        // Server config
        serverPort: process.env.SERVER_PORT || overrides?.serverPort || DEFAULT_CONFIG.serverPort,
        serverHost: process.env.SERVER_HOST || overrides?.serverHost || DEFAULT_CONFIG.serverHost,
        serverTimeout: parseInt(process.env.SERVER_TIMEOUT || '') || overrides?.serverTimeout || DEFAULT_CONFIG.serverTimeout,
        trustProxy: process.env.TRUST_PROXY === 'true' || overrides?.trustProxy || DEFAULT_CONFIG.trustProxy,
        nodeEnv: process.env.NODE_ENV || overrides?.nodeEnv || DEFAULT_CONFIG.nodeEnv,

        // Security/CORS config
        corsRequestSizeLimit: process.env.CORS_REQUEST_SIZE_LIMIT || overrides?.corsRequestSizeLimit || DEFAULT_CONFIG.corsRequestSizeLimit,
        corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS || overrides?.corsAllowedOrigins || DEFAULT_CONFIG.corsAllowedOrigins,

        // App info
        appVersion: process.env.npm_package_version || overrides?.appVersion || DEFAULT_CONFIG.appVersion,
    };

    console.log('Runtime config initialized:', {
        liveApiUrl: runtimeConfig.liveApiUrl,
        serverPort: runtimeConfig.serverPort,
        nodeEnv: runtimeConfig.nodeEnv,
    });

    return runtimeConfig;
}

// Get current runtime config
export function getConfig(): RuntimeConfig {
    return runtimeConfig;
}

// Update specific config values at runtime
export function updateConfig(updates: Partial<RuntimeConfig>): void {
    runtimeConfig = { ...runtimeConfig, ...updates };
}