import prisma, { getPrisma } from '../databases/prisma/client';
import { transformValue } from '../utils/data-sync-transfomer';
import { BaseService } from './base.service';
import {
	SyncResult,
	SyncDirection,
	SyncOptions,
	TableConfig,
	RecordData,
	ConflictRecord,
	ConflictResolutionStrategy,
	PullResult,
	PushResult,
	BidirectionalSyncResult,
} from '../types/sync';

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_CONFLICT_STRATEGY: ConflictResolutionStrategy = 'latest_wins';

export class SyncService {
	private syncInterval: NodeJS.Timeout | null = null;
	private tableConfigs: Map<string, TableConfig>;
	private activeSyncs: Map<string, boolean> = new Map();
	private autoSyncIntervalMs = 0;
	private autoSyncStartedAt: Date | null = null;
	private lastAutoSyncAt: Date | null = null;

	constructor() {
		this.tableConfigs = new Map();
		this.initializeTableConfigs();
	}

	private initializeTableConfigs(): void {
		// Default table configurations - extend as needed
		const defaultTables = [
			'product', 'category', 'customer', 'supplier',
			'sale', 'purchaseOrder', 'inventory', 'transaction'
		];

		defaultTables.forEach(tableName => {
			this.tableConfigs.set(tableName, {
				name: tableName,
				modelName: tableName,
				endpoint: `/${tableName}s`,
				syncDirection: 'bidirectional',
				conflictStrategy: DEFAULT_CONFLICT_STRATEGY,
				primaryKey: 'id',
				batchSize: DEFAULT_BATCH_SIZE,
				softDelete: true,
			});
		});
	}

	// ==========================================
	// SYNC STATUS MANAGEMENT
	// ==========================================

	private async updateSyncStatus(
		tableName: string,
		status: 'syncing' | 'synced' | 'error',
		error?: string | null
	): Promise<void> {
		try {
			await prisma.syncStatus.upsert({
				where: { tableName },
				update: {
					status,
					lastSyncAt: new Date(),
					errorMessage: error || null,
					updatedAt: new Date()
				},
				create: {
					tableName,
					status,
					lastSyncAt: new Date(),
					errorMessage: error || null,
					createdAt: new Date(),
					updatedAt: new Date()
				}
			});
		} catch (error) {
			console.error(`Failed to update sync status for ${tableName}:`, error);
		}
	}

	public async getSyncStatus(tableName?: string): Promise<any> {
		try {
			if (tableName) {
				const status = await prisma.syncStatus.findUnique({
					where: { tableName }
				});
				return status ? {
					...status,
					lastSync: status.lastSyncAt,
					syncCount: 0 // Avoid expensive count query
				} : null;
			}
			return await prisma.syncStatus.findMany();
		} catch (error) {
			console.error('Failed to get sync status:', error);
			return tableName ? null : [];
		}
	}

	// ==========================================
	// CORE SYNC OPERATIONS WITH TRANSACTIONS
	// ==========================================

	/**
	 * Pull data from remote API with Prisma transaction
	 */
	async pullData(tableName: string, options: Partial<SyncOptions> = {}): Promise<PullResult> {
		const result: PullResult = {
			success: false,
			recordsReceived: 0,
			recordsInserted: 0,
			recordsUpdated: 0,
			recordsSkipped: 0,
			conflicts: [],
			errors: [],
			timestamp: new Date().toISOString(),
		};

		if (this.activeSyncs.get(tableName)) {
			result.errors.push(`Sync already in progress for table: ${tableName}`);
			return result;
		}

		this.activeSyncs.set(tableName, true);

		try {
			await this.updateSyncStatus(tableName, 'syncing');
			const config = this.getTableConfig(tableName);
			const client = await getPrisma();

			// Fetch data from API
			const remoteRecords = await this.fetchDataFromAPI(tableName, options.since);
			result.recordsReceived = remoteRecords.length;

			if (remoteRecords.length === 0) {
				result.success = true;
				await this.updateSyncStatus(tableName, 'synced');
				return result;
			}

			// Process in batches using transactions
			const batchSize = options.batchSize || config.batchSize;
			const batches = this.createBatches(remoteRecords, batchSize);

			for (const batch of batches) {
				const batchResult = await this.processPullBatch(
					client,
					tableName,
					batch,
					options.conflictStrategy || config.conflictStrategy,
					options.useTransaction !== false
				);

				result.recordsInserted += batchResult.inserted;
				result.recordsUpdated += batchResult.updated;
				result.recordsSkipped += batchResult.skipped;
				result.conflicts.push(...batchResult.conflicts);
				result.errors.push(...batchResult.errors);
			}

			result.success = result.errors.length === 0;
			await this.updateSyncStatus(
				tableName,
				result.success ? 'synced' : 'error',
				result.errors.length > 0 ? result.errors.join('; ') : null
			);

		} catch (error: any) {
			result.errors.push(`Pull error: ${error.message}`);
			await this.updateSyncStatus(tableName, 'error', error.message);
		} finally {
			this.activeSyncs.delete(tableName);
		}

		return result;
	}

