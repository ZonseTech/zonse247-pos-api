import 'dotenv/config';

export const NODE_ENV = process.env.NODE_ENV || "development";
export const APP_NAME = process.env.APP_NAME || "Zonse247 POS";

export const isProduction = NODE_ENV === "production";