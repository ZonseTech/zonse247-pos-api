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

    // JWT config
    jwtSecret: string;
    jwtExpiresIn: string;
    jwtRefreshSecret: string;
    jwtRefreshExpiresIn: string;

    // Security config
    bcryptSaltRounds: number;

    // Database config
    databaseProvider: string;
    databaseUrl: string;
    mysqlUrl: string;
    databaseOfflineMode: boolean;
    databaseHost: string;
    databaseUser: string;
    databasePassword: string;
    databaseName: string;
    databasePort: number;

    // Email config
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string;
    smtpPass: string;
    smtpFrom: string;

    // Paths config
    uploadPath: string;
    migrationsPath: string;

    // External URLs
    clientPortalUrl: string;

    // Feature flags
    enableAnalytics: boolean;

    // App info
    appName: string;
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
    corsAllowedOrigins: 'http://localhost:5173,http://localhost:3000,http://localhost:3001,http://pos.vitalitymw.com,http://127.0.0.1:3000',
    jwtSecret: 'b206c54227610532d1ddb46c207c7fb9f5d181d662eec89fa228fa2ca20dd2a4',
    jwtExpiresIn: '7d',
    jwtRefreshSecret: 'refresh-b206c54227610532d1ddb46c207c7fb9f5d181d662eec89fa228fa2ca20dd2a4',
    jwtRefreshExpiresIn: '30d',
    bcryptSaltRounds: 10,
    databaseProvider: 'sqlite',
    databaseUrl: 'file:./local.db',
    mysqlUrl: '',
    databaseOfflineMode: true,
    databaseHost: 'localhost',
    databaseUser: 'root',
    databasePassword: '',
    databaseName: 'app',
    databasePort: 3306,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: 'zonse247@gmail.com',
    smtpPass: 'beyx utjh idqi bamr',
    smtpFrom: 'Zonse247 POS <zonse247@gmail.com>',
    uploadPath: './.backups/uploads',
    migrationsPath: './.backups/migrations',
    clientPortalUrl: 'https://pos.zonse247.com',
    enableAnalytics: false,
    appName: 'Zonse247 POS',
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

        // JWT config
        jwtSecret: process.env.JWT_SECRET || overrides?.jwtSecret || DEFAULT_CONFIG.jwtSecret,
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || overrides?.jwtExpiresIn || DEFAULT_CONFIG.jwtExpiresIn,
        jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || overrides?.jwtRefreshSecret || DEFAULT_CONFIG.jwtRefreshSecret,
        jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || overrides?.jwtRefreshExpiresIn || DEFAULT_CONFIG.jwtRefreshExpiresIn,

        // Security config
        bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '') || overrides?.bcryptSaltRounds || DEFAULT_CONFIG.bcryptSaltRounds,

        // Database config
        databaseProvider: process.env.DATABASE_PROVIDER || overrides?.databaseProvider || DEFAULT_CONFIG.databaseProvider,
        databaseUrl: process.env.DATABASE_URL || overrides?.databaseUrl || DEFAULT_CONFIG.databaseUrl,
        mysqlUrl: process.env.MYSQL_URL || process.env.DATABASE_URL || overrides?.mysqlUrl || DEFAULT_CONFIG.mysqlUrl,
        databaseOfflineMode: process.env.DATABASE_OFFLINE_MODE
            ? process.env.DATABASE_OFFLINE_MODE.toLowerCase() === 'true'
            : (overrides?.databaseOfflineMode ?? (overrides?.databaseProvider === 'sqlite' || DEFAULT_CONFIG.databaseOfflineMode)),
        databaseHost: process.env.DATABASE_HOST || overrides?.databaseHost || DEFAULT_CONFIG.databaseHost,
        databaseUser: process.env.DATABASE_USER || overrides?.databaseUser || DEFAULT_CONFIG.databaseUser,
        databasePassword: process.env.DATABASE_PASSWORD || overrides?.databasePassword || DEFAULT_CONFIG.databasePassword,
        databaseName: process.env.DATABASE_NAME || overrides?.databaseName || DEFAULT_CONFIG.databaseName,
        databasePort: parseInt(process.env.DATABASE_PORT || '') || overrides?.databasePort || DEFAULT_CONFIG.databasePort,

        // Email config
        smtpHost: process.env.SMTP_HOST || overrides?.smtpHost || DEFAULT_CONFIG.smtpHost,
        smtpPort: parseInt(process.env.SMTP_PORT || '') || overrides?.smtpPort || DEFAULT_CONFIG.smtpPort,
        smtpSecure: process.env.SMTP_SECURE === 'true' || overrides?.smtpSecure || DEFAULT_CONFIG.smtpSecure,
        smtpUser: process.env.SMTP_USER || overrides?.smtpUser || DEFAULT_CONFIG.smtpUser,
        smtpPass: process.env.SMTP_PASS || overrides?.smtpPass || DEFAULT_CONFIG.smtpPass,
        smtpFrom: process.env.SMTP_FROM || overrides?.smtpFrom || DEFAULT_CONFIG.smtpFrom,

        // Paths config
        uploadPath: process.env.UPLOAD_PATH || overrides?.uploadPath || DEFAULT_CONFIG.uploadPath,
        migrationsPath: process.env.MIGRATIONS_PATH || overrides?.migrationsPath || DEFAULT_CONFIG.migrationsPath,

        // External URLs
        clientPortalUrl: process.env.CLIENT_PORTAL_URL || overrides?.clientPortalUrl || DEFAULT_CONFIG.clientPortalUrl,

        // Feature flags
        enableAnalytics: process.env.ENABLE_ANALYTICS === 'true' || overrides?.enableAnalytics || DEFAULT_CONFIG.enableAnalytics,

        // App info
        appName: process.env.APP_NAME || overrides?.appName || DEFAULT_CONFIG.appName,
        appVersion: process.env.npm_package_version || overrides?.appVersion || DEFAULT_CONFIG.appVersion,
    };

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