	/**
	 * Push local data to remote API with Prisma transaction
	 */
	async pushData(tableName: string, options: Partial<SyncOptions> = {}): Promise<PushResult> {
		const result: PushResult = {
			success: false,
			recordsSent: 0,
			recordsAccepted: 0,
			recordsRejected: 0,
			conflicts: [],
			errors: [],
			timestamp: new Date().toISOString(),
		};

		if (this.activeSyncs.get(tableName)) {
			result.errors.push(`Sync already in progress for table: ${tableName}`);
			return result;
		}

		this.activeSyncs.set(tableName, true);

		try {
			await this.updateSyncStatus(tableName, 'syncing');
			const config = this.getTableConfig(tableName);
			const client = await getPrisma();

			// Get unsynced local records
			const unsyncedRecords = await this.getUnsyncedRecords(client, tableName, options.since);
			result.recordsSent = unsyncedRecords.length;

			if (unsyncedRecords.length === 0) {
				result.success = true;
				await this.updateSyncStatus(tableName, 'synced');
				return result;
			}

			// Process in batches
			const batchSize = options.batchSize || config.batchSize;
			const batches = this.createBatches(unsyncedRecords, batchSize);

			for (const batch of batches) {
				const batchResult = await this.processPushBatch(
					client,
					tableName,
					batch,
					config.endpoint,
					options.useTransaction !== false
				);

				result.recordsAccepted += batchResult.accepted;
				result.recordsRejected += batchResult.rejected;
				result.conflicts.push(...batchResult.conflicts);
				result.errors.push(...batchResult.errors);
			}

			result.success = result.errors.length === 0;
			await this.updateSyncStatus(
				tableName,
				result.success ? 'synced' : 'error',
				result.errors.length > 0 ? result.errors.join('; ') : null
			);

		} catch (error: any) {
			result.errors.push(`Push error: ${error.message}`);
			await this.updateSyncStatus(tableName, 'error', error.message);
		} finally {
			this.activeSyncs.delete(tableName);
		}

		return result;
	}

	/**
	 * Bidirectional sync with conflict resolution
	 */
	async bidirectionalSync(
		tableName: string,
		options: Partial<SyncOptions> = {}
	): Promise<BidirectionalSyncResult> {
		const conflictStrategy = options.conflictStrategy || DEFAULT_CONFLICT_STRATEGY;
		const allConflicts: ConflictRecord[] = [];

		// Step 1: Pull remote changes first (to detect conflicts)
		const pullResult = await this.pullData(tableName, {
			...options,
			conflictStrategy,
		});
		allConflicts.push(...pullResult.conflicts);

		// Step 2: Push local changes
		const pushResult = await this.pushData(tableName, {
			...options,
			conflictStrategy,
		});
		allConflicts.push(...pushResult.conflicts);

		// Step 3: Resolve conflicts based on strategy
		const resolvedCount = await this.resolveConflicts(tableName, allConflicts, conflictStrategy);

		return {
			success: pullResult.success && pushResult.success,
			pull: pullResult,
			push: pushResult,
			conflicts: allConflicts,
			resolvedConflicts: resolvedCount,
			unresolvedConflicts: allConflicts.filter(c => !c.resolvedAt).length,
			timestamp: new Date().toISOString(),
		};
	}

	// ==========================================
	// BATCH PROCESSING WITH TRANSACTIONS
	// ==========================================

