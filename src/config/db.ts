export const NODE_ENV = process.env.NODE_ENV || "development";
export const DATABASE_PROVIDER = process.env.DATABASE_PROVIDER || "sqlite";
export const DATABASE_URL = process.env.DATABASE_URL || "file:./offline.db";
export const MYSQL_URL = process.env.MYSQL_URL || process.env.DATABASE_URL;

export const OFFLINE_MODE = (process.env.OFFLINE_MODE || "false").toLowerCase() === "true";

export const DATABASE_HOST = process.env.DATABASE_HOST || "localhost";
export const DATABASE_USER = process.env.DATABASE_USER || "root";
export const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || "";
export const DATABASE_NAME = process.env.DATABASE_NAME || "app";
export const DATABASE_PORT = process.env.DATABASE_PORT ? parseInt(process.env.DATABASE_PORT) : 3306;

export const isProduction = NODE_ENV === "production";
export const isOfflineForced = OFFLINE_MODE;
