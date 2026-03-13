/**
 * MySQL Prisma Client Template
 * 
 * Copy this file's content to client.ts when using MySQL database.
 * 
 * Provider: MySQL/MariaDB
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import {
    DATABASE_HOST,
    DATABASE_USER,
    DATABASE_PASSWORD,
    DATABASE_NAME,
    DATABASE_PORT
} from '../../config/db';

// MySQL client is always loaded (no native dependencies like SQLite)
import { PrismaClient as MySQLPrismaClient } from './generated/mysql/client';

// Database type identifier
export const DATABASE_TYPE: 'mysql' | 'sqlite' = 'mysql';

// Use 'any' to avoid circular type reference errors in Prisma's complex generated types
type PrismaClientInstance = any;

// Re-export the type for external usage
export type PrismaClient = any;

let prismaClient: PrismaClientInstance | null = null;
let isInitialized = false;

/**
 * Track whether MySQL initialization has been run.
 * This allows ensureReadyForMySQL to run migrations on first call.
 */
let mysqlInitialized = false;

/**
 * Mark MySQL as initialized (after migrations have run).
 * These functions exist for API compatibility with SQLite client.
 */
export const setDatabaseReady = (_dbUrl?: string): void => {
    mysqlInitialized = true;
    console.log('✓ MySQL database marked as ready for connections');
};

/**
 * Check if MySQL initialization has been run.
 * Returns false on first call to allow migrations to run.
 */
export const isDatabaseReady = (): boolean => mysqlInitialized;

/**
 * Reset state (for testing)
 */
export const resetDatabaseState = (): void => {
    mysqlInitialized = false;
};

/**
 * Initialize the Prisma client
 */
const initializeClient = async (): Promise<PrismaClientInstance> => {
    if (!prismaClient) {
        console.log('🌐 Attempting to connect to MySQL database...');
        console.log(`   Host: ${DATABASE_HOST}:${DATABASE_PORT}`);
        console.log(`   Database: ${DATABASE_NAME}`);
        console.log(`   User: ${DATABASE_USER}`);

        const adapter = new PrismaMariaDb({
            host: DATABASE_HOST,
            port: DATABASE_PORT,
            user: DATABASE_USER,
            password: DATABASE_PASSWORD,
            database: DATABASE_NAME,
            connectionLimit: 5,
            connectTimeout: 5000  // 5 second timeout for faster fallback
        });

        prismaClient = new MySQLPrismaClient({
            adapter,
            log: ['error', 'warn']
        });

        try {
            await prismaClient.$connect();
            // Actually test the connection with a simple query
            // $connect() for MySQL adapter doesn't always verify the connection
            await prismaClient.$queryRaw`SELECT 1`;
            isInitialized = true;
            console.log('✓ Connected to MySQL database');
        } catch (error) {
            // Clean up the failed client
            try {
                await prismaClient.$disconnect();
            } catch {
                // Ignore disconnect errors
            }
            prismaClient = null;
            isInitialized = false;

            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('❌ Failed to connect to MySQL database');
            console.error(`   Error: ${errorMessage}`);
            console.error(`   Host: ${DATABASE_HOST}:${DATABASE_PORT}`);
            console.error(`   Database: ${DATABASE_NAME}`);
            console.error(`   User: ${DATABASE_USER}`);

            throw new Error(
                `Failed to connect to MySQL database at ${DATABASE_HOST}:${DATABASE_PORT}. ` +
                `Error: ${errorMessage}. ` +
                'Please check your database configuration and ensure MySQL is running.'
            );
        }
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
        host: DATABASE_HOST,
        port: DATABASE_PORT,
        database: DATABASE_NAME,
        user: DATABASE_USER,
        provider: 'mysql'
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
