export interface ExportOptions {
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

export interface TableStats {
	tableName: string;
	totalRecords: number;
	syncedRecords: number;
	unsyncedRecords: number;
	lastUpdated?: string;
}

export interface ExportOptions {
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

export interface ExportResult {
	tableName: string;
	recordCount: number;
	data: any[];
	exportedAt: string;
	format: string;
}

export interface PrinterInfo {
	description: string;
	displayName: string;
	isDefault: boolean;
	name: string;
	options: any;
	type: string;
	model: string;
	location: string;
	status: string;
}
