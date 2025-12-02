import fs from 'fs';
import Papa from 'papaparse';
import { sealDBModel } from '../databases/local';
import { PoolConnection } from 'mysql2/promise';
import migrationTables from '../databases/local/migration-table-columns'
import { transformValue } from '../utils/data-sync-transfomer';
import { MigrationProgress, MigrationRecord, MigrationStats, TColumnMapping } from 'migrations';
import prisma from '../databases/prisma/client';

export class MigrationModel {
    private static instance: MigrationModel;
    private migrationProgress: MigrationProgress[] = [];
    private migrationStats: MigrationStats = {
        total: 0,
        completed: 0,
        errors: 0,
        progress: 0,
    };
    private isMigrating = false;
    private uploadedData: MigrationRecord[] = [];
    private currentTableName = '';

    public static getInstance(): MigrationModel {
        if (!MigrationModel.instance) {
            MigrationModel.instance = new MigrationModel();
        }
        return MigrationModel.instance;
    }

    public getMigrationProgress(): MigrationProgress[] {
        return this.migrationProgress;
    }

    public getMigrationStats(): MigrationStats {
        return this.migrationStats;
    }

    public getIsMigrating(): boolean {
        return this.isMigrating;
    }

    public getUploadedDataCount(): number {
        return this.uploadedData.length;
    }

    public getCurrentTableName(): string {
        return this.currentTableName;
    }

    public getUploadedDataPreview(limit = 5): MigrationRecord[] {
        return this.uploadedData.slice(0, limit);
    }

    public setUploadedData(data: MigrationRecord[]): void {
        this.uploadedData = data;
    }

    public setCurrentTableName(tableName: string): void {
        this.currentTableName = tableName;
    }

    public setIsMigrating(status: boolean): void {
        this.isMigrating = status;
    }

    public initializeMigrationStats(total: number): void {
        this.migrationStats = {
            total,
            completed: 0,
            errors: 0,
            progress: 0,
        };
    }

    public updateMigrationStats(completed: number, errors: number): void {
        this.migrationStats.completed += completed;
        this.migrationStats.errors += errors;
        this.migrationStats.progress = Math.round(
            ((this.migrationStats.completed + this.migrationStats.errors) / this.migrationStats.total) * 100
        );
    }

    public addProgress(
        table: string,
        status: MigrationProgress['status'],
        message: string,
        details?: string
    ): void {
        this.migrationProgress.push({
            table,
            status,
            message,
            details,
            timestamp: new Date().toLocaleTimeString(),
        });

        if (this.migrationProgress.length > 50) {
            this.migrationProgress = this.migrationProgress.slice(-50);
        }
    }

    public resetMigration(): void {
        this.migrationProgress = [];
        this.migrationStats = { total: 0, completed: 0, errors: 0, progress: 0 };
        this.isMigrating = false;
        this.uploadedData = [];
        this.currentTableName = '';
    }

    public async parseNeDBFile(filePath: string): Promise<MigrationRecord[]> {
        return new Promise((resolve, reject) => {
            const data: MigrationRecord[] = [];
            const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
            let buffer = '';

            fileStream.on('data', (chunk) => {
                buffer += chunk;
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const record = JSON.parse(line);
                            data.push(record);
                        } catch (error) {
                            console.warn('Failed to parse line:', line, error);
                        }
                    }
                }
            });

            fileStream.on('end', () => {
                if (buffer.trim()) {
                    try {
                        const record = JSON.parse(buffer);
                        data.push(record);
                    } catch (error) {
                        console.warn('Failed to parse final line:', buffer, error);
                    }
                }
                resolve(data);
            });

