/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import {
    DATABASE_OFFLINE_MODE,
    DATABASE_URL,
    DATABASE_HOST,
    DATABASE_USER,
    DATABASE_PASSWORD,
    DATABASE_NAME,
    DATABASE_PORT
} from '../../config/db';

// Conditional imports based on mode to avoid loading native modules unnecessarily
// MySQL client is always needed for type definitions
import { PrismaClient as MySQLPrismaClient } from './generated/mysql/client';

// SQLite client - only import if in offline mode (to avoid loading native better-sqlite3 on servers)
let SQLitePrismaClient: any;
let PrismaBetterSqlite3: any;

// Use 'any' to avoid circular type reference errors in Prisma's complex generated types
// This is a known issue with Prisma's recursive type definitions
type PrismaClientInstance = any;

// Re-export the type for external usage (use any to avoid circular reference errors)
export type PrismaClient = any;

// Use 'any' for internal client variables to avoid complex type issues between the two generated clients
// The clients are structurally identical but TypeScript treats them as incompatible due to different module origins
let localClient: PrismaClientInstance | null = null;
let remoteClient: any = null;  // MySQLPrismaClient - use any to avoid type conflicts
let prismaInstance: PrismaClientInstance | null = null;
let isInitialized = false;

/**
 * Flag to indicate if database file has been verified to exist.
 * This MUST be set to true before any SQLite connection is allowed.
 */
let databaseVerified = false;

/**
 * Custom database URL that can be set after verification.
 * Takes precedence over DATABASE_URL environment variable.
 */
let verifiedDatabaseUrl: string | null = null;

/**
 * Mark the database as verified and ready for connections.
 * Call this AFTER ensuring the database file exists (e.g., after copying template).
 * 
 * @param dbUrl - The verified database URL (e.g., 'file:/path/to/local.db')
 */
export const setDatabaseReady = (dbUrl?: string): void => {
    if (dbUrl) {
        verifiedDatabaseUrl = dbUrl;
    }
    databaseVerified = true;
    console.log('✓ Database marked as ready for connections');
};

/**
 * Check if database has been verified
 */
export const isDatabaseReady = (): boolean => databaseVerified;

/**
 * Get the effective database URL (verified URL or fallback to env)
 */
const getEffectiveDatabaseUrl = (): string => {
    return verifiedDatabaseUrl || DATABASE_URL || 'file:./local.db';
};

/**
 * Dynamically load SQLite dependencies only when needed
 * This prevents loading native modules on production servers using MySQL
 */
const loadSqliteDependencies = async () => {
    if (!SQLitePrismaClient) {
        const sqliteClientModule = await import('./generated/prisma/client');
        SQLitePrismaClient = sqliteClientModule.PrismaClient;
    }
    if (!PrismaBetterSqlite3) {
        const adapterModule = await import('@prisma/adapter-better-sqlite3');
        PrismaBetterSqlite3 = adapterModule.PrismaBetterSqlite3;
    }
};

const initializeLocalClient = async () => {
    if (!databaseVerified) {
        throw new Error(
            'Database not verified! Call DatabaseInitializer.ensureReady() before using Prisma. ' +
            'This prevents SQLite from creating an empty database file.'
        );
    }

    if (!localClient) {
        // Dynamically load SQLite dependencies
        await loadSqliteDependencies();

        const dbUrl = getEffectiveDatabaseUrl();
        console.log(`📂 Opening SQLite database: ${dbUrl}`);
        const adapter = new PrismaBetterSqlite3({ url: dbUrl });
        // Use SQLite-generated client for SQLite adapter
        localClient = new SQLitePrismaClient({
            adapter,
            log: ['error', 'warn']
        }) as unknown as PrismaClientInstance;
    }
    return localClient;
};

const initializeRemoteClient = async () => {
    if (!remoteClient) {
        const adapter = new PrismaMariaDb({
            host: DATABASE_HOST,
            port: DATABASE_PORT,
            user: DATABASE_USER,
            password: DATABASE_PASSWORD,
            database: DATABASE_NAME,
            connectionLimit: 5,
            connectTimeout: 5000  // 5 second timeout for faster fallback
        });
        // Use MySQL-generated client for MariaDB/MySQL adapter
        remoteClient = new MySQLPrismaClient({
            adapter,
            log: ['error', 'warn']
        });
        try {
            await remoteClient.$connect();
            // Actually test the connection with a simple query
            // $connect() for MySQL adapter doesn't always verify the connection
            await remoteClient.$queryRaw`SELECT 1`;
        } catch (error) {
            // Clean up the failed client
            try {
                await remoteClient.$disconnect();
            } catch {
                // Ignore disconnect errors
            }
            remoteClient = null;
            throw error;
        }
    }
    return remoteClient;
};

