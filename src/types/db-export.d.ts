interface ExportOptions {
	format: 'json' | 'csv';
	includeMetadata?: boolean;
	dateRange?: {
		start: string;
		end: string;
		field: string;
	};
	limit?: number;
	offset?: number;
}

interface TableStats {
	tableName: string;
	totalRecords: number;
	syncedRecords: number;
	unsyncedRecords: number;
	lastUpdated?: string;
}

interface ExportOptions {
	format: 'json' | 'csv';
	includeMetadata?: boolean;
	dateRange?: {
		start: string;
		end: string;
		field: string;
	};
	limit?: number;
	offset?: number;
}

interface ExportResult {
	tableName: string;
	recordCount: number;
	data: any[];
	exportedAt: string;
	format: string;
}

interface ApiResponse<T> {
	success: boolean;
	data: T;
	message?: string;
}
