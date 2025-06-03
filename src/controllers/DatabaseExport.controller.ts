import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { DatabaseExportService } from '../services/DatabaseExport.service';
import type { ExportOptions } from '@/types';

export class DatabaseExportController {
	public getTables = async (req: Request, res: Response): Promise<void> => {
		try {
			const exportService = new DatabaseExportService();
			const tables = await exportService.getAvailableTables();
			res.json({
				success: true,
				data: tables,
				message: 'Available tables retrieved successfully',
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				message:
					error instanceof Error ? error.message : 'Unknown error occurred',
				data: null,
			});
		}
	};

	public getTableStats = async (req: Request, res: Response): Promise<void> => {
		try {
			const { tableName } = req.params;
			const exportService = new DatabaseExportService();
			const stats = await exportService.getTableStats(tableName);

			res.json({
				success: true,
				data: stats,
				message: 'Table statistics retrieved successfully',
			});
		} catch (error) {
			res.status(400).json({
				success: false,
				message:
					error instanceof Error ? error.message : 'Unknown error occurred',
				data: null,
			});
		}
	};

	public previewData = async (req: Request, res: Response): Promise<void> => {
		try {
			const { tableName, options = {} } = req.body;

			const previewOptions: ExportOptions = {
				...options,
				limit: Math.min(options.limit || 100, 100),
				format: 'json',
			};

			const exportService = new DatabaseExportService();
			const result = await exportService.exportTable(tableName, previewOptions);

			res.json({
				success: true,
				data: result,
				message: 'Data preview retrieved successfully',
			});
		} catch (error) {
			res.status(400).json({
				success: false,
				message:
					error instanceof Error ? error.message : 'Unknown error occurred',
				data: null,
			});
		}
	};

	public exportData = async (req: Request, res: Response): Promise<void> => {
		try {
			const { tableNames, options = {} } = req.body;

			if (!Array.isArray(tableNames) || tableNames.length === 0) {
				res.status(400).json({
					success: false,
					message: 'tableNames must be a non-empty array',
					data: null,
				});
				return;
			}

			const exportOptions: ExportOptions = {
				format: 'json',
				includeMetadata: false,
				...options,
			};

			let results;
			const exportService = new DatabaseExportService();
			if (tableNames.length === 1) {
				results = await exportService.exportTable(tableNames[0], exportOptions);
			} else {
				results = await exportService.exportMultipleTables(
					tableNames,
					exportOptions
				);
			}

			res.json({
				success: true,
				data: results,
				message: 'Data exported successfully',
			});
		} catch (error) {
			res.status(400).json({
				success: false,
				message:
					error instanceof Error ? error.message : 'Unknown error occurred',
				data: null,
			});
		}
	};

	public createDownload = async (
		req: Request,
		res: Response
	): Promise<void> => {
		try {
			const { tableName, options = {} } = req.body;

			if (!tableName) {
				res.status(400).json({
					success: false,
					message: 'tableName is required',
					data: null,
				});
				return;
			}

			const exportOptions: ExportOptions = {
				format: 'json',
				includeMetadata: false,
				...options,
			};

			const exportService = new DatabaseExportService();
			const downloadInfo = await exportService.createDownloadableExport(
				tableName,
				exportOptions
			);

			res.json({
				success: true,
				data: downloadInfo,
				message: 'Download file created successfully',
			});
		} catch (error) {
			res.status(400).json({
				success: false,
				message:
					error instanceof Error ? error.message : 'Unknown error occurred',
				data: null,
			});
		}
	};

	public downloadFile = async (req: Request, res: Response): Promise<void> => {
		try {
			const { filename } = req.params;
			const filepath = path.join(process.cwd(), 'exports', filename);

			if (!fs.existsSync(filepath)) {
				res.status(404).json({
					success: false,
					message: 'File not found',
					data: null,
				});
				return;
			}

			const stats = fs.statSync(filepath);
			const fileExtension = path.extname(filename).toLowerCase();

			let mimeType = 'application/octet-stream';
			if (fileExtension === '.json') {
				mimeType = 'application/json';
			} else if (fileExtension === '.csv') {
				mimeType = 'text/csv';
			}

			res.setHeader('Content-Type', mimeType);
			res.setHeader('Content-Length', stats.size);
			res.setHeader(
				'Content-Disposition',
				`attachment; filename="${filename}"`
			);

			const fileStream = fs.createReadStream(filepath);
			fileStream.pipe(res);
		} catch (error) {
			res.status(500).json({
				success: false,
				message:
					error instanceof Error ? error.message : 'Unknown error occurred',
				data: null,
			});
		}
	};

	public bulkExport = async (req: Request, res: Response): Promise<void> => {
		try {
			const { tableNames, options = {} } = req.body;

			if (!Array.isArray(tableNames) || tableNames.length === 0) {
				res.status(400).json({
					success: false,
					message: 'tableNames must be a non-empty array',
					data: null,
				});
				return;
			}

			const exportOptions: ExportOptions = {
				format: 'json',
				includeMetadata: false,
				...options,
			};

			const downloadInfos = [];
			const exportService = new DatabaseExportService();

			for (const tableName of tableNames) {
				try {
					const downloadInfo = await exportService.createDownloadableExport(
						tableName,
						exportOptions
					);
					downloadInfos.push(downloadInfo);
				} catch (error) {
					console.error(`Failed to export table ${tableName}:`, error);
					downloadInfos.push({
						tableName,
						error: error instanceof Error ? error.message : 'Unknown error',
						success: false,
					});
				}
			}

			res.json({
				success: true,
				data: downloadInfos,
				message: 'Bulk export completed',
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				message:
					error instanceof Error ? error.message : 'Unknown error occurred',
				data: null,
			});
		}
	};

	public cleanupFiles = async (req: Request, res: Response): Promise<void> => {
		try {
			const { olderThanDays = 7 } = req.body;
			const exportService = new DatabaseExportService();
			const deletedCount = await exportService.cleanupOldExports(olderThanDays);

			res.json({
				success: true,
				data: { deletedCount },
				message: `Cleaned up ${deletedCount} old export files`,
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				message:
					error instanceof Error ? error.message : 'Unknown error occurred',
				data: null,
			});
		}
	};
}
