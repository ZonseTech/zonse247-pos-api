import { Request, Response } from 'express';
import syncService from '../services/sync.service';
import { AuthRequest } from '../lib/express.type';
import { SyncDirection, SyncOptions } from '../types/sync';

export class SyncController {
	/**
	 * Get available tables with their sync status
	 */
	getTables = async (req: Request & AuthRequest, res: Response) => {
		try {
			const syncStatuses = await syncService.getSyncStatus();
			const configuredTables = syncService.getConfiguredTables();

			const tablesWithStatus = configuredTables.map((tableName) => {
				const syncStatus = Array.isArray(syncStatuses)
					? syncStatuses.find((s: any) => s.tableName === tableName)
					: syncStatuses;

				return {
					id: tableName,
					name: tableName,
					status: syncStatus?.status || 'pending',
					lastSync: syncStatus?.lastSyncAt || null,
					syncedDocs: syncStatus?.syncCount || 0,
					errorMessage: syncStatus?.errorMessage || null,
				};
			});

			res.json({
				success: true,
				tables: tablesWithStatus,
			});
		} catch (error: any) {
			console.error('Error fetching tables:', error);
			res.status(500).json({
				success: false,
				message: 'Failed to fetch tables',
				error: error.message,
			});
		}
	};

	/**
	 * Pull data from remote API to local database
	 */
	pullData = async (req: Request, res: Response): Promise<void> => {
		try {
			const { tableName, options } = req.body;

			if (!tableName) {
				res.status(400).json({
					success: false,
					message: 'Table name is required',
				});
				return;
			}

			const syncOptions: Partial<SyncOptions> = {
				direction: 'pull',
				batchSize: options?.batchSize,
				conflictStrategy: options?.conflictStrategy,
				since: options?.since ? new Date(options.since) : undefined,
				useTransaction: options?.useTransaction !== false,
			};

			const result = await syncService.pullData(tableName, syncOptions);

			res.json({
				success: result.success,
				message: result.success
					? 'Data pulled successfully'
					: 'Pull completed with errors',
				recordsReceived: result.recordsReceived,
				recordsInserted: result.recordsInserted,
				recordsUpdated: result.recordsUpdated,
				recordsSkipped: result.recordsSkipped,
				conflicts: result.conflicts.length,
				lastSync: result.timestamp,
				errors: result.errors,
			});
		} catch (error: any) {
			console.error('Error pulling data:', error);
			res.status(500).json({
				success: false,
				message: error.message || 'Failed to pull data',
				error: error.message,
			});
		}
	};

	/**
	 * Push local data to remote API
	 */
	pushData = async (req: Request, res: Response): Promise<any> => {
		try {
			const { tableName, options } = req.body;

			if (!tableName) {
				return res.status(400).json({
					success: false,
					message: 'Table name is required',
				});
			}

			const syncOptions: Partial<SyncOptions> = {
				direction: 'push',
				batchSize: options?.batchSize,
				since: options?.since ? new Date(options.since) : undefined,
				useTransaction: options?.useTransaction !== false,
			};

			const result = await syncService.pushData(tableName, syncOptions);

			res.json({
				success: result.success,
				message: result.success
					? 'Data pushed successfully'
					: 'Push completed with errors',
				recordsSent: result.recordsSent,
				recordsAccepted: result.recordsAccepted,
				recordsRejected: result.recordsRejected,
				conflicts: result.conflicts.length,
				lastSync: result.timestamp,
				errors: result.errors,
			});
		} catch (error: any) {
			console.error('Error pushing data:', error);
			res.status(500).json({
				success: false,
				message: error.message || 'Failed to push data',
				error: error.message,
			});
		}
	};

