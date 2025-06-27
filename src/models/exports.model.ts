import fs from 'fs';
import path from 'path';
import config from '../config';
import Datastore from '@seald-io/nedb';

export class ExportDBModel {
	private tableName: string;
	private database: Datastore;

	constructor(tableName: string) {
		this.tableName = tableName;
		this.initializeDatabase(tableName);
	}

	private getAppDataPath(): string {
		return path.join(config.upload.migrationsPath);
	}

	private ensureDirectoryExists(dirPath: string): void {
		try {
			if (!fs.existsSync(dirPath)) {
				fs.mkdirSync(dirPath, { recursive: true });
				console.log(`Created directory: ${dirPath}`);
			}
		} catch (error) {
			console.error(`Error creating directory ${dirPath}:`, error);
			throw error;
		}
	}

	private initializeDatabase(tableName: string) {
		try {
			const databaseDir = this.getAppDataPath();

			this.ensureDirectoryExists(databaseDir);

			try {
				const dbPath = path.join(databaseDir, `${tableName}.db`);

				this.database = new Datastore({
					filename: dbPath,
					autoload: true,
				});

				console.log(`Initialized database for table: ${tableName}`);
			} catch (error) {
				console.error(
					`Error initializing database for table ${tableName}:`,
					error
				);
				throw error;
			}
		} catch (error) {
			console.error('Error initializing databases:', error);
			throw error;
		}
	}

	public getDB(tableName: string): Datastore {
		if (!this.database) {
			throw new Error(`Database for table ${tableName} not found`);
		}
		return this.database;
	}

	public find(conditions: any = {}): Promise<any[]> {
		return new Promise((resolve, reject) => {
			try {
				const db = this.database;
				db.find(conditions, (err: Error | null, docs: any[]) => {
					if (err) reject(err);
					else resolve(docs);
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	public count(conditions: any = {}): Promise<number> {
		return new Promise((resolve, reject) => {
			try {
				const db = this.database;
				db.count(conditions, (err: Error | null, count: number) => {
					if (err) reject(err);
					else resolve(count);
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	public getDatabasePaths(): string {
		const databaseDir = this.getAppDataPath();

		return path.join(databaseDir, `${this.tableName}.db`);
	}
}