            fileStream.on('error', reject);
        });
    }

    public async parseJSONFile(filePath: string): Promise<MigrationRecord[]> {
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed : [parsed];
    }

    public async parseCSVFile(filePath: string): Promise<MigrationRecord[]> {
        return new Promise((resolve, reject) => {
            const content = fs.readFileSync(filePath, 'utf8');

            Papa.parse(content, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => {
                    resolve(results.data as MigrationRecord[]);
                },
                error: (error: any) => {
                    reject(error);
                },
            });
        });
    }

    public async testConnections(): Promise<void> {
        try {
            await prisma.$queryRaw`SELECT 1`;

            await prisma.users.count();

            this.addProgress('connection-test', 'completed', 'Database connections verified');

        } catch (error: any) {
            throw new Error(`Database connection failed: ${error.message}`);
        }
    }


    public async migrateBatch(batch: MigrationRecord[]): Promise<void> {
        await prisma.$transaction(async (tx) => {
            for (const record of batch) {
                const cleanRecord = this.prepareRecordForMySQL(record);

                const dataSet: Record<string, any> = {};

                Object.keys(cleanRecord).forEach(key => {
                    dataSet[key.replace(/([A-Z])/g, '_$1').toLowerCase()] = cleanRecord[key];
                });

                await tx.categories.create({
                    data: dataSet as any
                });

                await prisma.categories.upsert({
                    where: { id: dataSet.id },
                    update: dataSet,
                    create: dataSet as any
                });
            }
        });
    }


    private async getTableColumns(connection: PoolConnection): Promise<string[]> {
        const [rows] = await connection.execute(
            `SHOW COLUMNS FROM ${this.currentTableName}`
        ) as any[];
        return rows.map((row: any) => row.Field);
    }

    private transformData(data: MigrationRecord, mappings: TColumnMapping[]) {
        const transformedRow: any = {};

        mappings.forEach(mapping => {
            const { dbColumn, recordColumn } = mapping;

            let value: any;

            if (dbColumn === 'uuid') {
                value = data['_id'] || data['uuid']
            } else
                value = data[recordColumn] === null || data[recordColumn] === '' || data[recordColumn] === undefined ? recordColumn : data[recordColumn];

            transformedRow[dbColumn] = transformValue(dbColumn, value);
        });

        return transformedRow;
    }

    private async insertIntoMySQL(connection: PoolConnection, record: MigrationRecord): Promise<void> {
        try {
            const columnMappings: TColumnMapping[] = migrationTables[this.currentTableName];

            await this.getTableColumns(connection);

            const data = this.transformData(record, columnMappings);
            const columns = Object.keys(data).join(", ");
            const placeholders = Object.keys(data).map((_) => `?`).join(", ");
            const values = Object.values(data);

            const query = `INSERT INTO ${this.currentTableName} (${columns}) VALUES (${placeholders})`;

            await connection.execute(query, values);

        } catch (error) {
            console.error('Error inserting into MySQL:', error);
            throw error;
        }
    }

    private async syncToLocalDB(record: MigrationRecord): Promise<void> {
        try {
            await sealDBModel.insert(this.currentTableName, {
                ...record,
                synced: 1,
            });
        } catch (error: any) {
            if (!error.message?.includes('unique')) {
                throw error;
            }
        }
    }

    private prepareRecordForMySQL(record: MigrationRecord): MigrationRecord {
        const cleanRecord = { ...record };

        if (!cleanRecord.uuid) {
            cleanRecord.uuid = (cleanRecord._id || '').toString() || this.generateUUID();
        }

        delete cleanRecord._id;

        if (!cleanRecord.synced) {
            cleanRecord.synced = 1;
        }

        if (cleanRecord.createdAt && typeof cleanRecord.createdAt === 'object') {
            cleanRecord.created_at = new Date(
                cleanRecord.createdAt.$$date || cleanRecord.createdAt
            ).toISOString();
        }

        if (cleanRecord.updatedAt && typeof cleanRecord.updatedAt === 'object') {
            cleanRecord.updated_at = new Date(
                cleanRecord.updatedAt.$$date || cleanRecord.updatedAt
            ).toISOString();
        }

        if (!cleanRecord.createdAt) {
            cleanRecord.created_at = new Date().toISOString();
        }

        if (!cleanRecord.updatedAt) {
            cleanRecord.updated_at = new Date().toISOString();
        }

        return cleanRecord;
    }

    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c == 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    public getUploadedData(): MigrationRecord[] {
        return this.uploadedData;
    }
}
