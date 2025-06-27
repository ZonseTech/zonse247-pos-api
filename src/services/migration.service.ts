import path from 'path';
import fs from 'fs';
import { MigrationModel } from '../models/migration.model';

export class MigrationService {
    private migrationModel: MigrationModel;
    private readonly mappedDataDirectory = 'mapped-data';

    constructor() {
        this.migrationModel = MigrationModel.getInstance();
        this.ensureMappedDataDirectory();
    }

    private ensureMappedDataDirectory(): void {
        if (!fs.existsSync(this.mappedDataDirectory)) {
            fs.mkdirSync(this.mappedDataDirectory, { recursive: true });
        }
    }

    public async processUploadedFile(file: UploadedFile, tableName: string): Promise<{
        recordCount: number;
        tableName: string;
        preview: MigrationRecord[];
    }> {
        const filePath = file.path;
        const fileExtension = path.extname(file.originalname).toLowerCase();
        let data: MigrationRecord[] = [];

        try {
            switch (fileExtension) {
                case '.db':
                    data = await this.migrationModel.parseNeDBFile(filePath);
                    break;
                case '.json':
                    data = await this.migrationModel.parseJSONFile(filePath);
                    break;
                case '.csv':
                    data = await this.migrationModel.parseCSVFile(filePath);
                    break;
                default:
                    throw new Error('Unsupported file type');
            }

            this.migrationModel.setUploadedData(data);
            this.migrationModel.setCurrentTableName(tableName);

            return {
                recordCount: data.length,
                tableName,
                preview: this.migrationModel.getUploadedDataPreview(5),
            };
        } finally {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    }

    public async startMigration(): Promise<{ recordCount: number }> {
        if (this.migrationModel.getIsMigrating()) {
            throw new Error('Migration already in progress');
        }

        if (this.migrationModel.getUploadedDataCount() === 0) {
            throw new Error('No data to migrate. Please upload a file first.');
        }

        this.migrationModel.setIsMigrating(true);
        this.migrationModel.initializeMigrationStats(this.migrationModel.getUploadedDataCount());

        process.nextTick(() => this.performMigration());

        return {
            recordCount: this.migrationModel.getUploadedDataCount(),
        };
    }

    private async performMigration(): Promise<void> {
        try {
            this.migrationModel.addProgress('migration', 'processing', 'Starting migration process...');

            await this.migrationModel.testConnections();

            const batchSize = 100;
            const uploadedData = this.migrationModel.getUploadedData();
            const batches = Math.ceil(uploadedData.length / batchSize);

            for (let i = 0; i < batches; i++) {
                const start = i * batchSize;
                const end = Math.min(start + batchSize, uploadedData.length);
                const batch = uploadedData.slice(start, end);

                this.migrationModel.addProgress(
                    `batch-${i + 1}`,
                    'processing',
                    `Processing batch ${i + 1} of ${batches}`,
                    `Records ${start + 1}-${end}`
                );

                try {
                    await this.migrationModel.migrateBatch(batch);
                    this.migrationModel.updateMigrationStats(batch.length, 0);

                    this.migrationModel.addProgress(
                        `batch-${i + 1}`,
                        'completed',
                        `Batch ${i + 1} completed successfully`,
                        `${batch.length} records migrated`
                    );
                } catch (error: any) {
                    this.migrationModel.updateMigrationStats(0, batch.length);
                    this.migrationModel.addProgress(
                        `batch-${i + 1}`,
                        'error',
                        `Batch ${i + 1} failed`,
                        error.message
                    );
                }
            }

            this.migrationModel.addProgress('migration', 'completed', 'Migration completed successfully');
        } catch (error: any) {
            console.error('Migration error:', error);
            this.migrationModel.addProgress('migration', 'error', 'Migration failed', error.message);
        } finally {
            this.migrationModel.setIsMigrating(false);
        }
    }

    public getMigrationProgress() {
        return {
            progress: this.migrationModel.getMigrationProgress(),
            stats: this.migrationModel.getMigrationStats(),
            completed: !this.migrationModel.getIsMigrating(),
            isRunning: this.migrationModel.getIsMigrating(),
        };
    }

    public resetMigration(): void {
        this.migrationModel.resetMigration();
    }

    public async startMappingData(mappingConfig: MappingConfig): Promise<{
        success: boolean;
        filePath: string;
        recordCount: number;
        mappedColumns: string[];
    }> {
        try {
            const uploadedData = this.migrationModel.getUploadedData();
            if (!uploadedData || uploadedData.length === 0) {
                throw new Error('No data to map. Please upload a file first.');
            }

            if (!mappingConfig.columnMappings || mappingConfig.columnMappings.length === 0) {
                throw new Error('Column mappings are required');
            }

            const sourceColumns = Object.keys(uploadedData[0]);
            const invalidMappings = mappingConfig.columnMappings.filter(
                mapping => !sourceColumns.includes(mapping.sourceColumn)
            );

            if (invalidMappings.length > 0) {
                throw new Error(
                    `Invalid source columns: ${invalidMappings.map(m => m.sourceColumn).join(', ')}. ` +
                    `Available columns: ${sourceColumns.join(', ')}`
                );
            }

            const mappedData = uploadedData.map(record => {
                const mappedRecord: any = {};
                mappingConfig.columnMappings.forEach(mapping => {
                    mappedRecord[mapping.targetColumn] = record[mapping.sourceColumn];
                });
                return mappedRecord;
            });

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const tableName = this.migrationModel.getCurrentTableName() || 'data';
            const outputFileName = mappingConfig.outputFileName ||
                `${tableName}-mapped-${timestamp}.json`;

            const outputPath = path.join(this.mappedDataDirectory, outputFileName);

            fs.writeFileSync(outputPath, JSON.stringify(mappedData, null, 2), 'utf8');

            const mappedColumns = mappingConfig.columnMappings.map(m => m.targetColumn);

            return {
                success: true,
                filePath: outputPath,
                recordCount: mappedData.length,
                mappedColumns,
            };

        } catch (error: any) {
            console.error('Data mapping error:', error);
            throw new Error(`Data mapping failed: ${error.message}`);
        }
    }

    public getAvailableColumns(): string[] {
        const uploadedData = this.migrationModel.getUploadedData();
        if (!uploadedData || uploadedData.length === 0) {
            return [];
        }
        return Object.keys(uploadedData[0]);
    }

    public async saveMappedDataAsCSV(mappingConfig: MappingConfig): Promise<{
        success: boolean;
        filePath: string;
        recordCount: number;
    }> {
        try {
            const uploadedData = this.migrationModel.getUploadedData();
            if (!uploadedData || uploadedData.length === 0) {
                throw new Error('No data to map. Please upload a file first.');
            }

            const mappedData = uploadedData.map(record => {
                const mappedRecord: any = {};
                mappingConfig.columnMappings.forEach(mapping => {
                    mappedRecord[mapping.targetColumn] = record[mapping.sourceColumn];
                });
                return mappedRecord;
            });

            const headers = mappingConfig.columnMappings.map(m => m.targetColumn);
            const csvContent = [
                headers.join(','),
                ...mappedData.map(record =>
                    headers.map(header => {
                        const value = record[header];
                        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value?.toString() || '';
                    }).join(',')
                )
            ].join('\n');

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const tableName = this.migrationModel.getCurrentTableName() || 'data';
            const outputFileName = mappingConfig.outputFileName?.replace('.json', '.csv') ||
                `${tableName}-mapped-${timestamp}.csv`;

            const outputPath = path.join(this.mappedDataDirectory, outputFileName);

            fs.writeFileSync(outputPath, csvContent, 'utf8');

            return {
                success: true,
                filePath: outputPath,
                recordCount: mappedData.length,
            };

        } catch (error: any) {
            console.error('CSV mapping error:', error);
            throw new Error(`CSV mapping failed: ${error.message}`);
        }
    }
}