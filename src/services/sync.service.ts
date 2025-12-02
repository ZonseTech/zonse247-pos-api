import { SyncResult } from 'sync';
import tables from '../databases/local/tables';
import prisma from '../databases/prisma/client';
import { transformValue } from '../utils/data-sync-transfomer';
import { BaseService } from './base.service';

interface TableConfig {
	name: string;
	endpoint: string;
	syncDirection: 'pull' | 'push' | 'bidirectional';
}

interface RecordData {
	id?: string | number;
	uuid: string;
	synced?: boolean;
	[key: string]: any;
}

export class SyncService {
	private syncInterval: NodeJS.Timeout | null = null;
	private tableConfigs: Map<string, TableConfig>;

	constructor() {
		// Initialize table configurations
		this.tableConfigs = new Map();
		this.initializeTableConfigs();
	}

	private initializeTableConfigs(): void {
		// Map table names to their API endpoints
		tables.forEach(tableName => {
			this.tableConfigs.set(tableName, {
				name: tableName,
				endpoint: `/${tableName}`, // Adjust endpoint pattern as needed
				syncDirection: 'pull' // Default sync direction
			});
		});
	}

	private async updateSyncStatus(tableName: string, status: 'syncing' | 'synced' | 'error', error?: string | null): Promise<void> {
		await prisma.syncStatus.upsert({
			where: { tableName },
			update: {
				status,
				lastSyncAt: new Date(),
				errorMessage: error,
				updatedAt: new Date()
			},
			create: {
				tableName,
				status,
				lastSyncAt: new Date(),
				errorMessage: error,
				createdAt: new Date(),
				updatedAt: new Date()
			}
		});
	}

	public async getSyncStatus(tableName?: string): Promise<any> {
		if (tableName) {
			return prisma.syncStatus.findUnique({
				where: { tableName }
			});
		}
		return prisma.syncStatus.findMany();
	}

	private async fetchDataFromAPI(tableName: string): Promise<any[]> {
		const config = this.tableConfigs.get(tableName);
		if (!config) {
			throw new Error(`No configuration found for table: ${tableName}`);
		}

		const response = await BaseService.get<any[]>(config.endpoint);

		if (!response.success) {
			throw new Error(`Failed to fetch data from API: ${response.error || response.message}`);
		}

		return response.data || [];
	}

	private async pushDataToAPI(tableName: string, records: any[]): Promise<{ successCount: number; errors: string[] }> {
		const config = this.tableConfigs.get(tableName);
		if (!config) {
			throw new Error(`No configuration found for table: ${tableName}`);
		}

		let successCount = 0;
		const errors: string[] = [];

		for (const record of records) {
			try {
				// Remove internal fields before sending to API
				const { ...recordData } = record;

				if (record.uuid) {
					// Try update first
					const updateResponse = await BaseService.put(
						`${config.endpoint}/${record.uuid}`,
						recordData
					);

					if (!updateResponse.success) {
						// If update fails, try create
						const createResponse = await BaseService.post(
							config.endpoint,
							{ ...recordData, uuid: record.uuid }
						);

						if (!createResponse.success) {
							throw new Error(createResponse.error || createResponse.message);
						}
					}
				} else {
					// Create new record
					const createResponse = await BaseService.post(config.endpoint, recordData);
					if (!createResponse.success) {
						throw new Error(createResponse.error || createResponse.message);
					}
				}

				await this.markAsSynced(tableName, record.uuid || record.id);
				successCount++;
			} catch (error: any) {
				errors.push(`Error syncing record ${record.uuid || record.id}: ${error.message}`);
			}
		}

		return { successCount, errors };
	}

	async pullDataFromAPI(tableName: string): Promise<SyncResult> {
		const result: SyncResult = {
			success: false,
			recordCount: 0,
			errors: [],
			timestamp: new Date().toISOString(),
		};

		try {
			await this.updateSyncStatus(tableName, 'syncing');

			const records = await this.fetchDataFromAPI(tableName);

			if (records.length === 0) {
				result.success = true;
				await this.updateSyncStatus(tableName, 'synced', null);
				return result;
			}

			// Clear existing records (optional - depends on your use case)
			await prisma.$executeRawUnsafe(`DELETE FROM "${tableName}"`);

			let successCount = 0;
			for (const record of records) {
				try {
					// Transform API data to match your schema
					const transformedRecord = this.transformApiToLocal(record);

					// Insert using Prisma
					await (prisma as any)[tableName].upsert({
						where: { uuid: transformedRecord.uuid },
						update: transformedRecord,
						create: transformedRecord
					});

					successCount++;
				} catch (error: any) {
					result.errors.push(
						`Error inserting record ${record.id || record.uuid}: ${error.message || 'Unknown error'}`
					);
				}
			}

			result.recordCount = successCount;
			result.success = result.errors.length === 0;

			const status = result.success ? 'synced' : 'error';
			const errorMessage = result.errors.length > 0 ? result.errors.join('; ') : null;
			await this.updateSyncStatus(tableName, status, errorMessage);
		} catch (error: any) {
			result.errors.push(`API connection error: ${error.message}`);
			await this.updateSyncStatus(tableName, 'error', error.message);
		}

		return result;
	}

