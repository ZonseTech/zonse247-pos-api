import 'dotenv/config';
import cors from 'cors';
import { app } from 'electron';
import compression from 'compression';
import { createServer, Server as HttpServer } from 'http';
import express, { Request, Response, Application } from 'express';
import chalk from 'chalk'; // ✅ Chalk imported

import config from './config';
import { corsOptions } from './config/cors';

import Sync from './routes/sync.routes';
import Users from './routes/users.routes';
import Printers from './routes/printer.routes';
import Settings from './routes/settings.routes';
import Inventory from './routes/inventory.routes';
import Dashboard from './routes/dashboard.routes';
import Customers from './routes/customers.routes';
import Categories from './routes/categories.routes';
import Export from './routes/database-export.routes';
import PaymentMethods from './routes/payment-method.routes';
import holdOrders from './routes/hold-orders.routes';
import Transactions from './routes/transactions.routes';
import migrationRoutes from './routes/migration.routes';

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
		this.app.get('/api/health', (req: Request, res: Response) => {
			res.json({
				success: true,
				message: 'Server is running',
				timestamp: new Date().toISOString(),
				environment: config.server.environment,
				version: process.env.npm_package_version || '1.0.0',
			});
		});

		this.app.use('/api/sync', Sync);
		this.app.use('/api/export', Export);
		this.app.use('/api/users', Users);
		this.app.use('/api/dashboard', Dashboard);
		this.app.use('/api/printers', Printers);
		this.app.use('/api/settings', Settings);
		this.app.use('/api/inventory', Inventory);
		this.app.use('/api/customers', Customers);
		this.app.use('/api/categories', Categories);
		this.app.use('/api/payment-methods', PaymentMethods);
		this.app.use('/api/migration', migrationRoutes);
		this.app.use('/api/transactions', Transactions);
		this.app.use('/api/hold-orders', holdOrders);

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
			console.error(chalk.red('❌ Error:'), err);
			res.status(500).json({
				success: false,
				message: 'Internal server error',
				error:
					config.server.environment === 'development' ? err.message : undefined,
			});
		});

		process.on('uncaughtException', (error) => {
			console.error(chalk.bgRed.white.bold('🔥 Uncaught Exception:'), error);
			process.exit(1);
		});

		process.on('unhandledRejection', (reason, promise) => {
			console.error(
				chalk.bgRed.white.bold('⚠️  Unhandled Rejection at:'),
				promise,
				'reason:',
				reason
			);
			process.exit(1);
		});
	}

	public async start() {
		this.server.listen(config.server.port, '0.0.0.0', async () => {
			console.log(
				chalk.greenBright(`🚀 Server running on port ${config.server.port}`)
			);
			console.log(chalk.cyan(`📊 Environment: ${config.server.environment}`));

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
			console.log(
				chalk.yellow(
					`🔄 Auto sync enabled (interval: ${config.sync.interval}ms)`
				)
			);
		}

		if (config.database.migrate) {
			try {
				await initDatabase();
				console.log(
					chalk.green('✅ Database migrations completed successfully')
				);
			} catch (err) {
				console.error(chalk.red('❌ Error running migrations:'), err);
			}
		}

		if (config.database.seed) {
			try {
				await seedDatabase();
				console.log(chalk.green('✅ Database seeding completed successfully'));
			} catch (err) {
				console.error(chalk.red('❌ Error running seeds:'), err);
			}
		}
	}

	private async testDatabaseConnections() {
		try {
			const connections = await syncService.testConnections();
			console.log(chalk.magenta('🔗 Database connections:'), connections);

			if (!connections.mysql) {
				console.warn(chalk.yellow('⚠️  Warning: MySQL connection failed'));
			}
			if (!connections.sealdb) {
				console.error(chalk.red('❌ Error: SealDB connection failed'));
			}
		} catch (error) {
			console.error(chalk.red('❌ Error testing database connections:'), error);
		}
	}
}

const server = new Server();
export default server;
