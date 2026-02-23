/**
 * SQLite Prisma Client Template
 * 
 * Copy this file's content to client.ts when using SQLite database.
 * 
 * Provider: SQLite
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { DATABASE_URL } from '../../config/db';

// SQLite client - dynamically imported to avoid loading native better-sqlite3 on servers
let SQLitePrismaClient: any;
let PrismaBetterSqlite3: any;

// Use 'any' to avoid circular type reference errors in Prisma's complex generated types
type PrismaClientInstance = any;

// Re-export the type for external usage
export type PrismaClient = any;

let prismaClient: PrismaClientInstance | null = null;
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
    console.log('✓ SQLite database marked as ready for connections');
};

/**
 * Check if database has been verified
 */
export const isDatabaseReady = (): boolean => databaseVerified;

/**
 * Reset the verified state (useful for testing or reinitializing)
 */
export const resetDatabaseState = (): void => {
    databaseVerified = false;
    verifiedDatabaseUrl = null;
};

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

/**
 * Initialize the SQLite Prisma client
 */
const initializeClient = async (): Promise<PrismaClientInstance> => {
    if (!databaseVerified) {
        throw new Error(
            'Database not verified! Call setDatabaseReady() or DatabaseInitializer.ensureReady() before using Prisma. ' +
            'This prevents SQLite from creating an empty database file.'
        );
    }

    if (!prismaClient) {
        // Dynamically load SQLite dependencies
        await loadSqliteDependencies();

        const dbUrl = getEffectiveDatabaseUrl();
        console.log(`📂 Opening SQLite database: ${dbUrl}`);
        const adapter = new PrismaBetterSqlite3({ url: dbUrl });

        prismaClient = new SQLitePrismaClient({
            adapter,
            log: ['error', 'warn']
        }) as unknown as PrismaClientInstance;

        isInitialized = true;
        console.log('✓ Connected to local SQLite database');
    }

    return prismaClient;
};

/**
 * Prisma client wrapper that ensures initialization before any operation
 * Use directly: prisma.model.findMany()
 * 
 * IMPORTANT: Initialization is LAZY - it only happens when a method is called.
 */
class PrismaClientWrapper {
    private clientPromise: Promise<PrismaClientInstance> | null = null;

    constructor() {
        // Don't initialize immediately - wait for first use
    }

    private async getClient(): Promise<PrismaClientInstance> {
        if (!this.clientPromise) {
            this.clientPromise = initializeClient();
        }

        if (!isInitialized) {
            await this.clientPromise;
        }

        return prismaClient!;
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
        await initializeClient();
    }
    return prismaClient!;
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use getPrisma() instead
 */
export const getPrismaClient = async (): Promise<PrismaClientInstance> => {
    return getPrisma();
};

/**
 * Disconnect Prisma client and reset state
 */
export const disconnectPrisma = async () => {
    if (prismaClient) {
        await prismaClient.$disconnect();
    }
    prismaClient = null;
    isInitialized = false;
};

/**
 * Get current connection status
 */
export const getConnectionStatus = () => {
    return {
        isInitialized,
        databaseVerified,
        databaseUrl: getEffectiveDatabaseUrl(),
        provider: 'sqlite'
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