	private async processPullBatch(
		client: any,
		tableName: string,
		records: any[],
		conflictStrategy: ConflictResolutionStrategy,
		useTransaction: boolean
	): Promise<{ inserted: number; updated: number; skipped: number; conflicts: ConflictRecord[]; errors: string[] }> {
		const result = { inserted: 0, updated: 0, skipped: 0, conflicts: [] as ConflictRecord[], errors: [] as string[] };

		if (useTransaction) {
			// Use Prisma interactive transaction for atomicity
			try {
				await client.$transaction(async (tx: any) => {
					for (const record of records) {
						try {
							const transformed = this.transformApiToLocal(record);
							const primaryKey = transformed.id || transformed.uuid;

							// Check for existing record
							const existing = await tx[tableName]?.findFirst({
								where: { OR: [{ id: primaryKey }, { uuid: primaryKey }] }
							});

							if (existing) {
								// Check for conflicts
								const conflict = this.detectConflict(tableName, existing, transformed);
								if (conflict) {
									const resolved = this.applyConflictResolution(conflict, conflictStrategy);
									if (resolved) {
										await tx[tableName].update({
											where: { id: existing.id },
											data: { ...resolved, synced: true, syncedAt: new Date(), updatedAt: new Date() }
										});
										result.updated++;
									} else {
										result.conflicts.push(conflict);
										result.skipped++;
									}
								} else {
									await tx[tableName].update({
										where: { id: existing.id },
										data: { ...transformed, synced: true, syncedAt: new Date(), updatedAt: new Date() }
									});
									result.updated++;
								}
							} else {
								await tx[tableName].create({
									data: { ...transformed, synced: true, syncedAt: new Date(), createdAt: new Date(), updatedAt: new Date() }
								});
								result.inserted++;
							}
						} catch (error: any) {
							result.errors.push(`Record ${record.id || record.uuid}: ${error.message}`);
						}
					}
				}, {
					maxWait: 10000,
					timeout: 30000,
				});
			} catch (error: any) {
				result.errors.push(`Transaction failed: ${error.message}`);
			}
		} else {
			// Non-transactional batch processing
			for (const record of records) {
				try {
					const transformed = this.transformApiToLocal(record);
					await client[tableName].upsert({
						where: { id: transformed.id || transformed.uuid },
						update: { ...transformed, synced: true, syncedAt: new Date(), updatedAt: new Date() },
						create: { ...transformed, synced: true, syncedAt: new Date(), createdAt: new Date(), updatedAt: new Date() }
					});
					result.inserted++;
				} catch (error: any) {
					result.errors.push(`Record ${record.id}: ${error.message}`);
				}
			}
		}

		return result;
	}

	private async processPushBatch(
		client: any,
		tableName: string,
		records: any[],
		endpoint: string,
		useTransaction: boolean
	): Promise<{ accepted: number; rejected: number; conflicts: ConflictRecord[]; errors: string[] }> {
		const result = { accepted: 0, rejected: 0, conflicts: [] as ConflictRecord[], errors: [] as string[] };

		// Prepare batch payload for API
		const payload = records.map(record => this.transformLocalToApi(record));

		try {
			// Try bulk push first
			const response = await BaseService.post<{ accepted: string[]; rejected: { id: string; reason: string }[] }>(
				`${endpoint}/batch`,
				{ records: payload }
			);

			if (response.success && response.data) {
				result.accepted = response.data.accepted?.length || payload.length;
				result.rejected = response.data.rejected?.length || 0;

				// Mark accepted records as synced
				const acceptedIds = response.data.accepted || payload.map(r => r.id || r.uuid);

				if (useTransaction && acceptedIds.length > 0) {
					await client.$transaction(async (tx: any) => {
						await tx[tableName].updateMany({
							where: { id: { in: acceptedIds } },
							data: { synced: true, syncedAt: new Date() }
						});
					});
				} else if (acceptedIds.length > 0) {
					await client[tableName].updateMany({
						where: { id: { in: acceptedIds } },
						data: { synced: true, syncedAt: new Date() }
					});
				}

				// Handle rejected records
				if (response.data.rejected) {
					response.data.rejected.forEach(r => {
						result.errors.push(`Record ${r.id}: ${r.reason}`);
					});
				}
			} else {
				// Fallback to individual push
				for (const record of records) {
					try {
						const apiRecord = this.transformLocalToApi(record);
						const pushResponse = await BaseService.post(endpoint, apiRecord);

						if (pushResponse.success) {
							await this.markAsSynced(client, tableName, record.id || record.uuid);
							result.accepted++;
						} else {
							result.rejected++;
							result.errors.push(`Record ${record.id}: ${pushResponse.message}`);
						}
					} catch (error: any) {
						result.rejected++;
						result.errors.push(`Record ${record.id}: ${error.message}`);
					}
				}
			}
		} catch (error: any) {
			// API batch endpoint not available, fall back to individual pushes
			for (const record of records) {
				try {
					const apiRecord = this.transformLocalToApi(record);
					const recordId = record.id || record.uuid;

					// Try update first, then create
					let pushResponse = await BaseService.put(`${endpoint}/${recordId}`, apiRecord);
					if (!pushResponse.success) {
						pushResponse = await BaseService.post(endpoint, apiRecord);
					}

					if (pushResponse.success) {
						await this.markAsSynced(client, tableName, recordId);
						result.accepted++;
					} else {
						result.rejected++;
						result.errors.push(`Record ${recordId}: ${pushResponse.message}`);
					}
				} catch (error: any) {
					result.rejected++;
					result.errors.push(`Record ${record.id}: ${error.message}`);
				}
			}
		}

		return result;
	}

