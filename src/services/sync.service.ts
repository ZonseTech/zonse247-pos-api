import { mysqlPool } from '../config/db';
import { sealDBModel } from '../databases/local';
import tables from '../databases/local/tables';
import { transformValue } from '../utils/data-sync-transfomer';

interface SyncResult {
	success: boolean;
	recordCount: number;
	errors: string[];
	timestamp: string;
}
export class SyncService {
	private syncInterval: NodeJS.Timeout | null = null;

	async pullDataFromMySQL(tableName: string): Promise<SyncResult> {
		const result: SyncResult = {
			success: false,
			recordCount: 0,
			errors: [],
			timestamp: new Date().toISOString(),
		};

		try {
			await sealDBModel.updateSyncStatus(tableName, 'syncing');

			const connection = await mysqlPool.getConnection();

			try {
				const [rows] = await connection.execute(`SELECT * FROM ${tableName}`);
				const records = rows as any[];

				if (records.length === 0) {
					result.success = true;
					await sealDBModel.updateSyncStatus(tableName, 'synced', null);
					return result;
				}

				await sealDBModel.clearTable(tableName);

				let successCount = 0;
				for (const record of records) {
					try {
						const camelCaseRecord = Object.entries(record).reduce(
							(acc, [key, value]) => {
								const camelCaseKey = key.replace(/_([a-z])/g, (_, letter) =>
									letter.toUpperCase()
								);
								acc[camelCaseKey] = value;

								delete acc._id;

								return acc;
							},
							{} as Record<string, any>
						);

						await sealDBModel.insert(tableName, {
							...camelCaseRecord,
							synced: 1,
						});
						successCount++;
					} catch (error: any) {
						result.errors.push(
							`Error inserting record ${record.id || record.uuid}: ${error.message || 'Unknown error'
							}`
						);
					}
				}

				result.recordCount = successCount;
				result.success = result.errors.length === 0;

				const status = result.success ? 'synced' : 'error';
				const errorMessage =
					result.errors.length > 0 ? result.errors.join('; ') : null;
				await sealDBModel.updateSyncStatus(tableName, status, errorMessage);
			} finally {
				connection.release();
			}
		} catch (error: any) {
			result.errors.push(`MySQL connection error: ${error.message}`);
			await sealDBModel.updateSyncStatus(tableName, 'error', error.message);
		}

		return result;
	}

	async pushDataToMySQL(tableName: string): Promise<SyncResult> {
		const result: SyncResult = {
			success: false,
			recordCount: 0,
			errors: [],
			timestamp: new Date().toISOString(),
		};

		try {
			await sealDBModel.updateSyncStatus(tableName, 'syncing');

			const unsyncedRecords = await sealDBModel.getUnsyncedRecords(tableName);

			if (unsyncedRecords.length === 0) {
				result.success = true;
				await sealDBModel.updateSyncStatus(tableName, 'synced');
				return result;
			}

			const connection = await mysqlPool.getConnection();

			try {
				await connection.beginTransaction();

				let successCount = 0;
				for (const record of unsyncedRecords) {
					try {
						delete record._id;
						const { ...recordData } = record;

						const [existing] = await connection.execute(
							`SELECT id FROM ${tableName} WHERE uuid = ?`,
							[record.uuid]
						);

						if ((existing as any[]).length > 0) {
							const updateFields = Object.keys(recordData)
								.filter((key) => key !== 'uuid')
								.map(
									(key) => `${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = ?`
								)
								.join(', ');

							const updateValues = Object.keys(recordData)
								.filter((key) => key !== 'uuid')
								.map((key) => transformValue(key, recordData[key]));

							await connection.execute(
								`UPDATE ${tableName} SET ${updateFields} WHERE uuid = ?`,
								[...updateValues, record.uuid]
							);
						} else {
							const insertFields = Object.keys(recordData)
								.map((key) => key.replace(/([A-Z])/g, '_$1').toLowerCase())
								.join(', ');
							const insertPlaceholders = Object.keys(recordData)
								.map(() => '?')
								.join(', ');
							const insertValues = Object.keys(recordData)
								.map((key) => transformValue(key, recordData[key]));

							await connection.execute(
								`INSERT INTO ${tableName} (${insertFields}) VALUES (${insertPlaceholders})`,
								insertValues
							);
						}

						await sealDBModel.markAsSynced(tableName, record.uuid);
						successCount++;
					} catch (error: any) {
						result.errors.push(
							`Error syncing record ${record.uuid}: ${error.message}; SQL Query: ${error.sql};`
						);
					}
				}

				await connection.commit();

				result.recordCount = successCount;
				result.success = result.errors.length === 0;

				const status = result.success ? 'synced' : 'error';
				const errorMessage =
					result.errors.length > 0 ? result.errors.join('; ') : null;
				await sealDBModel.updateSyncStatus(tableName, status, errorMessage);
			} catch (error: any) {
				await connection.rollback();
				throw error;
			} finally {
				connection.release();
			}
		} catch (error: any) {
			result.errors.push(`MySQL connection error: ${error.message}`);
			await sealDBModel.updateSyncStatus(tableName, 'error', error.message);
		}

		return result;
	}

