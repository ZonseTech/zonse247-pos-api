import fs from 'fs';
import path from 'path';
import { ExportDBModel } from '../databases/local/exports.db';

export class DatabaseExportService {
	private exportDBModel: ExportDBModel;
	private readonly databasePath: string;

	constructor() {
		const appData = process.env.APPDATA || '';
		const appName = process.env.APPNAME || 'z-pharmacy';
		this.databasePath = path.join(appData, appName, 'src', 'api', 'databases');
		this.exportDBModel = new ExportDBModel(this.loadTables());
	}

	private loadTables() {
		if (!fs.existsSync(this.databasePath)) {
			throw new Error(
				`Database directory does not exist: ${this.databasePath}`
			);
		}

		const files = fs.readdirSync(this.databasePath);

		const tableNames: string[] = [];

		for (const file of files) {
			const filePath = path.join(this.databasePath, file);
			const fileStat = fs.statSync(filePath);

			if (fileStat.isFile()) {
				const tableName = path.parse(file).name;

				if (!file.startsWith('.') && !file.startsWith('_')) {
					tableNames.push(tableName);
				}
			}
		}

		return tableNames.sort();
	}

	public async getAvailableTables(): Promise<string[]> {
		try {
			return this.loadTables();
		} catch (error) {
			throw new Error(`Failed to get available tables: ${error}`);
		}
	}

	public async exportTable(
		tableName: string,
		options: ExportOptions = { format: 'json' }
	): Promise<ExportResult> {
		try {
			const availableTables = await this.getAvailableTables();
			if (!availableTables.includes(tableName)) {
				throw new Error(`Table '${tableName}' is not supported`);
			}

			const query: any = {};
			if (options.dateRange) {
				query[options.dateRange.field] = {
					$gte: options.dateRange.start,
					$lte: options.dateRange.end,
				};
			}

			let records = await this.exportDBModel.find(tableName, query);

			if (options.offset) {
				records = records.slice(options.offset);
			}

			if (options.limit) {
				records = records.slice(0, options.limit);
			}

			if (!options.includeMetadata) {
				records = records.map((record) => {
					const { ...cleanRecord } = record;
					return cleanRecord;
				});
			}

			return {
				tableName,
				recordCount: records.length,
				data: records,
				exportedAt: new Date().toISOString(),
				format: options.format,
			};
		} catch (error) {
			throw new Error(`Failed to export table '${tableName}': ${error}`);
		}
	}

	public async exportMultipleTables(
		tableNames: string[],
		options: ExportOptions = { format: 'json' }
	): Promise<ExportResult[]> {
		try {
			const results: ExportResult[] = [];

			for (const tableName of tableNames) {
				const result = await this.exportTable(tableName, options);
				results.push(result);
			}

			return results;
		} catch (error) {
			throw new Error(`Failed to export multiple tables: ${error}`);
		}
	}

	public async getTableStats(tableName: string): Promise<{
		tableName: string;
		totalRecords: number;
		syncedRecords: number;
		unsyncedRecords: number;
		lastUpdated?: string;
	}> {
		try {
			const availableTables = await this.getAvailableTables();
			if (!availableTables.includes(tableName)) {
				throw new Error(`Table '${tableName}' is not supported`);
			}

			const totalRecords = await this.exportDBModel.count(tableName);
			const syncedRecords = await this.exportDBModel.count(tableName, {
				synced: 1,
			});
			const unsyncedRecords = await this.exportDBModel.count(tableName, {
				synced: { $ne: 1 },
			});

			const recentRecords = await this.exportDBModel.find(tableName, {});

			const lastUpdated =
				recentRecords.length > 0 ? recentRecords[0].updatedAt : undefined;

			return {
				tableName,
				totalRecords,
				syncedRecords,
				unsyncedRecords,
				lastUpdated,
			};
		} catch (error) {
			throw new Error(`Failed to get table stats for '${tableName}': ${error}`);
		}
	}

	public async createDownloadableExport(
		tableName: string,
		options: ExportOptions = { format: 'json' }
	): Promise<{
		filename: string;
		filepath: string;
		size: number;
		mimeType: string;
	}> {
		try {
			const exportResult = await this.exportTable(tableName, options);

			const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
			const filename = `${tableName}_export_${timestamp}.${options.format}`;

			const exportsDir = path.join(process.cwd(), 'exports');
			if (!fs.existsSync(exportsDir)) {
				fs.mkdirSync(exportsDir, { recursive: true });
			}

			const filepath = path.join(exportsDir, filename);

			let content: string;
			let mimeType: string;

			if (options.format === 'json') {
				content = JSON.stringify(exportResult, null, 2);
				mimeType = 'application/json';
			} else {
				content = this.convertToCSV(exportResult.data);
				mimeType = 'text/csv';
			}

			fs.writeFileSync(filepath, content, 'utf8');

			const stats = fs.statSync(filepath);

			return {
				filename,
				filepath,
				size: stats.size,
				mimeType,
			};
		} catch (error) {
			throw new Error(`Failed to create downloadable export: ${error}`);
		}
	}

	private convertToCSV(data: any[]): string {
		if (data.length === 0) return '';

		const headers = Object.keys(data[0]);
		const csvHeaders = headers.join(',');

		const csvRows = data.map((row) => {
			return headers
				.map((header) => {
					const value = row[header];

					if (
						typeof value === 'string' &&
						(value.includes(',') || value.includes('"') || value.includes('\n'))
					) {
						return `"${value.replace(/"/g, '""')}"`;
					}
					return value || '';
				})
				.join(',');
		});

		return [csvHeaders, ...csvRows].join('\n');
	}

	public async cleanupOldExports(olderThanDays = 7): Promise<number> {
		try {
			const exportsDir = path.join(process.cwd(), 'exports');
			if (!fs.existsSync(exportsDir)) return 0;

			const files = fs.readdirSync(exportsDir);
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

			let deletedCount = 0;

			for (const file of files) {
				const filepath = path.join(exportsDir, file);
				const stats = fs.statSync(filepath);

				if (stats.mtime < cutoffDate) {
					fs.unlinkSync(filepath);
					deletedCount++;
				}
			}

			return deletedCount;
		} catch (error) {
			console.error('Error cleaning up old exports:', error);
			return 0;
		}
	}
}
