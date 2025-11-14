import fs from 'fs';
import path from 'path';
import tables, {
	CATEGORIES_DB,
	INVENTORY_DB,
	ORDERS_DB,
	PERMISSIONS_DB,
	ROLE_PERMISSIONS_DB,
	ROLES_DB,
	SHOP_SETTINGS_DB,
	SYNC_STATUS_TABLE,
	TRANSACTIONS_DB,
	USERS_DB,
	TERMINALS_TABLE,
} from './tables';
import config from '../../config';
import Datastore from '@seald-io/nedb';
import dayjs from 'dayjs';

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
		return path.join(config.database.dataPath);
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

					// this.databases[tableName].ensureIndex({
					// 	fieldName: 'uuid',
					// 	unique: true,
					// });
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
					createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
					updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
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

	public find<T = any>(table: string, conditions: any = {}): Promise<T> {
		return new Promise((resolve, reject) => {
			try {
				const db = this.getDB(table);
				db.find(conditions, (err: Error | null, docs: T) => {
					if (err) reject(err);
					else resolve(docs);
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	public findWithPagination<T = any>(
		table: string,
		conditions: any = {},
		skip: number = 0,
		limit: number = 10
	): Promise<T[]> {
		return new Promise((resolve, reject) => {
			try {
				const db = this.getDB(table);
				db.find(conditions)
					.skip(skip)
					.limit(limit)
					.exec((err: Error | null, docs: T[]) => {
						if (err) reject(err);
						else resolve(docs);
					});
			} catch (error) {
				reject(error);
			}
		});
	}

	public async findById<T = any>(
		table: string,
		conditions: string | Record<string, any>
	): Promise<T | null> {
		return new Promise((resolve, reject) => {
			const db = this.getDB(table);
			const query =
				typeof conditions === 'string' ? { uuid: conditions } : conditions;

			db.findOne(query, (err, doc) => {
				if (err) return reject(err);
				resolve(doc);
			});
		});
	}

	public async findOne<T = any>(
		table: string,
		conditions: string | Record<string, any>
	): Promise<T | null> {
		return new Promise((resolve, reject) => {
			const db = this.getDB(table);
			const query =
				typeof conditions === 'string' ? { uuid: conditions } : conditions;

			db.findOne(query, (err, doc) => {
				if (err) return reject(err);
				resolve(doc);
			});
		});
	}

	public insert(table: string, data: any): Promise<any> {
		return new Promise((resolve, reject) => {
			try {
				const db = this.getDB(table);
				const insertData = {
					...data,
					createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
					updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
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

	public update(table: string, conditions: string | Record<string, any>, data: any): Promise<number> {
		return new Promise((resolve, reject) => {
			try {
				const db = this.getDB(table);
				const updateData = {
					...data,
					updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
				};

				const query =
					typeof conditions === 'string' ? { uuid: conditions } : conditions;

				db.update(
					query,
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

	public delete(table: string, conditions: string | Record<string, any>): Promise<number> {
		return new Promise((resolve, reject) => {
			try {
				const db = this.getDB(table);
				const query =
					typeof conditions === 'string' ? { uuid: conditions } : conditions;

				db.remove(query, {}, (err: Error | null, numRemoved: number) => {
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
					lastSync: dayjs().format('YYYY-MM-DD HH:mm:ss'),
					updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
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
				// db.ensureIndex({ fieldName: 'uuid', unique: true });

				switch (tableName) {
					case USERS_DB:
						db.ensureIndex({ fieldName: 'username', unique: true });
						break;
					case CATEGORIES_DB:
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
					case TERMINALS_TABLE:
						db.ensureIndex({ fieldName: 'tenantId' });
						db.ensureIndex({ fieldName: 'branchId' });
						db.ensureIndex({ fieldName: 'tillNumber' });
						db.ensureIndex({ fieldName: 'deviceId' });
						db.ensureIndex({ fieldName: 'status' });
						db.ensureIndex({ fieldName: 'isPrimary' });
						break;
					case ROLES_DB:
						db.ensureIndex({ fieldName: 'tenantId' });
						db.ensureIndex({ fieldName: 'branchId' });
						db.ensureIndex({ fieldName: 'name' });
						db.ensureIndex({ fieldName: 'isSystemRole' });
						db.ensureIndex({ fieldName: 'isActive' });
						break;
					case PERMISSIONS_DB:
						db.ensureIndex({ fieldName: 'name', unique: true });
						db.ensureIndex({ fieldName: 'category' });
						db.ensureIndex({ fieldName: 'scope' });
						db.ensureIndex({ fieldName: 'isSystemPermission' });
						break;
					case ROLE_PERMISSIONS_DB:
						db.ensureIndex({ fieldName: 'roleId' });
						db.ensureIndex({ fieldName: 'permissionId' });
						break;
					case SHOP_SETTINGS_DB:
						db.ensureIndex({ fieldName: 'tenantId' });
						db.ensureIndex({ fieldName: 'branchId' });
						db.ensureIndex({ fieldName: 'terminalId' });
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

	public async bulkUpdate(
		table: string,
		updates: Array<{
			uuid: string;
			data: any;
		}>
	): Promise<{
		successful: number;
		failed: Array<{ uuid: string; error: Error }>;
	}> {
		const results = await Promise.allSettled(
			updates.map(async (update) => {
				try {
					const numReplaced = await this.update(
						table,
						update.uuid,
						update.data
					);
					return { success: true, uuid: update.uuid, numReplaced };
				} catch (error) {
					return { success: false, uuid: update.uuid, error: error as Error };
				}
			})
		);

		const successful = results.filter(
			(r) => r.status === 'fulfilled' && r.value.success
		).length;

		const failed = results
			.filter((r) => r.status === 'fulfilled' && !r.value.success)
			.map((r) => ({
				uuid: (r as PromiseFulfilledResult<any>).value.uuid,
				error: (r as PromiseFulfilledResult<any>).value.error,
			}));

		results
			.filter((r) => r.status === 'rejected')
			.forEach((r, index) => {
				failed.push({
					uuid: updates[index].uuid,
					error: new Error((r as PromiseRejectedResult).reason),
				});
			});

		return { successful, failed };
	}

	public async bulkFind<T = any>(
		table: string,
		conditions: Array<Record<string, any>>
	): Promise<Array<T | null>> {
		const results = await Promise.allSettled(
			conditions.map((condition) => this.findById<T>(table, condition))
		);

		return results.map((result) =>
			result.status === 'fulfilled' ? result.value : null
		);
	}

	public async findProductsByUuids<T = any>(
		table: string,
		productIds: string[],
		auth: { tenantId: string; branchId: string }
	): Promise<Array<T | null>> {
		return new Promise((resolve, reject) => {
			try {
				const db = this.getDB(table);

				db.find(
					{
						uuid: { $in: productIds },
						tenantId: auth.tenantId,
						branchId: auth.branchId,
					},
					(err: Error | null, docs: any[]) => {
						if (err) {
							reject(err);
							return;
						}

						const productMap = new Map<string, any>();
						docs.forEach((doc) => {
							productMap.set(doc.uuid, doc);
						});

						const results = productIds.map(
							(uuid) => productMap.get(uuid) || null
						);
						resolve(results);
					}
				);
			} catch (error) {
				reject(error);
			}
		});
	}

	public async bulkInventoryUpdate(
		table: string,
		inventoryUpdates: Array<{
			productId: string;
			quantityToDecrement: number;
			userId: string;
		}>,
		auth: { tenantId: string; branchId: string }
	): Promise<{
		successful: number;
		failed: Array<{ productId: string; error: string }>;
		skipped: Array<{ productId: string; reason: string }>;
	}> {
		try {
			const productIds = inventoryUpdates.map((update) => update.productId);
			const products = await this.findProductsByUuids(
				table,
				productIds,
				auth
			);

			const validUpdates: Array<{ uuid: string; data: any }> = [];
			const skipped: Array<{ productId: string; reason: string }> = [];

			for (let i = 0; i < inventoryUpdates.length; i++) {
				const update = inventoryUpdates[i];
				const product = products[i];

				if (!product) {
					skipped.push({
						productId: update.productId,
						reason: 'Product not found',
					});
					continue;
				}

				if (!product.quantity) {
					skipped.push({
						productId: update.productId,
						reason: 'No quantity available',
					});
					continue;
				}

				const currentQuantity = parseInt(product.quantity.toString());
				const newQuantity =
					currentQuantity - parseInt(update.quantityToDecrement.toString());

				validUpdates.push({
					uuid: product.uuid,
					data: {
						quantity: newQuantity,
						userId: update.userId,
					},
				});
			}

			const bulkResult = await this.bulkUpdate(table, validUpdates);

			return {
				successful: bulkResult.successful,
				failed: bulkResult.failed.map((f) => ({
					productId: f.uuid,
					error: f.error.message,
				})),
				skipped,
			};
		} catch (error) {
			throw new Error(`Bulk inventory update failed: ${error}`);
		}
	}
}

export const sealDBModel = new SealDBModel();
