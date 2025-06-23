import 'dotenv/config';
import cors from 'cors';
import { app } from 'electron';
import compression from 'compression';
import { createServer, Server as HttpServer } from 'http';
import express, { Request, Response, Application } from 'express';

import config from './config';
import { corsOptions } from './config/cors';

import syncService from './services/sync.service';
import { initDatabase } from './databases/remote/migrations';
import { seedDatabase } from './databases/local/seeds';
import { timeoutHandler } from './middlewares/error.middleware';
import {
	apiAnalytics,
	developmentLogger,
	productionLogger,
	requestTracker,
	securityLogger,
} from './middlewares/logging.middleware';
import {
	helmetConfig,
	limitRequestSize,
} from './middlewares/security.middleware';
import ApiRoutes from './routes';

class Server {
	private server: HttpServer;
	private app: Application;

	constructor() {
		this.app = express();

		if (process.versions.electron) {
			process.env.APPDATA = app.getPath('appData');
		}

		this.server = createServer(this.app);

		this.setupMiddleware();
		this.setupRoutes();
		this.setupErrorHandling();
	}

	private setupMiddleware() {
		this.app.set('trust proxy', config.server.trustProxy);
		this.app.use(timeoutHandler(config.server.timeout));
		this.app.use(requestTracker);
		this.app.use(apiAnalytics);

		if (config.server.environment === 'production') {
			this.app.use(productionLogger);
		} else {
			this.app.use(developmentLogger);
		}

		this.app.use(helmetConfig);
		this.app.use(cors(corsOptions));
		this.app.use(compression());
		this.app.use(limitRequestSize(config.security.requestSizeLimit));
		this.app.use(securityLogger);

		this.app.use(express.json({ limit: config.security.requestSizeLimit }));
		this.app.use(
			express.urlencoded({
				extended: true,
				limit: config.security.requestSizeLimit,
			})
		);
	}

	private setupRoutes() {
		this.app.get('/api/v1/health', (req: Request, res: Response) => {
			res.json({
				success: true,
				message: 'Server is running',
				timestamp: new Date().toISOString(),
				environment: config.server.environment,
				version: process.env.npm_package_version || '1.0.0',
			});
		});

		this.app.use('/api/v1', ApiRoutes);

		this.app.use((req: Request, res: Response) => {
			res.status(404).json({
				success: false,
				message: 'Endpoint not found',
				path: req.originalUrl,
				method: req.method,
			});
		});
	}

	private setupErrorHandling() {
		this.app.use((err: Error, req: Request, res: Response) => {
			console.error('Error:', err);
			res.status(500).json({
				success: false,
				message: 'Internal server error',
				error:
					config.server.environment === 'development' ? err.message : undefined,
			});
		});

		process.on('uncaughtException', (error) => {
			console.error('Uncaught Exception:', error);
			process.exit(1);
		});

		process.on('unhandledRejection', (reason, promise) => {
			console.error('Unhandled Rejection at:', promise, 'reason:', reason);
			process.exit(1);
		});
	}

	public async start() {
		this.server.listen(config.server.port, '0.0.0.0', async () => {
			console.log(`🚀 Server running on port ${config.server.port}`);
			console.log(`📊 Environment: ${config.server.environment}`);

			await this.initializeServices();
		});
	}

	public stop() {
		syncService.stopAutoSync();
		this.server.close();
	}

	private async initializeServices() {
		await this.testDatabaseConnections();

		if (config.sync.enabled) {
			syncService.startAutoSync(config.sync.interval);
			console.log(`🔄 Auto sync enabled (interval: ${config.sync.interval}ms)`);
		}

		if (config.database.migrate) {
			try {
				await initDatabase();
				console.log('✅ Database migrations completed successfully');
			} catch (err) {
				console.error('❌ Error running migrations:', err);
			}
		}

		if (config.database.seed) {
			try {
				await seedDatabase();
				console.log('✅ Database seeding completed successfully');
			} catch (err) {
				console.error('❌ Error running seeds:', err);
			}
		}
	}

	private async testDatabaseConnections() {
		try {
			const connections = await syncService.testConnections();
			console.log('🔗 Database connections:', connections);

			if (!connections.mysql) {
				console.warn('⚠️  Warning: MySQL connection failed');
			}
			if (!connections.sealdb) {
				console.error('❌ Error: SealDB connection failed');
			}
		} catch (error) {
			console.error('❌ Error testing database connections.');
		}
	}
}

const server = new Server();
export default server;
