export interface Table {
	id: number | string;
	name: string;
	syncedDocs: number;
	lastSync: string;
	status: 'synced' | 'pending' | 'error' | 'syncing';
	description: string;
}

export interface SyncResponse {
	success: boolean;
	message: string;
	syncedDocs?: number;
	lastSync?: string;
	errors?: Array<string>;
}

export interface SyncJobStatus {
	id: string;
	tableId: string | number;
	status: 'pending' | 'running' | 'completed' | 'failed';
	progress: number;
	startTime: string;
	endTime?: string;
	errorMessage?: string;
}

export interface SyncMetrics {
	totalRows: number;
	processedRows: number;
	errorRows: number;
	duration: number;
}

export interface SyncResult {
	success: boolean;
	recordCount: number;
	errors: string[];
	timestamp: string;
}

export interface SyncResult {
	type: string;
	success: boolean;
	recordsProcessed: number;
	recordsInserted: number;
	recordsUpdated: number;
	errors: string[];
}