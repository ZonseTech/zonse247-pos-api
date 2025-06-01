interface Table {
	id: number | string;
	name: string;
	syncedDocs: number;
	lastSync: string;
	status: 'synced' | 'pending' | 'error' | 'syncing';
	description: string;
}

interface SyncResponse {
	success: boolean;
	message: string;
	syncedDocs?: number;
	lastSync?: string;
	errors?: Array<string>;
}

interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	message?: string;
	error?: string;
}

interface SyncJobStatus {
	id: string;
	tableId: string | number;
	status: 'pending' | 'running' | 'completed' | 'failed';
	progress: number;
	startTime: string;
	endTime?: string;
	errorMessage?: string;
}

interface SyncMetrics {
	totalRows: number;
	processedRows: number;
	errorRows: number;
	duration: number;
}

interface SyncResult {
	success: boolean;
	recordCount: number;
	errors: string[];
	timestamp: string;
}
