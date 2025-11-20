export interface MigrationProgress {
	table: string;
	status: 'pending' | 'processing' | 'completed' | 'error';
	message?: string;
	details?: string;
	recordCount?: number;
	timestamp: string;
}

export interface UploadStatus {
	type: 'success' | 'error';
	message: string;
	data?: MigrationUploadResponse;
}

export interface MigrationUploadResponse {
	recordCount: number;
	tableName: string;
	message: string;
	columns?: any
}

export interface MigrationProgressItem {
	table?: string;
	status: 'completed' | 'error' | 'processing' | 'pending';
	message?: string;
	details?: string;
	timestamp: string;
	recordCount?: number;
}

export interface MigrationStats {
	total: number;
	completed: number;
	errors: number;
	progress?: number;
}

export interface MigrationProgressResponse {
	progress: MigrationProgressItem[];
	stats: MigrationStats;
	completed: boolean;
}

export interface MigrationStartRequest {
	fileName: string;
	tableName: string;
}



export interface UploadedFile {
	path: string;
	originalname: string;
	size: number;
	mimetype: string;
}

export interface TColumnMapping {
	dbColumn: string;
	recordColumn: string;
}

export interface MigrationRecord {
	uuid?: string;
	_id?: string;
	synced?: number;
	createdAt?: any;
	updatedAt?: any;
	created_at?: string;
	updated_at?: string;
	[key: string]: any;
}

export interface MappingConfig {
	columnMappings: ColumnMapping[];
	outputFileName?: string;
	format?: "json" | "csv"
}

export interface MappingConfigRequest {
	columnMappings: Array<{
		sourceColumn: string;
		targetColumn: string;
	}>;
	outputFileName?: string;
	format?: 'json' | 'csv';
}

export interface MappingResult {
	data?: any;
	success?: boolean;
	message?: string;
	outputFile?: string;
	recordCount?: number;
	columnMappings?: any;
	outputFileName?: any;
	format?: any;
}

export interface ColumnMapping {
	sourceColumn: string;
	targetColumn: string;
}