	private transformApiToLocal(record: any): RecordData {
		// Implement your transformation logic here
		// This example converts snake_case to camelCase
		const transformed: RecordData = { uuid: record.uuid || record.id };

		Object.entries(record).forEach(([key, value]) => {
			if (key !== 'id' && key !== 'uuid') {
				const camelCaseKey = key.replace(/_([a-z])/g, (_, letter) =>
					letter.toUpperCase()
				);
				transformed[camelCaseKey] = transformValue(camelCaseKey, value);
			}
		});

		transformed.synced = true;
		return transformed;
	}

	private async markAsSynced(tableName: string, uuid: string): Promise<void> {
		await (prisma as any)[tableName].update({
			where: { uuid },
			data: { synced: true, updatedAt: new Date() }
		});
	}

	async syncTable(
		tableName: string,
		direction: 'pull' | 'push' | 'bidirectional'
	): Promise<SyncResult> {
		const config = this.tableConfigs.get(tableName);
		if (!config) {
			throw new Error(`Table ${tableName} not configured for sync`);
		}

		const effectiveDirection = config.syncDirection === 'bidirectional'
			? direction
			: config.syncDirection;

		if (effectiveDirection === 'pull') {
			return this.pullDataFromAPI(tableName);
		} else if (effectiveDirection === 'push') {
			this.pushDataToAPI(tableName, []);
		} else {
			const pushResult = await this.pushDataToAPI(tableName, []);
			const pullResult = await this.pullDataFromAPI(tableName);

			return {
				success: pushResult.successCount && pullResult.success,
				recordCount: pushResult.successCount + pullResult.recordCount,
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

	async getTableStats(tableName: string): Promise<{
		total: number;
		synced: number;
		unsynced: number;
	}> {
		const total = await (prisma as any)[tableName].count();
		const synced = await (prisma as any)[tableName].count({
			where: { synced: true }
		});
		const unsynced = total - synced;

		return { total, synced, unsynced };
	}

	async getAllRecords(tableName: string): Promise<any[]> {
		return (prisma as any)[tableName].findMany();
	}

	async findRecords(tableName: string, conditions: any = {}): Promise<any[]> {
		return (prisma as any)[tableName].findMany({
			where: conditions
		});
	}

	async findRecordById(tableName: string, id: string): Promise<any | null> {
		return (prisma as any)[tableName].findUnique({
			where: { uuid: id }
		});
	}

	async insertRecord(tableName: string, data: any): Promise<any> {
		return (prisma as any)[tableName].create({
			data: { ...data, synced: false, createdAt: new Date(), updatedAt: new Date() }
		});
	}

	async updateRecord(tableName: string, id: string, data: any): Promise<any> {
		return (prisma as any)[tableName].update({
			where: { uuid: id },
			data: { ...data, synced: false, updatedAt: new Date() }
		});
	}

	async deleteRecord(tableName: string, id: string): Promise<any> {
		return (prisma as any)[tableName].delete({
			where: { uuid: id }
		});
	}

	startAutoSync(intervalMs = 300000): void {
		if (this.syncInterval) {
			clearInterval(this.syncInterval);
		}

		this.syncInterval = setInterval(async () => {
			try {
				console.log('Starting auto-sync...');

				for (const table of tables) {
					try {
						const config = this.tableConfigs.get(table);
						if (config && config.syncDirection === 'pull' || config?.syncDirection === 'bidirectional') {
							await this.pullDataFromAPI(table);
						}
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

	stopAutoSync(): void {
		if (this.syncInterval) {
			clearInterval(this.syncInterval);
			this.syncInterval = null;
			console.log('Auto-sync stopped');
		}
	}

	async testConnections(appType = null): Promise<{ api: boolean; prisma: boolean }> {
		const result = { api: false, prisma: false };

		if (appType) {
			try {
				const response = await BaseService.get('/health');
				result.api = response.success;
			} catch (error) {
				console.error('API connection test failed:', error);
			}
		}

		try {
			await prisma.$queryRaw`SELECT 1`;
			result.prisma = true;
		} catch (error) {
			console.error('Prisma connection test failed:', error);
		}

		return result;
	}

	configureTable(tableName: string, config: Partial<TableConfig>): void {
		const existing = this.tableConfigs.get(tableName) || { name: tableName, endpoint: `/${tableName}`, syncDirection: 'pull' };
		this.tableConfigs.set(tableName, { ...existing, ...config });
	}
}

const syncService = new SyncService();
export default syncService;