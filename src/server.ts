import 'dotenv/config';
import cors from 'cors';
import compression from 'compression';
import { createServer, Server as HttpServer } from 'http';
import express, { Request, Response, Application } from 'express';
import { corsOptions } from './config/cors.config';
import syncService from './services/sync.service';
import { DatabaseInitializer } from './databases/prisma/databaseInitializer';
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
import { initializeEmailService } from './config/email.config';
import { BaseService } from './services/base.service';
import { initializeConfig, RuntimeConfig } from './config/app.config';

export class Server {
	private server: HttpServer;
	private app: Application;
	private electron: any | null;
	private config: RuntimeConfig;

	constructor(electronApp?: any, configOverrides?: Partial<RuntimeConfig>) {
		this.config = initializeConfig(configOverrides);

		this.app = express();
		this.electron = electronApp || null;

		if (this.electron) {
			process.env.APPDATA = this.electron.getPath('appData');
		}

		this.server = createServer(this.app);
		this.setupMiddleware();
		this.setupRoutes();
		this.setupErrorHandling();
	}

	private setupMiddleware() {
		this.app.set('trust proxy', this.config.trustProxy);
		this.app.use(timeoutHandler(this.config.serverTimeout));
		this.app.use(requestTracker);
		this.app.use(apiAnalytics);

		if (this.config.nodeEnv === 'production') {
			this.app.use(productionLogger);
		} else {
			this.app.use(developmentLogger);
		}

		this.app.use(helmetConfig);
		this.app.use(cors(corsOptions));
		this.app.use(compression());
		this.app.use(limitRequestSize(this.config.corsRequestSizeLimit));
		this.app.use(securityLogger);
		this.app.use(
			express.json({ limit: this.config.corsRequestSizeLimit })
		);
		this.app.use(
			express.urlencoded({
				extended: true,
				limit: this.config.corsRequestSizeLimit,
			})
		);
	}

	private setupRoutes() {
		this.app.get('/health', (req: Request, res: Response) => {
			res.json({
				success: true,
				status: 'healthy',
				message: 'Server is running',
				timestamp: new Date().toISOString(),
				environment: this.config.nodeEnv,
				version: this.config.appVersion,
				uptime: process.uptime(),
			});
		});

		this.app.head('/health', (req: Request, res: Response) => {
			res.status(200).end();
		});

		this.app.get('/api/v1/health', (req: Request, res: Response) => {
			res.json({
				success: true,
				status: 'healthy',
				message: 'Server is running',
				timestamp: new Date().toISOString(),
				environment: this.config.nodeEnv,
				version: this.config.appVersion,
				uptime: process.uptime(),
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
		const nodeEnv = this.config.nodeEnv;
		this.app.use((err: Error, req: Request, res: Response) => {
			console.error('Error:', err);
			res.status(500).json({
				success: false,
				message: 'Internal server error',
				error:
					nodeEnv === 'development' ? err.message : undefined,
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
		try {
			// Initialize database before starting server
			const userDataPath = this.electron?.getPath('userData');
			await DatabaseInitializer.ensureReady(userDataPath);
			console.log('✓ Database ready');

			const port = parseInt(this.config.serverPort);
			this.server.listen(
				port,
				'0.0.0.0',
				async () => {
					console.log(
						`🚀 Server running on port ${port}`
					);
					console.log(`📊 Config: ${JSON.stringify(this.config, null, 2)}`);

					const health = await BaseService.get('/health')

					console.log('External API Health Check:', JSON.stringify(health, null, 2));

					if (!this.electron) {
						await initializeEmailService()
							.then(() => {
								console.log('✓ Email service ready');
							})
							.catch((error) => {
								console.error(
									'❌ Email service initialization failed:',
									error
								);
							});
					}
				}
			);
		} catch (error) {
			console.error('Failed to start server:', error);
			throw error;
		}
	}

	public stop() {
		syncService.stopAutoSync();
		this.server.close();
	}
}

export default Server;