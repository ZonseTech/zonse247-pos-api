import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

export function loadEnvironment(): AppConfig {
	const envPath = join(process.resourcesPath, '.env');

	if (existsSync(envPath)) {
		const envContent = readFileSync(envPath, 'utf8');

		envContent.split('\n').forEach((line) => {
			const [key, value] = line.split('=');
			if (key && value) {
				process.env[key.trim()] = value.trim();
			}
		});
	}

	return {
		apiUrl: process.env.API_URL || 'http://localhost:3000',
		databaseUrl: process.env.DATABASE_URL || 'sqlite://./dev.db',
		secretKey: process.env.SECRET_KEY || 'dev-secret',
		nodeEnv: process.env.NODE_ENV || 'development',
	};
}
