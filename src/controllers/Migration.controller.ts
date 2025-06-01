import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { mysqlPool } from '../config/db';
import { Request, Response } from 'express';
import { sealDBModel } from '../databases/local';

export class MigrationController {
	private migrationProgress: MigrationProgress[] = [];
	private migrationStats: MigrationStats = {
		total: 0,
		completed: 0,
		errors: 0,
		progress: 0,
	};
	private isMigrating = false;
	private uploadedData: any[] = [];
	private currentTableName = '';

	public uploadFile = async (req: Request, res: Response) => {
		try {
			if (!req.file) {
				return res.status(400).json({
					success: false,
					message: 'No file uploaded',
				});
			}

			const filePath = req.file.path;
			const tableName = req.body.tableName;
			const fileExtension = path.extname(req.file.originalname).toLowerCase();
			let data: any[] = [];

			switch (fileExtension) {
				case '.db':
					data = await this.parseNeDBFile(filePath);
					break;
				case '.json':
					data = await this.parseJSONFile(filePath);
					break;
				case '.csv':
					data = await this.parseCSVFile(filePath);
					break;
				default:
					throw new Error('Unsupported file type');
			}

			this.uploadedData = data;
			this.currentTableName = tableName;

			fs.unlinkSync(filePath);

			res.json({
				success: true,
				message: 'File uploaded and parsed successfully',
				recordCount: data.length,
				tableName,
				preview: data.slice(0, 5),
			});
		} catch (error: any) {
			console.error('Upload error:', error);

			if (req.file?.path && fs.existsSync(req.file.path)) {
				fs.unlinkSync(req.file.path);
			}

			res.status(500).json({
				success: false,
				message: error.message || 'Error processing uploaded file',
			});
		}
	};

	public startMigration = async (req: Request, res: Response) => {
		try {
			if (this.isMigrating) {
				return res.status(400).json({
					success: false,
					message: 'Migration already in progress',
				});
			}

			if (this.uploadedData.length === 0) {
				return res.status(400).json({
					success: false,
					message: 'No data to migrate. Please upload a file first.',
				});
			}

			this.isMigrating = true;
			this.migrationProgress = [];
			this.migrationStats = {
				total: this.uploadedData.length,
				completed: 0,
				errors: 0,
				progress: 0,
			};

			this.performMigration();

			res.json({
				success: true,
				message: 'Migration started',
				recordCount: this.uploadedData.length,
			});
		} catch (error: any) {
			console.error('Migration start error:', error);
			res.status(500).json({
				success: false,
				message: error.message || 'Error starting migration',
			});
		}
	};

	public getMigrationProgress = (req: Request, res: Response) => {
		res.json({
			progress: this.migrationProgress,
			stats: this.migrationStats,
			completed: !this.isMigrating,
			isRunning: this.isMigrating,
		});
	};

	public resetMigration = (req: Request, res: Response) => {
		this.migrationProgress = [];
		this.migrationStats = { total: 0, completed: 0, errors: 0, progress: 0 };
		this.isMigrating = false;
		this.uploadedData = [];
		this.currentTableName = '';

		res.json({
			success: true,
			message: 'Migration reset successfully',
		});
	};

	private async performMigration() {
		try {
			this.addProgress(
				'migration',
				'processing',
				'Starting migration process...'
			);

			await this.testConnections();

			const batchSize = 100;
			const batches = Math.ceil(this.uploadedData.length / batchSize);

			for (let i = 0; i < batches; i++) {
				const start = i * batchSize;
				const end = Math.min(start + batchSize, this.uploadedData.length);
				const batch = this.uploadedData.slice(start, end);

				this.addProgress(
					`batch-${i + 1}`,
					'processing',
					`Processing batch ${i + 1} of ${batches}`,
					`Records ${start + 1}-${end}`
				);

				try {
					await this.migrateBatch(batch);
					this.migrationStats.completed += batch.length;

					this.addProgress(
						`batch-${i + 1}`,
						'completed',
						`Batch ${i + 1} completed successfully`,
						`${batch.length} records migrated`
					);
				} catch (error: any) {
					this.migrationStats.errors += batch.length;
					this.addProgress(
						`batch-${i + 1}`,
						'error',
						`Batch ${i + 1} failed`,
						error.message
					);
				}

				this.migrationStats.progress = Math.round(
					((this.migrationStats.completed + this.migrationStats.errors) /
						this.migrationStats.total) *
						100
				);
			}

			this.addProgress(
				'migration',
				'completed',
				'Migration completed successfully'
			);
		} catch (error: any) {
			console.error('Migration error:', error);
			this.addProgress('migration', 'error', 'Migration failed', error.message);
		} finally {
			this.isMigrating = false;
		}
	}