	async syncTable(
		tableName: string,
		direction: 'pull' | 'push' | 'bidirectional'
	): Promise<SyncResult> {
		if (direction === 'pull') {
			return this.pullDataFromMySQL(tableName);
		} else if (direction === 'push') {
			return this.pushDataToMySQL(tableName);
		} else {
			const pushResult = await this.pushDataToMySQL(tableName);
			const pullResult = await this.pullDataFromMySQL(tableName);

			return {
				success: pushResult.success && pullResult.success,
				recordCount: pushResult.recordCount + pullResult.recordCount,
				errors: [...pushResult.errors, ...pullResult.errors],
				timestamp: new Date().toISOString(),
			};
		}
	}

	async bulkSync(
		tableNames: string[],
		direction: 'pull' | 'push' | 'bidirectional'
	): Promise<{ [key: string]: SyncResult }> {
		const results: { [key: string]: SyncResult } = {};

		for (const tableName of tableNames) {
			try {
				results[tableName] = await this.syncTable(tableName, direction);
			} catch (error: any) {
				results[tableName] = {
					success: false,
					recordCount: 0,
					errors: [error.message],
					timestamp: new Date().toISOString(),
				};
			}
		}

		return results;
	}

	async getSyncStatus(tableName?: string) {
		return await sealDBModel.getSyncStatus(tableName);
	}

	async testConnections(appType = null): Promise<{ mysql: boolean; sealdb: boolean }> {
		const result = { mysql: false, sealdb: false };

		if (!appType) {
			try {
				const connection = await mysqlPool.getConnection();
				await connection.ping();
				connection.release();
				result.mysql = true;
			} catch (error) {
				console.error('MySQL connection test failed:', error);
			}
		}

		try {
			await sealDBModel.count('users');
			result.sealdb = true;
		} catch (error) {
			console.error('SealDB connection test failed:', error);
		}

		return result;
	}

	startAutoSync(intervalMs = 300000) {
		if (this.syncInterval) {
			clearInterval(this.syncInterval);
		}

		this.syncInterval = setInterval(async () => {
			try {
				console.log('Starting auto-sync...');

				for (const table of tables) {
					try {
						await this.pullDataFromMySQL(table);
					} catch (error) {
						console.error(`Auto-sync failed for table ${table}:`, error);
					}
				}

				console.log('Auto-sync completed');
			} catch (error) {
				console.error('Auto-sync error:', error);
			}
		}, intervalMs);

		console.log(`Auto-sync started with interval: ${intervalMs}ms`);
	}

	stopAutoSync() {
		if (this.syncInterval) {
			clearInterval(this.syncInterval);
			this.syncInterval = null;
			console.log('Auto-sync stopped');
		}
	}

	async getTableStats(tableName: string): Promise<{
		total: number;
		synced: number;
		unsynced: number;
	}> {
		const total = await sealDBModel.count(tableName);
		const synced = await sealDBModel.count(tableName, { synced: 1 });
		const unsynced = total - synced;

		return { total, synced, unsynced };
	}

	async getAllRecords(tableName: string): Promise<any[]> {
		return await sealDBModel.findAll(tableName);
	}

	async findRecords(tableName: string, conditions: any = {}): Promise<any[]> {
		return await sealDBModel.find(tableName, conditions);
	}

	async findRecordById(tableName: string, id: string): Promise<any | null> {
		return await sealDBModel.findById(tableName, id);
	}

	async insertRecord(tableName: string, data: any): Promise<any> {
		return await sealDBModel.insert(tableName, data);
	}

	async updateRecord(
		tableName: string,
		id: string,
		data: any
	): Promise<number> {
		return await sealDBModel.update(tableName, id, data);
	}

	async deleteRecord(tableName: string, id: string): Promise<number> {
		return await sealDBModel.delete(tableName, id);
	}
}

const syncService = new SyncService();
export default syncService;
