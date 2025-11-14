interface AppConfig {
	apiUrl: string;
	databaseUrl: string;
	secretKey: string;
	nodeEnv: string;
}

interface Config {
	app: {
		name: string;
		appName: string;
		version: string;
		description: string;
		author: string;
		website: string;
		users: string;
		license: string;
		contact: string;
		copyright: string;
		environment: string;
		title: string;
	};
	server: {
		port: number;
		host: string;
		environment: string;
		trustProxy: boolean;
		timeout: number;
	};
	database: {
		host: string;
		dataPath: string;
		port: number;
		database: string;
		user: string;
		password: string;
		migrate: boolean;
		seed: boolean;
		waitForConnections: boolean;
		connectionLimit: number;
		queueLimit: number;
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
		migrationsPath: string;
	};
	email: {
		host: string;
		port: number;
		user: string;
		password: string;
		from: string;
		secure: boolean;
	};
	redis: {
		host: string;
		port: number;
		password?: string;
	};
	client: {
		apiUrl: string;
		appTitle: string;
		debugMode: boolean;
	};
	api: {
		version: string;
		prefix: string;
	};
}
