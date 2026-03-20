import 'dotenv/config';
import cors from 'cors';
import compression from 'compression';
import { createServer, Server as HttpServer } from 'http';
import express, { Request, Response, Application } from 'express';
import { corsOptions } from './config/cors.config';
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
import { initializeConfig, RuntimeConfig } from './config/app.config';
import { SocketService } from './services/socket';

export class Server {
	private server: HttpServer;
	private app: Application;
	private electron: any | null;
	private config: RuntimeConfig;
	private socketService: SocketService;

	constructor(electronApp?: any, configOverrides?: Partial<RuntimeConfig>) {
		this.config = initializeConfig(configOverrides);

		this.app = express();
		this.electron = electronApp || null;

		if (this.electron) {
			process.env.APPDATA = this.electron.getPath('appData');
		}

		this.server = createServer(this.app);
		this.socketService = SocketService.getInstance();
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
			const userDataPath = this.electron?.getPath('userData');
			await DatabaseInitializer.ensureReady(userDataPath);
			console.log('✓ Database ready');

			const { initializeMraServices } = await import('./services/mra');
			initializeMraServices();
			console.log('✓ MRA services initialized');

			// Initialize WebSocket server (attaches to the same HTTP server)
			this.socketService.initialize(this.server);

			const port = parseInt(this.config.serverPort);
			this.server.listen(
				port,
				'0.0.0.0',
				() => {
					console.log(
						`🚀 Server running on port ${port}`
					);
				}
			);
		} catch (error) {
			console.error('Failed to start server:', error);
			throw error;
		}
	}

	public async stop() {
		await this.socketService.shutdown();
		this.server.close();
	}

	/**
	 * Get the socket service for emitting events from outside the server class.
	 * Useful in Electron apps and for inter-service communication.
	 */
	public getSocketService(): SocketService {
		return this.socketService;
	}
}

export default Server;