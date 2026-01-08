import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import {
    DATABASE_OFFLINE_MODE,
    DATABASE_URL,
    DATABASE_HOST,
    DATABASE_USER,
    DATABASE_PASSWORD,
    DATABASE_NAME,
    DATABASE_PORT
} from '../../config/db';
import { PrismaClient } from './generated/prisma/client';

let localClient: PrismaClient | null = null;
let remoteClient: PrismaClient | null = null;
let prismaInstance: PrismaClient | null = null;
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

const initializeLocalClient = () => {
    if (!databaseVerified) {
        throw new Error(
            'Database not verified! Call DatabaseInitializer.ensureReady() before using Prisma. ' +
            'This prevents SQLite from creating an empty database file.'
        );
    }

    if (!localClient) {
        const dbUrl = getEffectiveDatabaseUrl();
        console.log(`📂 Opening SQLite database: ${dbUrl}`);
        const adapter = new PrismaBetterSqlite3({ url: dbUrl });
        localClient = new PrismaClient({
            adapter,
            log: ['error', 'warn']
        });
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
            connectionLimit: 5
        });
        remoteClient = new PrismaClient({
            adapter,
            log: ['error', 'warn']
        });
        try {
            await remoteClient.$connect();
        } catch (error) {
            remoteClient = null;
            throw error;
        }
    }
    return remoteClient;
};

const initializePrisma = async (): Promise<PrismaClient> => {
    if (prismaInstance) return prismaInstance;

    if (!DATABASE_OFFLINE_MODE) {
        try {
            console.log('🌐 Attempting to connect to remote MySQL database...');
            prismaInstance = await initializeRemoteClient();
            console.log('✓ Connected to remote MySQL database');
            isInitialized = true;
            return prismaInstance;
        } catch (error) {
            console.warn('⚠️  Failed to connect to remote database, falling back to local:', error);
            prismaInstance = initializeLocalClient();
            isInitialized = true;
            return prismaInstance;
        }
    }

    console.log('📦 Using local SQLite database');
    prismaInstance = initializeLocalClient();
    isInitialized = true;
    console.log('✓ Connected to remote SQLite database');
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
    private clientPromise: Promise<PrismaClient> | null = null;

    constructor() {
        // Don't initialize immediately - wait for first use
        // This allows DatabaseInitializer.ensureReady() to be called first
    }

    private async getClient(): Promise<PrismaClient> {
        // Lazy initialization - only create promise on first access
        if (!this.clientPromise) {
            this.clientPromise = initializePrisma();
        }
        
        if (!isInitialized) {
            await this.clientPromise;
        }

        return prismaInstance;
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

    getProxy(): PrismaClient {
        return this.createProxy() as PrismaClient;
    }
}

/**
 * Get the Prisma client instance (ensures initialization)
 */
export const getPrisma = async (): Promise<PrismaClient> => {
    if (!isInitialized) {
        await initializePrisma();
    }
    return prismaInstance;
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use getPrisma() instead
 */
export const getPrismaClient = async (): Promise<PrismaClient> => {
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
export const prisma: PrismaClient = wrapper.getProxy();

export default prisma;