	/**
	 * Perform bidirectional sync with conflict resolution
	 */
	bidirectionalSync = async (req: Request, res: Response): Promise<any> => {
		try {
			const { tableName, options } = req.body;

			if (!tableName) {
				return res.status(400).json({
					success: false,
					message: 'Table name is required',
				});
			}

			const syncOptions: Partial<SyncOptions> = {
				direction: 'bidirectional',
				conflictStrategy: options?.conflictStrategy || 'latest_wins',
				batchSize: options?.batchSize,
				since: options?.since ? new Date(options.since) : undefined,
				useTransaction: options?.useTransaction !== false,
			};

			const result = await syncService.bidirectionalSync(tableName, syncOptions);

			res.json({
				success: result.success,
				message: result.success
					? 'Bidirectional sync completed successfully'
					: 'Sync completed with errors',
				pull: {
					recordsReceived: result.pull.recordsReceived,
					recordsInserted: result.pull.recordsInserted,
					recordsUpdated: result.pull.recordsUpdated,
					errors: result.pull.errors,
				},
				push: {
					recordsSent: result.push.recordsSent,
					recordsAccepted: result.push.recordsAccepted,
					recordsRejected: result.push.recordsRejected,
					errors: result.push.errors,
				},
				conflicts: {
					total: result.conflicts.length,
					resolved: result.resolvedConflicts,
					unresolved: result.unresolvedConflicts,
				},
				lastSync: result.timestamp,
			});
		} catch (error: any) {
			console.error('Error in bidirectional sync:', error);
			res.status(500).json({
				success: false,
				message: error.message || 'Failed to perform bidirectional sync',
				error: error.message,
			});
		}
	};

	/**
	 * Get sync status for a specific table
	 */
	getSyncStatus = async (req: Request, res: Response): Promise<any> => {
		try {
			const { tableName } = req.params;
			const status = await syncService.getSyncStatus(tableName as string);

			if (!status) {
				return res.status(404).json({
					success: false,
					message: 'Table not found or not synced yet',
				});
			}

			res.json({
				success: true,
				tableName,
				status: status.status,
				lastSync: status.lastSync || status.lastSyncAt,
				syncedDocs: status.syncCount,
				errorMessage: status.errorMessage,
			});
		} catch (error: any) {
			console.error('Error fetching sync status:', error);
			res.status(500).json({
				success: false,
				message: 'Failed to fetch sync status',
				error: error.message,
			});
		}
	};

	/**
	 * Bulk sync multiple tables
	 */
	bulkSync = async (req: Request, res: Response): Promise<any> => {
		try {
			const {
				tableNames,
				direction = 'bidirectional'
			} = req.body;

			if (!tableNames || !Array.isArray(tableNames)) {
				return res.status(400).json({
					success: false,
					message: 'Table names array is required',
				});
			}

			const validDirections: SyncDirection[] = ['pull', 'push', 'bidirectional'];
			if (!validDirections.includes(direction)) {
				return res.status(400).json({
					success: false,
					message: 'Direction must be pull, push, or bidirectional',
				});
			}

			const results = await syncService.bulkSync(tableNames, direction);

			const overallSuccess = Object.values(results).every(
				(result) => result.success
			);
			const totalRecords = Object.values(results).reduce(
				(sum, result) => sum + result.recordCount,
				0
			);
			const allErrors = Object.entries(results).reduce(
				(errors, [table, result]) => {
					if (result.errors.length > 0) {
						errors.push(`${table}: ${result.errors.join(', ')}`);
					}
					return errors;
				},
				[] as string[]
			);
			const totalConflicts = Object.values(results).reduce(
				(sum, result) => sum + (result.conflicts?.length || 0),
				0
			);

			res.json({
				success: overallSuccess,
				message: overallSuccess
					? 'Bulk sync completed successfully'
					: 'Bulk sync completed with errors',
				direction,
				totalRecords,
				totalConflicts,
				results,
				errors: allErrors,
			});
		} catch (error: any) {
			console.error('Error in bulk sync:', error);
			res.status(500).json({
				success: false,
				message: 'Failed to perform bulk sync',
				error: error.message,
			});
		}
	};

