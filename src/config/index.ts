import { Config } from "config";

const config: Config = {
	app: {
		name: 'Zonse247 POS',
		appName: 'zonse247-pos',
		version: '1.0.0',
		description: 'Point of Sale System for Zonse247',
		author: 'Zonse247 Team',
		website: 'https://pos.zonse247.com',
		users: 'users',
		license: 'MIT',
		contact: '+265991593543',
		copyright: '© 2023 Zonse247 Team',
		environment: 'web',
		title: 'Zonse247 POS',
	},
	server: {
		port: 3000,
		host: 'localhost',
		environment: 'production',
		trustProxy: true,
		timeout: 30000,
	},
	database: {
		// host: '127.0.0.1',
		// database: 'zonse247_pos_dev',
		// user: 'root',
		// password: 'Ccera-2017',
		host: '139.59.103.109',
		database: 'master_db',
		user: 'master',
		password: 'Master-2017',
		dataPath: './.data/zonse247-pos',
		port: 3306,
		migrate: true,
		seed: true,
		waitForConnections: true,
		connectionLimit: 10,
		queueLimit: 0,
	},
	jwt: {
		secret: 'b206c54227610532d1ddb46c207c7fb9f5d181d662eec89fa228fa2ca20dd2a4',
		expiresIn: '24h',
		refreshSecret:
			'3f2cc4c572e436978a4de705f7ceb47f72685c49f7d52f1b533219a7c986f709',
		refreshExpiresIn: '7d',
	},
	security: {
		bcryptSaltRounds: 12,
		allowedOrigins: [
			'http://localhost:5173',
			'http://localhost:3000',
			'http://localhost:3001',
			'http://pos.vitalitymw.com',
			'http://127.0.0.1:3000',
		],
		requestSizeLimit: '10mb',
	},
	rateLimiting: {
		windowMs: 900000,
		maxRequests: 100,
		authMaxRequests: 5,
		accountCreationLimit: 5,
	},
	logging: {
		level: 'info',
		enableAnalytics: true,
		filePath: './logs/app.log',
	},
	sync: {
		enabled: false,
		interval: 300000,
	},
	upload: {
		maxFileSize: '10mb',
		uploadPath: './.backups/uploads',
		migrationsPath: './.backups/migrations',
	},
	email: {
		host: 'smtp.gmail.com',
		port: 587,
		user: 'zonse247@gmail.com',
		password: 'beyx utjh idqi bamr',
		from: 'Zonse247 POS <zonse247@gmail.com>',
		secure: false,
	},
	redis: {
		host: 'localhost',
		port: 6379,
		password: undefined,
	},
	client: {
		apiUrl: 'http://localhost:3000/api/v1',
		appTitle: 'Zonse247 POS',
		debugMode: true,
	},
	api: {
		version: 'v1',
		prefix: '/api',
	},
};

export const validateConfig = async (): Promise<boolean> => {
	const missingValues: string[] = [];

	if (!config.jwt.secret) missingValues.push('JWT_SECRET');
	if (!config.jwt.refreshSecret) missingValues.push('JWT_REFRESH_SECRET');
	if (!config.database.host) missingValues.push('DB_HOST');
	if (!config.database.database) missingValues.push('DB_NAME');
	if (!config.database.user) missingValues.push('DB_USER');
	if (!config.database.password) missingValues.push('DB_PASSWORD');

	if (missingValues.length > 0) {
		console.error(
			'❌ Missing required configuration values:',
			missingValues.join(', ')
		);
		console.error(
			'Please check your configuration and ensure all required values are set.'
		);
		// process.exit(1);
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

	return true;
};

export default config;
