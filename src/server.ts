import 'dotenv/config';
import cors from 'cors';
import compression from 'compression';
import { createServer, Server as HttpServer } from 'http';
import express, { Request, Response, Application } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { corsOptions } from './config/cors';
import syncService from './services/sync.service';
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
import { swaggerOptions, swaggerUiOptions } from './config/swagger';

export class Server {
	private server: HttpServer;
	private app: Application;
	private electron: any | null;

	constructor(electronApp: any) {
		this.app = express();
		this.electron = electronApp;

		if (this.electron) {
			process.env.APPDATA = this.electron.getPath('appData');
		}

		this.server = createServer(this.app);
		this.setupMiddleware();
		this.setupSwagger();
		this.setupRoutes();
		this.setupErrorHandling();
	}

	private setupMiddleware() {
		this.app.set('trust proxy', process.env.TRUST_PROXY === 'true');
		this.app.use(timeoutHandler(parseInt(process.env.SERVER_TIMEOUT || '0')));
		this.app.use(requestTracker);
		this.app.use(apiAnalytics);

		if (process.env.NODE_ENV === 'production') {
			this.app.use(productionLogger);
		} else {
			this.app.use(developmentLogger);
		}

		this.app.use(helmetConfig);
		this.app.use(cors(corsOptions));
		this.app.use(compression());
		this.app.use(limitRequestSize(process.env.CORS_REQUEST_SIZE_LIMIT));
		this.app.use(securityLogger);
		this.app.use(express.json({ limit: process.env.CORS_REQUEST_SIZE_LIMIT }));
		this.app.use(
			express.urlencoded({
				extended: true,
				limit: process.env.CORS_REQUEST_SIZE_LIMIT,
			})
		);
	}

	private setupSwagger() {
		const swaggerSpec = swaggerJsdoc(swaggerOptions);

		this.app.use(
			'/api-docs',
			swaggerUi.serve,
			swaggerUi.setup(swaggerSpec, swaggerUiOptions)
		);

		this.app.get('/api-docs.json', (req: Request, res: Response) => {
			res.setHeader('Content-Type', 'application/json');
			res.send(swaggerSpec);
		});
	}

	private setupRoutes() {
		/**
		 * @swagger
		 * /health:
		 *   get:
		 *     summary: Health check endpoint
		 *     description: Returns the health status of the server
		 *     tags:
		 *       - Health
		 *     responses:
		 *       200:
		 *         description: Server is running
		 *         content:
		 *           application/json:
		 *             schema:
		 *               $ref: '#/components/schemas/HealthCheck'
		 */
		this.app.get('/api/v1/health', (req: Request, res: Response) => {
			res.json({
				success: true,
				message: 'Server is running',
				timestamp: new Date().toISOString(),
				environment: process.env.NODE_ENV,
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
					process.env.NODE_ENV === 'development' ? err.message : undefined,
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
		this.server.listen(
			parseInt(process.env.SERVER_PORT || '3000'),
			'0.0.0.0',
			async () => {
				console.log(`🚀 Server running on port ${process.env.SERVER_PORT}`);
				console.log(`📊 Environment: ${process.env.NODE_ENV}`);
				console.log(
					`📚 Swagger docs available at http://0.0.0.0:${process.env.SERVER_PORT}/api-docs`
				);
				console.log(
					`📄 Swagger JSON available at http://0.0.0.0:${process.env.SERVER_PORT}/api-docs.json`
				);

				if (!this.electron)
					await initializeEmailService()
						.then(() => {
							console.log('✅ Email service ready');
						})
						.catch((error) => {
							console.error('❌ Email service initialization failed:', error);
						});
			}
		);
	}

	public stop() {
		syncService.stopAutoSync();
		this.server.close();
	}
}