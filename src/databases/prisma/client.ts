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
let initPromise: Promise<PrismaClient> | null = null;

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

    if (OFFLINE_MODE) {
        console.log('📦 Using local SQLite database');
        prismaInstance = initializeLocalClient();
        return prismaInstance;
    }

    try {
        console.log('🌐 Attempting to connect to remote MySQL database...');
        prismaInstance = await initializeRemoteClient();
        console.log('✅ Connected to remote MySQL database');
        return prismaInstance;
    } catch (error) {
        console.warn('⚠️  Failed to connect to remote database, falling back to local:', error);
        prismaInstance = initializeLocalClient();
        return prismaInstance;
    }
};

initPromise = initializePrisma();

export const prisma = new Proxy({} as PrismaClient, {
    get: (target, prop) => {
        return async (...args: any[]) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const client = await initPromise!;
            const value = (client as any)[prop];
            if (typeof value === 'function') {
                return value.apply(client, args);
            }
            return value;
        };
    }
});

export const getPrismaClient = async (): Promise<PrismaClient> => {
    if (!initPromise) {
        initPromise = initializePrisma();
    }
    return initPromise;
};

export const disconnectPrisma = async () => {
    if (localClient) await localClient.$disconnect();
    if (remoteClient) await remoteClient.$disconnect();
    prismaInstance = null;
    localClient = null;
    remoteClient = null;
    initPromise = null;
};

export default prisma;