	private async migrateBatch(batch: any[]) {
		const connection = await mysqlPool.getConnection();

		try {
			await connection.beginTransaction();

			for (const record of batch) {
				const cleanRecord = this.prepareRecordForMySQL(record);

				await this.insertIntoMySQL(connection, cleanRecord);

				await this.syncToLocalDB(cleanRecord);
			}

			await connection.commit();
		} catch (error) {
			await connection.rollback();
			throw error;
		} finally {
			connection.release();
		}
	}

	private async insertIntoMySQL(connection: any, record: any) {
		const fields = Object.keys(record).filter((key) => key !== '_id');

		const values = fields.map((key) => record[key]);

		const fieldString = fields
			.map((field) => field.replace(/([A-Z])/g, '_$1').toLowerCase())
			.join(', ');

		const placeholders = fields.map(() => '?').join(', ');
		const query = `INSERT INTO ${this.currentTableName} (${fieldString}) VALUES (${placeholders})`;

		await connection.execute(query, values);
	}

	private async syncToLocalDB(record: any) {
		try {
			await sealDBModel.insert(this.currentTableName, {
				...record,
				synced: 1,
			});
		} catch (error: any) {
			if (!error.message?.includes('unique')) {
				throw error;
			}
		}
	}

	private prepareRecordForMySQL(record: any): any {
		const cleanRecord = { ...record };

		if (!cleanRecord.uuid) {
			cleanRecord.uuid =
				(cleanRecord._id || '').toString() || this.generateUUID();
		}

		delete cleanRecord._id;

		if (!cleanRecord.synced) {
			cleanRecord.synced = 1;
		}

		if (cleanRecord.createdAt && typeof cleanRecord.createdAt === 'object') {
			cleanRecord.created_at = new Date(
				cleanRecord.createdAt.$$date || cleanRecord.createdAt
			).toISOString();
		}

		if (cleanRecord.updatedAt && typeof cleanRecord.updatedAt === 'object') {
			cleanRecord.updated_at = new Date(
				cleanRecord.updatedAt.$$date || cleanRecord.updatedAt
			).toISOString();
		}

		if (!cleanRecord.createdAt) {
			cleanRecord.created_at = new Date().toISOString();
		}

		if (!cleanRecord.updatedAt) {
			cleanRecord.updated_at = new Date().toISOString();
		}

		return cleanRecord;
	}

	private async parseNeDBFile(filePath: string): Promise<any[]> {
		return new Promise((resolve, reject) => {
			const data: any[] = [];
			const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });

			let buffer = '';

			fileStream.on('data', (chunk) => {
				buffer += chunk;
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (line.trim()) {
						try {
							const record = JSON.parse(line);
							data.push(record);
						} catch (error) {
							console.warn('Failed to parse line:', line);
						}
					}
				}
			});

			fileStream.on('end', () => {
				if (buffer.trim()) {
					try {
						const record = JSON.parse(buffer);
						data.push(record);
					} catch (error) {
						console.warn('Failed to parse final line:', buffer);
					}
				}
				resolve(data);
			});

			fileStream.on('error', reject);
		});
	}

	private async parseJSONFile(filePath: string): Promise<any[]> {
		const content = fs.readFileSync(filePath, 'utf8');
		const parsed = JSON.parse(content);
		return Array.isArray(parsed) ? parsed : [parsed];
	}

	private async parseCSVFile(filePath: string): Promise<any[]> {
		return new Promise((resolve, reject) => {
			const content = fs.readFileSync(filePath, 'utf8');

			Papa.parse(content, {
				header: true,
				dynamicTyping: true,
				skipEmptyLines: true,
				complete: (results) => {
					resolve(results.data);
				},
				error: (error: any) => {
					reject(error);
				},
			});
		});
	}

	private async testConnections() {
		try {
			const connection = await mysqlPool.getConnection();
			await connection.ping();
			connection.release();

			await sealDBModel.count('users');

			this.addProgress(
				'connection-test',
				'completed',
				'Database connections verified'
			);
		} catch (error: any) {
			throw new Error(`Database connection failed: ${error.message}`);
		}
	}

	private addProgress(
		table: string,
		status: MigrationProgress['status'],
		message: string,
		details?: string
	) {
		this.migrationProgress.push({
			table,
			status,
			message,
			details,
			timestamp: new Date().toLocaleTimeString(),
		});

		if (this.migrationProgress.length > 50) {
			this.migrationProgress = this.migrationProgress.slice(-50);
		}
	}

	private generateUUID(): string {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
			/[xy]/g,
			function (c) {
				const r = (Math.random() * 16) | 0;
				const v = c == 'x' ? r : (r & 0x3) | 0x8;
				return v.toString(16);
			}
		);
	}
}
