import fs from 'fs';
import path from 'path';
import tables, {
	CATEGORY_DB,
	INVENTORY_DB,
	ORDERS_DB,
	SYNC_STATUS_TABLE,
	TRANSACTIONS_DB,
	USERS_DB,
} from './tables';
import Datastore from '@seald-io/nedb';

export class SealDBModel {
	private syncStatusDB: any;
	private databases: { [key: string]: Datastore } = {};

	constructor() {
		this.initializeDatabases();
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

	private getAppDataPath(): string {
		const appData = process.env.APPDATA || '';
		const appName = process.env.APPNAME || 'z-pharmacy';

		if (!appData) {
			throw new Error('APPDATA environment variable not found');
		}

		return path.join(appData, appName, 'databases');
		// return path.join(appData, appName, 'src', 'api', 'databases');
	}

	private initializeDatabases() {
		try {
			const databaseDir = this.getAppDataPath();

			this.ensureDirectoryExists(databaseDir);

			const syncStatusPath = path.join(databaseDir, SYNC_STATUS_TABLE);
			this.syncStatusDB = new Datastore({
				filename: syncStatusPath,
				autoload: true,
			});

			this.syncStatusDB.ensureIndex({ fieldName: 'tableName', unique: true });

			tables.forEach((tableName) => {
				try {
					const dbPath = path.join(databaseDir, `${tableName}.db`);

					this.databases[tableName] = new Datastore({
						filename: dbPath,
						autoload: true,
					});

					this.databases[tableName].ensureIndex({
						fieldName: 'uuid',
						unique: true,
					});
					this.initializeSyncStatus(tableName);

					console.log(`Initialized database for table: ${tableName}`);
				} catch (error) {
					console.error(
						`Error initializing database for table ${tableName}:`,
						error
					);
					throw error;
				}
			});

			this.ensureIndexes();
		} catch (error) {
			console.error('Error initializing databases:', error);
			throw error;
		}
	}

	private initializeSyncStatus(tableName: string) {
		this.syncStatusDB.findOne({ tableName }, (err: Error | null, doc: any) => {
			if (err) {
				console.error(`Error checking sync status for ${tableName}:`, err);
				return;
			}

			if (!doc) {
				const syncStatus = {
					tableName,
					lastSync: null,
					syncCount: 0,
					status: 'pending',
					errorMessage: null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				};

				this.syncStatusDB.insert(syncStatus, (insertErr: Error | null) => {
					if (insertErr) {
						console.error(
							`Error initializing sync status for ${tableName}:`,
							insertErr
						);
					} else {
						console.log(`Initialized sync status for table: ${tableName}`);
					}
				});
			}
		});
	}

	public getDB(tableName: string): Datastore {
		if (!this.databases[tableName]) {
			throw new Error(`Database for table ${tableName} not found`);
		}
		return this.databases[tableName];
	}

	public getSyncStatusDB(): Datastore {
		return this.syncStatusDB;
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

	public findById(table: string, id: string): Promise<any | null> {
		return new Promise((resolve, reject) => {
			try {
				const db = this.getDB(table);
				db.findOne({ uuid: id }, (err: Error | null, doc: any) => {
					if (err) reject(err);
					else resolve(doc);
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	public insert(table: string, data: any): Promise<any> {
		return new Promise((resolve, reject) => {
			try {
				const db = this.getDB(table);
				const insertData = {
					...data,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					synced: data.synced || 0,
				};

				db.insert(insertData, (err: Error | null, newDoc: any) => {
					if (err) reject(err);
					else resolve(newDoc);
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	public update(table: string, id: string, data: any): Promise<number> {
		return new Promise((resolve, reject) => {
			try {
				const db = this.getDB(table);
				const updateData = {
					...data,
					updatedAt: new Date().toISOString(),
				};

				db.update(
					{ uuid: id },
					{ $set: updateData },
					{},
					(err: Error | null, numReplaced: number) => {
						if (err) reject(err);
						else resolve(numReplaced);
					}
				);
			} catch (error) {
				reject(error);
			}
		});
	}

	public delete(table: string, id: string): Promise<number> {
		return new Promise((resolve, reject) => {
			try {
				const db = this.getDB(table);
				db.remove({ uuid: id }, {}, (err: Error | null, numRemoved: number) => {
					if (err) reject(err);
					else resolve(numRemoved);
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	public updateSyncStatus(
		tableName: string,
		status: string,
		errorMessage?: string | null
	): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				const updateData: any = {
					status,
					lastSync: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				};

				if (errorMessage !== undefined) {
					updateData.errorMessage = errorMessage;
				}

				this.syncStatusDB.update(
					{ tableName },
					{ $set: updateData },
					{},
					(err: Error | null) => {
						if (err) reject(err);
						else resolve();
					}
				);
			} catch (error) {
				reject(error);
			}
		});
	}

	public getSyncStatus(tableName?: string): Promise<any | any[]> {
		return new Promise((resolve, reject) => {
			try {
				if (tableName) {
					this.syncStatusDB.findOne(
						{ tableName },
						(err: Error | null, doc: any) => {
							if (err) reject(err);
							else resolve(doc);
						}
					);
				} else {
					this.syncStatusDB.find({}, (err: Error | null, docs: any[]) => {
						if (err) reject(err);
						else resolve(docs);
					});
				}
			} catch (error) {
				reject(error);
			}
		});
	}

	public markAsSynced(table: string, id: string): Promise<number> {
		return new Promise((resolve, reject) => {
			try {
				const db = this.getDB(table);
				db.update(
					{ uuid: id },
					{ $set: { synced: 1 } },
					{},
					(err: Error | null, numReplaced: number) => {
						if (err) reject(err);
						else resolve(numReplaced);
					}
				);
			} catch (error) {
				reject(error);
			}
		});
	}

	public getUnsyncedRecords(table: string): Promise<any[]> {
		return new Promise((resolve, reject) => {
			try {
				const db = this.getDB(table);
				db.find({ synced: { $ne: 1 } }, (err: Error | null, docs: any[]) => {
					if (err) reject(err);
					else resolve(docs);
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	public clearTable(table: string): Promise<number> {
		return new Promise((resolve, reject) => {
			try {
				const db = this.getDB(table);
				db.remove(
					{},
					{ multi: true },
					(err: Error | null, numRemoved: number) => {
						if (err) reject(err);
						else resolve(numRemoved);
					}
				);
			} catch (error) {
				reject(error);
			}
		});
	}

	public findAll(table: string): Promise<any[]> {
		return new Promise((resolve, reject) => {
			try {
				const db = this.getDB(table);
				db.find({}, (err: Error | null, docs: any[]) => {
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

	public ensureIndexes() {
		Object.keys(this.databases).forEach((tableName) => {
			try {
				const db = this.databases[tableName];
				db.ensureIndex({ fieldName: 'uuid', unique: true });

				switch (tableName) {
					case USERS_DB:
						db.ensureIndex({ fieldName: 'username', unique: true });
						break;
					case CATEGORY_DB:
						db.ensureIndex({ fieldName: 'name', unique: true });
						break;
					case INVENTORY_DB:
						db.ensureIndex({ fieldName: 'barcode' });
						db.ensureIndex({ fieldName: 'name' });
						break;
					case TRANSACTIONS_DB:
						db.ensureIndex({ fieldName: 'refNumber', unique: true });
						db.ensureIndex({ fieldName: 'userId' });
						break;
					case ORDERS_DB:
						db.ensureIndex({ fieldName: 'refNumber' });
						db.ensureIndex({ fieldName: 'productId' });
						break;
				}
				console.log(`Ensured indexes for table: ${tableName}`);
			} catch (error) {
				console.error(`Error ensuring indexes for table ${tableName}:`, error);
			}
		});
	}

	public getDatabasePaths(): { [key: string]: string } {
		const databaseDir = this.getAppDataPath();
		const paths: { [key: string]: string } = {};

		paths['sync_status'] = path.join(databaseDir, SYNC_STATUS_TABLE);
		Object.keys(this.databases).forEach((tableName) => {
			paths[tableName] = path.join(databaseDir, `${tableName}.db`);
		});

		return paths;
	}
}

export const sealDBModel = new SealDBModel();
