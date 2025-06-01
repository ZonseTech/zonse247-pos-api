import fs from 'fs';
import path from 'path';
import Datastore from '@seald-io/nedb';

export class ExportDBModel {
	private tables: Array<string>;
	private databases: { [key: string]: Datastore } = {};

	constructor(tables: Array<string>) {
		this.tables = tables;
		this.initializeDatabases();
	}

	private getAppDataPath(): string {
		const appData = process.env.APPDATA || '';
		const appName = process.env.APPNAME || 'z-pharmacy';

		if (!appData) {
			throw new Error('APPDATA environment variable not found');
		}

		return path.join(appData, appName, 'src', 'api', 'databases');
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

	private initializeDatabases() {
		try {
			const databaseDir = this.getAppDataPath();

			this.ensureDirectoryExists(databaseDir);

			this.tables.forEach((tableName) => {
				try {
					const dbPath = path.join(databaseDir, `${tableName}.db`);

					this.databases[tableName] = new Datastore({
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
			});
		} catch (error) {
			console.error('Error initializing databases:', error);
			throw error;
		}
	}

	public getDB(tableName: string): Datastore {
		if (!this.databases[tableName]) {
			throw new Error(`Database for table ${tableName} not found`);
		}
		return this.databases[tableName];
	}

	public find(table: string, conditions: any = {}): Promise<any[]> {
		return new Promise((resolve, reject) => {
			try {
				const db = this.getDB(table);
				db.find(conditions, (err: Error | null, docs: any[]) => {
					if (err) reject(err);
					else resolve(docs);
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	public count(table: string, conditions: any = {}): Promise<number> {
		return new Promise((resolve, reject) => {
			try {
				const db = this.getDB(table);
				db.count(conditions, (err: Error | null, count: number) => {
					if (err) reject(err);
					else resolve(count);
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	public getDatabasePaths(): { [key: string]: string } {
		const databaseDir = this.getAppDataPath();
		const paths: { [key: string]: string } = {};

		Object.keys(this.databases).forEach((tableName) => {
			paths[tableName] = path.join(databaseDir, `${tableName}.db`);
		});

		return paths;
	}
}