	// ==========================================
	// CONFLICT DETECTION & RESOLUTION
	// ==========================================

	private detectConflict(tableName: string, local: RecordData, remote: RecordData): ConflictRecord | null {
		// Skip if local hasn't been modified since last sync
		if (local.synced && local.syncedAt && remote.updatedAt) {
			const localUpdate = new Date(local.updatedAt || 0);
			const syncTime = new Date(local.syncedAt);

			// No local changes since last sync
			if (localUpdate <= syncTime) {
				return null;
			}
		}

		// Both have been modified - conflict!
		if (local.updatedAt && remote.updatedAt) {
			const localUpdate = new Date(local.updatedAt);
			const remoteUpdate = new Date(remote.updatedAt);

			// Check if updates are close enough to be a conflict
			const timeDiff = Math.abs(localUpdate.getTime() - remoteUpdate.getTime());
			if (timeDiff < 1000) return null; // Within 1 second, likely same update

			return {
				tableName,
				recordId: String(local.id || local.uuid),
				localData: local,
				serverData: remote,
				conflictType: 'update_conflict',
			};
		}

		return null;
	}

	private applyConflictResolution(
		conflict: ConflictRecord,
		strategy: ConflictResolutionStrategy
	): RecordData | null {
		switch (strategy) {
			case 'server_wins':
				conflict.resolvedBy = 'server_wins';
				conflict.resolvedAt = new Date();
				return conflict.serverData;

			case 'client_wins':
				conflict.resolvedBy = 'client_wins';
				conflict.resolvedAt = new Date();
				return conflict.localData;

			case 'latest_wins': {
				const localTime = new Date(conflict.localData.updatedAt || 0).getTime();
				const serverTime = new Date(conflict.serverData.updatedAt || 0).getTime();
				conflict.resolvedBy = 'latest_wins';
				conflict.resolvedAt = new Date();
				return localTime > serverTime ? conflict.localData : conflict.serverData;
			}

			case 'manual':
				// Don't auto-resolve, return null to skip
				return null;

			default:
				return conflict.serverData;
		}
	}

	private async resolveConflicts(
		tableName: string,
		conflicts: ConflictRecord[],
		strategy: ConflictResolutionStrategy
	): Promise<number> {
		if (strategy === 'manual') return 0;

		let resolved = 0;
		const client = await getPrisma();

		for (const conflict of conflicts) {
			if (conflict.resolvedAt) {
				resolved++;
				continue;
			}

			const resolvedData = this.applyConflictResolution(conflict, strategy);
			if (resolvedData) {
				try {
					await (client as any)[tableName]?.update?.({
						where: { id: conflict.recordId },
						data: { ...resolvedData, synced: true, syncedAt: new Date() }
					});
					resolved++;
				} catch {
					// Conflict resolution failed, keep it unresolved
				}
			}
		}

		return resolved;
	}

	// ==========================================
	// LEGACY API COMPATIBILITY
	// ==========================================

	async pullDataFromAPI(tableName: string): Promise<SyncResult> {
		const pullResult = await this.pullData(tableName);
		return {
			success: pullResult.success,
			recordCount: pullResult.recordsInserted + pullResult.recordsUpdated,
			recordsInserted: pullResult.recordsInserted,
			recordsUpdated: pullResult.recordsUpdated,
			errors: pullResult.errors,
			timestamp: pullResult.timestamp,
			conflicts: pullResult.conflicts,
		};
	}