	/**
	 * Get statistics for a specific table
	 */
	getTableStats = async (req: Request, res: Response): Promise<any> => {
		try {
			const { tableName } = req.params;

			if (!tableName) {
				return res.status(400).json({
					success: false,
					message: 'Table name is required',
				});
			}

			const stats = await syncService.getTableStats(tableName as string);

			res.json({
				success: true,
				tableName,
				stats,
			});
		} catch (error: any) {
			console.error('Error fetching table stats:', error);
			res.status(500).json({
				success: false,
				message: 'Failed to fetch table statistics',
				error: error.message,
			});
		}
	};

	/**
	 * Get all records from a table with pagination
	 */
	getAllRecords = async (req: Request, res: Response): Promise<any> => {
		try {
			const { tableName } = req.params;
			const { limit = 100, offset = 0 } = req.query;

			if (!tableName) {
				return res.status(400).json({
					success: false,
					message: 'Table name is required',
				});
			}

			const allRecords = await syncService.getAllRecords(tableName as string);
			const startIndex = parseInt(offset as string) || 0;
			const endIndex = startIndex + (parseInt(limit as string) || 100);
			const paginatedRecords = allRecords.slice(startIndex, endIndex);

			res.json({
				success: true,
				tableName,
				total: allRecords.length,
				count: paginatedRecords.length,
				offset: startIndex,
				limit: parseInt(limit as string) || 100,
				records: paginatedRecords,
			});
		} catch (error: any) {
			console.error('Error fetching records:', error);
			res.status(500).json({
				success: false,
				message: 'Failed to fetch records',
				error: error.message,
			});
		}
	};

	/**
	 * Configure a table for sync
	 */
	configureTable = async (req: Request, res: Response): Promise<any> => {
		try {
			const { tableName } = req.params;
			const {
				endpoint,
				syncDirection,
				conflictStrategy,
				batchSize,
				softDelete
			} = req.body;

			if (!tableName) {
				return res.status(400).json({
					success: false,
					message: 'Table name is required',
				});
			}

			syncService.configureTable(tableName as string, {
				endpoint,
				syncDirection,
				conflictStrategy,
				batchSize,
				softDelete,
			});

			res.json({
				success: true,
				message: `Table ${tableName} configured successfully`,
				tableName,
			});
		} catch (error: any) {
			console.error('Error configuring table:', error);
			res.status(500).json({
				success: false,
				message: 'Failed to configure table',
				error: error.message,
			});
		}
	};

	/**
	 * Start auto-sync with configurable interval
	 */
	startAutoSync = async (req: Request, res: Response): Promise<any> => {
		try {
			const { intervalMs = 300000 } = req.body;

			syncService.startAutoSync(intervalMs);

			res.json({
				success: true,
				message: 'Auto-sync started',
				intervalMs,
			});
		} catch (error: any) {
			console.error('Error starting auto-sync:', error);
			res.status(500).json({
				success: false,
				message: 'Failed to start auto-sync',
				error: error.message,
			});
		}
	};

	/**
	 * Stop auto-sync
	 */
	stopAutoSync = async (req: Request, res: Response): Promise<any> => {
		try {
			syncService.stopAutoSync();

			res.json({
				success: true,
				message: 'Auto-sync stopped',
			});
		} catch (error: any) {
			console.error('Error stopping auto-sync:', error);
			res.status(500).json({
				success: false,
				message: 'Failed to stop auto-sync',
				error: error.message,
			});
		}
	};

	/**
	 * Get auto-sync status
	 */
	getAutoSyncStatus = async (req: Request, res: Response): Promise<any> => {
		try {
			const status = syncService.getAutoSyncStatus();

			res.json({
				success: true,
				...status,
			});
		} catch (error: any) {
			console.error('Error getting auto-sync status:', error);
			res.status(500).json({
				success: false,
				message: 'Failed to get auto-sync status',
				error: error.message,
			});
		}
	};
}
