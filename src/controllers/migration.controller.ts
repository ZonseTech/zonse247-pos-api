import { existsSync, unlinkSync } from 'fs'
import { Request, Response } from 'express';
import { MigrationService } from '../services/migration.service';

export class MigrationController {
	private migrationService: MigrationService;

	constructor() {
		this.migrationService = new MigrationService();
	}

	public uploadFile = async (req: Request, res: Response): Promise<void> => {
		try {
			if (!req.file) {
				res.status(400).json({
					success: false,
					message: 'No file uploaded',
				});
				return;
			}

			const tableName = req.body.tableName;
			if (!tableName) {
				res.status(400).json({
					success: false,
					message: 'Table name is required',
				});
				return;
			}

			const result = await this.migrationService.processUploadedFile(req.file, tableName);
			res.json({
				success: true,
				message: 'File uploaded and parsed successfully',
				...result,
			});
		} catch (error: any) {
			console.error('Upload error:', error);
			if (req.file?.path && existsSync(req.file.path)) {
				unlinkSync(req.file.path);
			}
			res.status(500).json({
				success: false,
				message: error.message || 'Error processing uploaded file',
			});
		}
	};

	public startMigration = async (req: Request, res: Response): Promise<void> => {
		try {
			const result = await this.migrationService.startMigration();
			res.json({
				success: true,
				message: 'Migration started',
				...result,
			});
		} catch (error: any) {
			console.error('Migration start error:', error);
			res.status(500).json({
				success: false,
				message: error.message || 'Error starting migration',
			});
		}
	};

	public startMappingData = async (req: Request, res: Response): Promise<void> => {
		try {
			const { columnMappings, outputFileName, format = 'json' }: MappingConfigRequest = req.body;

			if (!columnMappings || !Array.isArray(columnMappings) || columnMappings.length === 0) {
				res.status(400).json({
					success: false,
					message: 'Column mappings are required and must be a non-empty array',
				});
				return;
			}

			const invalidMappings = columnMappings.filter(
				mapping => !mapping.sourceColumn || !mapping.targetColumn
			);

			if (invalidMappings.length > 0) {
				res.status(400).json({
					success: false,
					message: 'Each column mapping must have both sourceColumn and targetColumn',
				});
				return;
			}

			const mappingConfig = {
				columnMappings,
				outputFileName,
			};

			let result;
			if (format === 'csv') {
				result = await this.migrationService.saveMappedDataAsCSV(mappingConfig);
			} else {
				result = await this.migrationService.startMappingData(mappingConfig);
			}

			res.json({
				success: true,
				message: `Data mapping completed successfully as ${format.toUpperCase()}`,
				data: result,
			});
		} catch (error: any) {
			console.error('Data mapping error:', error);
			res.status(500).json({
				success: false,
				message: error.message || 'Error starting data mapping',
			});
		}
	};

	public getAvailableColumns = (req: Request, res: Response): void => {
		try {
			const columns = this.migrationService.getAvailableColumns();
			res.json({
				success: true,
				columns,
				message: columns.length > 0
					? 'Available columns retrieved successfully'
					: 'No data uploaded yet',
			});
		} catch (error: any) {
			console.error('Get columns error:', error);
			res.status(500).json({
				success: false,
				message: error.message || 'Error getting available columns',
			});
		}
	};

	public getMigrationProgress = (req: Request, res: Response): void => {
		try {
			const progress = this.migrationService.getMigrationProgress();
			res.json(progress);
		} catch (error: any) {
			console.error('Get progress error:', error);
			res.status(500).json({
				success: false,
				message: error.message || 'Error getting migration progress',
			});
		}
	};

	public resetMigration = (req: Request, res: Response): void => {
		try {
			this.migrationService.resetMigration();
			res.json({
				success: true,
				message: 'Migration reset successfully',
			});
		} catch (error: any) {
			console.error('Reset migration error:', error);
			res.status(500).json({
				success: false,
				message: error.message || 'Error resetting migration',
			});
		}
	};
}