interface MigrationProgress {
	table: string;
	status: 'pending' | 'processing' | 'completed' | 'error';
	message?: string;
	details?: string;
	recordCount?: number;
	timestamp: string;
}

interface UploadStatus {
	type: 'success' | 'error';
	message: string;
	data?: MigrationUploadResponse;
}

interface MigrationStats {
	total: number;
	completed: number;
	errors: number;
	progress: number;
}

interface MigrationUploadResponse {
	recordCount: number;
	tableName: string;
	message: string;
	columns?: any
}

interface MigrationProgressItem {
	table?: string;
	status: 'completed' | 'error' | 'processing' | 'pending';
	message?: string;
	details?: string;
	timestamp: string;
	recordCount?: number;
}

interface MigrationStats {
	total: number;
	completed: number;
	errors: number;
	progress?: number;
}

interface MigrationProgressResponse {
	progress: MigrationProgressItem[];
	stats: MigrationStats;
	completed: boolean;
}

interface MigrationStartRequest {
	fileName: string;
	tableName: string;
}



interface UploadedFile {
	path: string;
	originalname: string;
	size: number;
	mimetype: string;
}

interface TColumnMapping {
	dbColumn: string;
	recordColumn: string;
}

interface MigrationRecord {
	uuid?: string;
	_id?: string;
	synced?: number;
	createdAt?: any;
	updatedAt?: any;
	created_at?: string;
	updated_at?: string;
	[key: string]: any;
}

interface MappingConfig {
	columnMappings: ColumnMapping[];
	outputFileName?: string;
	format?: "json" | "csv"
}

interface MappingConfigRequest {
	columnMappings: Array<{
		sourceColumn: string;
		targetColumn: string;
	}>;
	outputFileName?: string;
	format?: 'json' | 'csv';
}

interface MappingResult {
	data?: any;
	success?: boolean;
	message?: string;
	outputFile?: string;
	recordCount?: number;
	columnMappings?: any;
	outputFileName?: any;
	format?: any;
}

interface ColumnMapping {
	sourceColumn: string;
	targetColumn: string;
}