	async syncTable(
		tableName: string,
		direction: SyncDirection
	): Promise<SyncResult> {
		const options: Partial<SyncOptions> = { direction };

		if (direction === 'pull') {
			const result = await this.pullData(tableName, options);
			return {
				success: result.success,
				recordCount: result.recordsInserted + result.recordsUpdated,
				errors: result.errors,
				timestamp: result.timestamp,
			};
		} else if (direction === 'push') {
			const result = await this.pushData(tableName, options);
			return {
				success: result.success,
				recordCount: result.recordsAccepted,
				errors: result.errors,
				timestamp: result.timestamp,
			};
		} else {
			const result = await this.bidirectionalSync(tableName, options);
			return {
				success: result.success,
				recordCount: result.pull.recordsInserted + result.pull.recordsUpdated + result.push.recordsAccepted,
				errors: [...result.pull.errors, ...result.push.errors],
				timestamp: result.timestamp,
				conflicts: result.conflicts,
			};
		}
	}

	async bulkSync(
		tableNames: string[],
		direction: SyncDirection
	): Promise<{ [key: string]: SyncResult }> {
		const results: { [key: string]: SyncResult } = {};

		// Process tables sequentially to avoid overwhelming the database
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

	private getTableConfig(tableName: string): TableConfig {
		const config = this.tableConfigs.get(tableName);
		if (!config) {
			// Return default config if not explicitly configured
			return {
				name: tableName,
				modelName: tableName,
				endpoint: `/${tableName}s`,
				syncDirection: 'bidirectional',
				conflictStrategy: DEFAULT_CONFLICT_STRATEGY,
				primaryKey: 'id',
				batchSize: DEFAULT_BATCH_SIZE,
			};
		}
		return config;
	}

	private createBatches<T>(records: T[], batchSize: number): T[][] {
		const batches: T[][] = [];
		for (let i = 0; i < records.length; i += batchSize) {
			batches.push(records.slice(i, i + batchSize));
		}
		return batches;
	}

	private async fetchDataFromAPI(tableName: string, since?: Date): Promise<any[]> {
		const config = this.getTableConfig(tableName);
		const params: Record<string, any> = {};

		if (since) {
			params.updatedSince = since.toISOString();
		}

		const response = await BaseService.get<any[]>(config.endpoint, params);

		if (!response.success) {
			throw new Error(`Failed to fetch data: ${response.error || response.message}`);
		}

		return response.data || [];
	}

	private async getUnsyncedRecords(client: any, tableName: string, since?: Date): Promise<any[]> {
		const where: Record<string, any> = {
			OR: [
				{ synced: false },
				{ synced: null },
			]
		};

		if (since) {
			where.updatedAt = { gte: since };
		}

		try {
			return await client[tableName].findMany({ where });
		} catch {
			// Table might not have synced field, get all recent records
			return await client[tableName].findMany({
				where: since ? { updatedAt: { gte: since } } : undefined,
				take: 1000,
				orderBy: { updatedAt: 'desc' }
			});
		}
	}

	private async markAsSynced(client: any, tableName: string, id: string): Promise<void> {
		try {
			await client[tableName].update({
				where: { id },
				data: { synced: true, syncedAt: new Date(), updatedAt: new Date() }
			});
		} catch {
			// Ignore if record doesn't exist or doesn't have synced field
		}
	}

	private async getRecordCount(tableName: string): Promise<number> {
		try {
			const client = await getPrisma();
			return await (client as any)[tableName]?.count() || 0;
		} catch {
			return 0;
		}
	}

	private transformApiToLocal(record: any): RecordData {
		const transformed: RecordData = {};

		Object.entries(record).forEach(([key, value]) => {
			const camelCaseKey = key.replace(/_([a-z])/g, (_, letter) =>
				letter.toUpperCase()
			);
			transformed[camelCaseKey] = transformValue(camelCaseKey, value);
		});

		return transformed;
	}

	private transformLocalToApi(record: any): Record<string, any> {
		const transformed: Record<string, any> = {};
		const excludeFields = ['synced', 'syncedAt', 'localVersion'];

		Object.entries(record).forEach(([key, value]) => {
			if (excludeFields.includes(key)) return;

			// Convert camelCase to snake_case
			const snakeCaseKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
			transformed[snakeCaseKey] = value;
		});

		return transformed;
	}

	// ==========================================
	// TABLE STATS & RECORDS
	// ==========================================

	async getTableStats(tableName: string): Promise<{
		total: number;
		synced: number;
		unsynced: number;
		lastSync: Date | null;
	}> {
		try {
			const client = await getPrisma();
			const total = await (client as any)[tableName]?.count() || 0;
			const synced = await (client as any)[tableName]?.count({
				where: { synced: true }
			}) || 0;

			const syncStatus = await prisma.syncStatus.findUnique({
				where: { tableName }
			});

			return {
				total,
				synced,
				unsynced: total - synced,
				lastSync: syncStatus?.lastSyncAt || null
			};
		} catch {
			return { total: 0, synced: 0, unsynced: 0, lastSync: null };
		}
	}

	async getAllRecords(tableName: string): Promise<any[]> {
		try {
			const client = await getPrisma();
			return await (client as any)[tableName]?.findMany() || [];
		} catch {
			return [];
		}
	}

	async findRecords(tableName: string, conditions: any = {}): Promise<any[]> {
		try {
			const client = await getPrisma();
			return await (client as any)[tableName]?.findMany({
				where: conditions
			}) || [];
		} catch {
			return [];
		}
	}

	async findRecordById(tableName: string, id: string): Promise<any | null> {
		try {
			const client = await getPrisma();
			return await (client as any)[tableName]?.findUnique({
				where: { id }
			}) || null;
		} catch {
			return null;
		}
	}

	async insertRecord(tableName: string, data: any): Promise<any> {
		const client = await getPrisma();
		return (client as any)[tableName].create({
			data: { ...data, synced: false, createdAt: new Date(), updatedAt: new Date() }
		});
	}

	async updateRecord(tableName: string, id: string, data: any): Promise<any> {
		const client = await getPrisma();
		return (client as any)[tableName].update({
			where: { id },
			data: { ...data, synced: false, updatedAt: new Date() }
		});
	}

	async deleteRecord(tableName: string, id: string): Promise<any> {
		const client = await getPrisma();
		return (client as any)[tableName].delete({
			where: { id }
		});
	}

	startAutoSync(intervalMs = 300000): void {
		if (this.syncInterval) {
			clearInterval(this.syncInterval);
		}

		this.autoSyncIntervalMs = intervalMs;
		this.autoSyncStartedAt = new Date();

		this.syncInterval = setInterval(async () => {
			console.log('[SyncService] Starting auto-sync...');
			this.lastAutoSyncAt = new Date();

			for (const [tableName, config] of this.tableConfigs) {
				try {
					if (config.syncDirection === 'bidirectional') {
						await this.bidirectionalSync(tableName);
					} else if (config.syncDirection === 'pull') {
						await this.pullData(tableName);
					} else if (config.syncDirection === 'push') {
						await this.pushData(tableName);
					}
				} catch (error) {
					console.error(`[SyncService] Auto-sync failed for ${tableName}:`, error);
				}
			}

			console.log('[SyncService] Auto-sync completed');
		}, intervalMs);

		console.log(`[SyncService] Auto-sync started with interval: ${intervalMs}ms`);
	}

	stopAutoSync(): void {
		if (this.syncInterval) {
			clearInterval(this.syncInterval);
			this.syncInterval = null;
			this.autoSyncIntervalMs = 0;
			this.autoSyncStartedAt = null;
			console.log('[SyncService] Auto-sync stopped');
		}
	}

	getAutoSyncStatus(): {
		isRunning: boolean;
		intervalMs: number;
		startedAt: Date | null;
		lastSyncAt: Date | null;
		nextSyncAt: Date | null;
		configuredTables: string[];
	} {
		const isRunning = this.syncInterval !== null;
		let nextSyncAt: Date | null = null;

		if (isRunning && this.lastAutoSyncAt && this.autoSyncIntervalMs > 0) {
			nextSyncAt = new Date(this.lastAutoSyncAt.getTime() + this.autoSyncIntervalMs);
		} else if (isRunning && this.autoSyncStartedAt && this.autoSyncIntervalMs > 0) {
			nextSyncAt = new Date(this.autoSyncStartedAt.getTime() + this.autoSyncIntervalMs);
		}

		return {
			isRunning,
			intervalMs: this.autoSyncIntervalMs,
			startedAt: this.autoSyncStartedAt,
			lastSyncAt: this.lastAutoSyncAt,
			nextSyncAt,
			configuredTables: Array.from(this.tableConfigs.keys()),
		};
	}

	configureTable(tableName: string, config: Partial<TableConfig>): void {
		const existing = this.tableConfigs.get(tableName) || {
			name: tableName,
			modelName: tableName,
			endpoint: `/${tableName}s`,
			syncDirection: 'bidirectional' as SyncDirection,
			conflictStrategy: DEFAULT_CONFLICT_STRATEGY,
			primaryKey: 'id',
			batchSize: DEFAULT_BATCH_SIZE,
		};
		this.tableConfigs.set(tableName, { ...existing, ...config });
	}

	getConfiguredTables(): string[] {
		return Array.from(this.tableConfigs.keys());
	}
}

const syncService = new SyncService();
export default syncService;