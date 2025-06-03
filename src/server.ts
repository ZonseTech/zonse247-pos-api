import 'dotenv/config';
import { app } from 'electron';
import { createServer, Server as HttpServer } from 'http';
import express, { Request, Response, NextFunction, Application } from 'express';
import { rateLimit } from 'express-rate-limit';

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
import syncService from './services/sync.service';
import { initDatabase } from './databases/remote/migrations';
import { seedDatabase } from './databases/local/seeds';
import migrationRoutes from './routes/migration.routes';

class Server {
	private server: HttpServer;
	private port: number;
	private app: Application;

	constructor() {
		this.app = express();

		if (process.versions.electron) {
			process.env.APPDATA = app.getPath('appData');
		}

		this.port = parseInt(process.env.PORT || '3000');
		this.server = createServer(this.app);

		this.setupMiddleware();
		this.setupRoutes();
		this.setupErrorHandling();
	}

	private setupMiddleware() {
		const limiter = rateLimit({
			windowMs: 15 * 60 * 1000,
			max: 1000,
		});

		this.app.use(limiter);

		this.app.use(express.json());
		this.app.use(express.urlencoded({ extended: false }));
	}

	private setupRoutes() {
		this.app.use((req: Request, res: Response, next: NextFunction) => {
			res.header('Access-Control-Allow-Origin', '*');
			res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
			res.header(
				'Access-Control-Allow-Headers',
				'Content-type,Accept,X-Access-Token,X-Key'
			);
			if (req.method === 'OPTIONS') {
				res.status(200).end();
			} else {
				next();
			}
		});

		this.app.get('/', (req: Request, res: Response) => {
			res.send('POS Server Online.');
		});

		this.app.get('/api/health', (req: Request, res: Response) => {
			res.json({
				success: true,
				message: 'Server is running',
				timestamp: new Date().toISOString(),
				environment: process.env.NODE_ENV,
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
			console.error('Error:', err);
			res.status(500).json({
				success: false,
				message: 'Internal server error',
				error: process.env.NODE_ENV === 'development' ? err.message : undefined,
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
		this.server.listen(this.port, '0.0.0.0', async () => {
			console.log(`Server running on port ${this.port}`);
			console.log(`Environment: ${process.env.NODE_ENV}`);

			this.testDatabaseConnections();

			if (process.env.AUTO_SYNC_ENABLED === 'true') {
				const interval = parseInt(process.env.SYNC_INTERVAL || '300000');
				syncService.startAutoSync(interval);
			}

			if (process.env.MYSQL_DB_MIGRATE === 'true') {
				await initDatabase()
					.then(() => {
						console.log('Database migrations completed successfully');
					})
					.catch((err) => {
						console.error('Error running migrations:', err);
					});
			}

			if (process.env.DB_SEED === 'true') {
				await seedDatabase()
					.then(() => {
						console.log('Database seeding completed successfully');
					})
					.catch((err) => {
						console.error('Error running seeds:', err);
					});
			}
		});
	}

	public stop() {
		syncService.stopAutoSync();
		this.server.close();
	}

	private async testDatabaseConnections() {
		try {
			const connections = await syncService.testConnections();
			console.log('Database connections:', connections);
			if (!connections.mysql) {
				console.warn('Warning: MySQL connection failed');
			}
			if (!connections.sealdb) {
				console.error('Error: SealDB connection failed');
			}
		} catch (error) {
			console.error('Error testing database connections:', error);
		}
	}
}

const server = new Server();
export default server;
