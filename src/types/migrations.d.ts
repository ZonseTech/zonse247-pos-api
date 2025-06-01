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
