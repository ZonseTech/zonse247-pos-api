/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import {
    OFFLINE_MODE,
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

const initializeLocalClient = () => {
    if (!localClient) {
        const adapter = new PrismaBetterSqlite3({ url: DATABASE_URL || 'file:local.db' });
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

    if (!OFFLINE_MODE) {
        try {
            console.log('🌐 Attempting to connect to remote MySQL database...');
            prismaInstance = await initializeRemoteClient();
            console.log('✅ Connected to remote MySQL database');
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
    console.log('✅ Connected to remote SQLite database');
    return prismaInstance;
};

/**
 * Prisma client wrapper that ensures initialization before any operation
 * Use directly: prisma.model.findMany()
 */
class PrismaClientWrapper {
    private clientPromise: Promise<PrismaClient>;

    constructor() {
        this.clientPromise = initializePrisma();
    }

    private async getClient(): Promise<PrismaClient> {
        if (!isInitialized) {
            await this.clientPromise;
        }
        return prismaInstance!;
    }

    // Proxy all property access to the actual client
    private createProxy(): any {
        return new Proxy(this, {
            get: (target, prop: string) => {
                // If accessing a method on the wrapper itself
                if (prop in target) {
                    return (target as any)[prop];
                }

                // Return a function that will get the client and access the property
                return new Proxy(() => { }, {
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

const wrapper = new PrismaClientWrapper();

/**
 * Prisma client instance with lazy initialization
 * Use directly: prisma.model.findMany()
 * All operations automatically wait for initialization
 */
export const prisma: PrismaClient = wrapper.getProxy();

/**
 * Get the Prisma client instance (ensures initialization)
 */
export const getPrisma = async (): Promise<PrismaClient> => {
    if (!isInitialized) {
        await initializePrisma();
    }
    return prismaInstance!;
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
        offlineMode: OFFLINE_MODE
    };
};

export default prisma;