const initializePrisma = async (): Promise<PrismaClientInstance> => {
    if (prismaInstance) return prismaInstance;

    if (!DATABASE_OFFLINE_MODE) {
        try {
            console.log('🌐 Attempting to connect to remote MySQL database...');
            prismaInstance = await initializeRemoteClient();
            console.log('✓ Connected to remote MySQL database');
            isInitialized = true;
            return prismaInstance;
        } catch (error) {
            // In server mode (MySQL), do NOT fallback to SQLite
            // SQLite native modules are not compatible with server environments
            console.error('❌ Failed to connect to remote database:', error);
            throw new Error(
                'Failed to connect to MySQL database. SQLite fallback is disabled in server mode. ' +
                'Please check your database configuration and ensure MySQL is running.'
            );
        }
    }

    console.log('📦 Using local SQLite database');
    prismaInstance = await initializeLocalClient();
    isInitialized = true;
    console.log('✓ Connected to local SQLite database');
    return prismaInstance;
};

/**
 * Prisma client wrapper that ensures initialization before any operation
 * Use directly: prisma.model.findMany()
 * 
 * IMPORTANT: Initialization is now LAZY - it only happens when a method is called.
 * This prevents the "Database not verified" error when the module is imported
 * before DatabaseInitializer.ensureReady() is called.
 */
class PrismaClientWrapper {
    private clientPromise: Promise<PrismaClientInstance> | null = null;

    constructor() {
        // Don't initialize immediately - wait for first use
        // This allows DatabaseInitializer.ensureReady() to be called first
    }

    private async getClient(): Promise<PrismaClientInstance> {
        // Lazy initialization - only create promise on first access
        if (!this.clientPromise) {
            this.clientPromise = initializePrisma();
        }

        if (!isInitialized) {
            await this.clientPromise;
        }

        return prismaInstance!;
    }

    private createProxy(): any {
        return new Proxy(this, {
            get: (target, prop: string) => {
                if (prop in target) {
                    return (target as any)[prop];
                }

                return new Proxy(() => { 1 + 1 }, {
                    get: (_, subProp: string) => {
                        return async (...args: any[]) => {
                            const client = await target.getClient();
                            const model = (client as any)[prop];

                            if (!model) {
                                throw new Error(`Model '${prop}' not found in Prisma schema`);
                            }

                            const method = model[subProp];

                            if (typeof method !== 'function') {
                                throw new Error(`Method '${subProp}' not found on model '${prop}'`);
                            }

                            return method.apply(model, args);
                        };
                    },
                    apply: async (_, __, args: any[]) => {
                        const client = await target.getClient();
                        const value = (client as any)[prop];

                        if (typeof value === 'function') {
                            return value.apply(client, args);
                        }

                        return value;
                    }
                });
            }
        });
    }

    getProxy(): PrismaClientInstance {
        return this.createProxy() as PrismaClientInstance;
    }
}

/**
 * Get the Prisma client instance (ensures initialization)
 */
export const getPrisma = async (): Promise<PrismaClientInstance> => {
    if (!isInitialized) {
        await initializePrisma();
    }
    return prismaInstance!;
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use getPrisma() instead
 */
export const getPrismaClient = async (): Promise<PrismaClientInstance> => {
    return getPrisma();
};

/**
 * Disconnect all Prisma clients and reset state
 */
export const disconnectPrisma = async () => {
    if (localClient) {
        await localClient.$disconnect();
    }
    if (remoteClient) {
        await remoteClient.$disconnect();
    }
    prismaInstance = null;
    localClient = null;
    remoteClient = null;
    isInitialized = false;
};

/**
 * Get current connection status
 */
export const getConnectionStatus = () => {
    return {
        isInitialized,
        isLocal: prismaInstance === localClient,
        isRemote: prismaInstance === remoteClient,
        offlineMode: DATABASE_OFFLINE_MODE
    };
};

const wrapper = new PrismaClientWrapper();

/**
 * Prisma client instance with lazy initialization
 * Use directly: prisma.model.findMany()
 * All operations automatically wait for initialization
 */
export const prisma: PrismaClientInstance = wrapper.getProxy();

export default prisma;