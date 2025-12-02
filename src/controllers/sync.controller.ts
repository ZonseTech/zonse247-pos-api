import { Request, Response } from 'express';
import syncService from '../services/sync.service';
import { hasAnyPermission, hasRole } from '../utils';
import tables from '../databases/local/seeds/sync-tables';
import { AuthRequest } from '../lib/express.type';

export class SyncController {
	getTables = async (req: Request & AuthRequest, res: Response) => {
		try {
			const syncStatuses = await syncService.getSyncStatus();

			const user = req.auth

			const dataTables = tables.filter(table => {

				if (user.roleName === 'super_admin') return true;

				if (table.permissions) return hasAnyPermission(user, table.permissions)

				return hasRole(user, table.role)
			})

			const tablesWithStatus = dataTables.map((table) => {
				const syncStatus = Array.isArray(syncStatuses)
					? syncStatuses.find((s: any) => s.tableName === table.id)
					: syncStatuses;

				return {
					...table,
					status: syncStatus?.status || 'pending',
					lastSync: syncStatus?.lastSync || new Date().toISOString(),
					syncedDocs: syncStatus?.syncCount || 0,
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

	async pullData(req: Request, res: Response): Promise<void> {
		try {
			const { tableName } = req.body;

			if (!tableName) {
				res.status(400).json({
					success: false,
					message: 'Table name is required',
				});

				return;
			}

			const result = await syncService.pullDataFromAPI(tableName);

			res.json({
				success: result.success,
				message: result.success
					? 'Data pulled successfully'
					: 'Pull completed with errors',
				syncedDocs: result.recordCount,
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
	}

	pushData = async (req: Request, res: Response): Promise<any> => {
		try {
			const { tableName } = req.body;

			if (!tableName) {
				return res.status(400).json({
					success: false,
					message: 'Table name is required',
				});
			}

			const result = await syncService.pullDataFromAPI(tableName);

			res.json({
				success: result.success,
				message: result.success
					? 'Data pushed successfully'
					: 'Push completed with errors',
				syncedDocs: result.recordCount,
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

	getSyncStatus = async (req: Request, res: Response): Promise<any> => {
		try {
			const { tableName } = req.params;
			const status = await syncService.getSyncStatus(tableName);

			if (!status) {
				return res.status(404).json({
					success: false,
					message: 'Table not found',
				});
			}

			res.json({
				success: true,
				status: status.status,
				lastSync: status.lastSync,
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

	bulkSync = async (req: Request, res: Response): Promise<any> => {
		try {
			const { tableNames, direction = 'bidirectional' } = req.body;

			if (!tableNames || !Array.isArray(tableNames)) {
				return res.status(400).json({
					success: false,
					message: 'Table names array is required',
				});
			}

			if (!['pull', 'push', 'bidirectional'].includes(direction)) {
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

			res.json({
				success: overallSuccess,
				message: overallSuccess
					? 'Bulk sync completed successfully'
					: 'Bulk sync completed with errors',
				totalRecords,
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

	testConnections = async (req: Request, res: Response) => {
		try {
			const connections = await syncService.testConnections();

			const allConnected = Object.values(connections).every(
				(connected) => connected
			);

			res.json({
				success: true,
				connections,
				message: allConnected
					? 'All connections successful'
					: 'Some connections failed',
				details: {
					mysql: connections.api ? 'Connected' : 'Failed',
					sealdb: connections.prisma ? 'Connected' : 'Failed',
				},
			});
		} catch (error: any) {
			console.error('Error testing connections:', error);
			res.status(500).json({
				success: false,
				message: 'Failed to test connections',
				error: error.message,
			});
		}
	};

	getTableStats = async (req: Request, res: Response): Promise<any> => {
		try {
			const { tableName } = req.params;

			if (!tableName) {
				return res.status(400).json({
					success: false,
					message: 'Table name is required',
				});
			}

			const stats = await syncService.getTableStats(tableName);

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

			const allRecords = await syncService.getAllRecords(tableName);
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
}
