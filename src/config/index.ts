import path from 'path';
import dotenv from 'dotenv';

const envFile =
	process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export interface Config {
	server: {
		port: number;
		host: string;
		environment: string;
		trustProxy: boolean;
		timeout: number;
	};
	database: {
		host: string;
		port: number;
		name: string;
		user: string;
		password: string;
		migrate: boolean;
		seed: boolean;
	};
	jwt: {
		secret: string;
		expiresIn: string;
		refreshSecret: string;
		refreshExpiresIn: string;
	};
	security: {
		bcryptSaltRounds: number;
		allowedOrigins: string[];
		requestSizeLimit: string;
	};
	rateLimiting: {
		windowMs: number;
		maxRequests: number;
		authMaxRequests: number;
		accountCreationLimit: number;
	};
	logging: {
		level: string;
		enableAnalytics: boolean;
		filePath: string;
	};
	sync: {
		enabled: boolean;
		interval: number;
	};
	upload: {
		maxFileSize: string;
		uploadPath: string;
	};
	email: {
		host: string;
		port: number;
		user: string;
		password: string;
	};
	redis: {
		host: string;
		port: number;
		password?: string;
	};
}

const parseBoolean = (
	value: string | undefined,
	defaultValue = false
): boolean => {
	if (!value) return defaultValue;
	return value.toLowerCase() === 'true';
};

const parseInteger = (
	value: string | undefined,
	defaultValue: number
): number => {
	if (!value) return defaultValue;
	const parsed = parseInt(value, 10);
	return isNaN(parsed) ? defaultValue : parsed;
};

const config: Config = {
	server: {
		port: parseInteger(process.env.PORT, 3000),
		host: process.env.HOST || 'localhost',
		environment: process.env.NODE_ENV || 'development',
		trustProxy: parseBoolean(process.env.TRUST_PROXY, true),
		timeout: parseInteger(process.env.SERVER_TIMEOUT, 30000),
	},
	database: {
		host: process.env.DB_HOST || 'localhost',
		port: parseInteger(process.env.DB_PORT, 5432),
		name: process.env.DB_NAME || 'user_management',
		user: process.env.DB_USER || 'mysql',
		password: process.env.DB_PASSWORD || '',
		migrate: parseBoolean(process.env.DB_MIGRATE),
		seed: parseBoolean(process.env.DB_SEED),
	},
	jwt: {
		secret: process.env.JWT_SECRET || '',
		expiresIn: process.env.JWT_EXPIRES_IN || '24h',
		refreshSecret: process.env.JWT_REFRESH_SECRET || '',
		refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
	},
	security: {
		bcryptSaltRounds: parseInteger(process.env.BCRYPT_SALT_ROUNDS, 12),
		allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',').map((origin) =>
			origin.trim()
		) || ['http://localhost:3000'],
		requestSizeLimit: process.env.REQUEST_SIZE_LIMIT || '10mb',
	},
	rateLimiting: {
		windowMs: parseInteger(process.env.RATE_LIMIT_WINDOW_MS, 900000),
		maxRequests: parseInteger(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
		authMaxRequests: parseInteger(process.env.AUTH_RATE_LIMIT_MAX, 5),
		accountCreationLimit: parseInteger(process.env.ACCOUNT_CREATION_LIMIT, 3),
	},
	logging: {
		level: process.env.LOG_LEVEL || 'info',
		enableAnalytics: parseBoolean(process.env.ENABLE_ANALYTICS),
		filePath: process.env.LOG_FILE_PATH || './logs/app.log',
	},
	sync: {
		enabled: parseBoolean(process.env.AUTO_SYNC_ENABLED),
		interval: parseInteger(process.env.SYNC_INTERVAL, 300000),
	},
	upload: {
		maxFileSize: process.env.MAX_FILE_SIZE || '10mb',
		uploadPath: process.env.UPLOAD_PATH || './uploads',
	},
	email: {
		host: process.env.SMTP_HOST || 'smtp.gmail.com',
		port: parseInteger(process.env.SMTP_PORT, 587),
		user: process.env.SMTP_USER || '',
		password: process.env.SMTP_PASS || '',
	},
	redis: {
		host: process.env.REDIS_HOST || 'localhost',
		port: parseInteger(process.env.REDIS_PORT, 6379),
		password: process.env.REDIS_PASSWORD || undefined,
	},
};

export const validateConfig = (): void => {
	const requiredEnvVars = [
		'JWT_SECRET',
		'JWT_REFRESH_SECRET',
		'DB_HOST',
		'DB_NAME',
		'DB_USER',
		'DB_PASSWORD',
	];

	const missingVars = requiredEnvVars.filter(
		(varName) => !process.env[varName]
	);

	if (missingVars.length > 0) {
		console.error(
			'❌ Missing required environment variables:',
			missingVars.join(', ')
		);
		console.error(
			'Please check your .env file and ensure all required variables are set.'
		);
		process.exit(1);
	}

	const warnings: string[] = [];

	if (config.jwt.secret.length < 32) {
		warnings.push('JWT_SECRET should be at least 32 characters long');
	}

	if (config.jwt.refreshSecret.length < 32) {
		warnings.push('JWT_REFRESH_SECRET should be at least 32 characters long');
	}

	if (config.server.environment === 'production') {
		if (
			config.security.allowedOrigins.some((origin) =>
				origin.includes('localhost')
			)
		) {
			warnings.push(
				'Localhost origins are allowed in production - review ALLOWED_ORIGINS'
			);
		}

		if (config.security.bcryptSaltRounds < 12) {
			warnings.push('BCRYPT_SALT_ROUNDS should be at least 12 in production');
		}
	}

	if (warnings.length > 0) {
		console.warn('⚠️  Configuration warnings:');
		warnings.forEach((warning) => console.warn(`   • ${warning}`));
	}

	console.log('✅ Configuration validated successfully');
};

validateConfig();

export default config;
