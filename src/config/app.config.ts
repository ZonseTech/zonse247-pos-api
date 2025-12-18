import 'dotenv/config';

export const NODE_ENV = process.env.NODE_ENV || "development";
export const APP_NAME = process.env.APP_NAME || "Zonse247 POS";
export const APPLICATION_ENVIRONMENT = process.env.APPLICATION_ENVIRONMENT || "api";
export const APPLICATION_OFFLINE_MODE = (process.env.APPLICATION_OFFLINE_MODE || "false").toLowerCase() === "true";

export const isProduction = NODE_ENV === "production";
export const isOfflineMode = APPLICATION_OFFLINE_MODE;