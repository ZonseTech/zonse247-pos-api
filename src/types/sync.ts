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
	recordCount: number;
	timestamp: string;
	type?: string;
	success: boolean;
	recordsProcessed?: number;
	recordsInserted?: number;
	recordsUpdated?: number;
	recordsDeleted?: number;
	errors: string[];
	conflicts?: ConflictRecord[];
}

// ==========================================
// Enhanced Sync Types for Bidirectional Sync
// ==========================================

export type SyncDirection = 'pull' | 'push' | 'bidirectional';

export type ConflictResolutionStrategy =
	| 'server_wins'
	| 'client_wins'
	| 'latest_wins'
	| 'manual';

export interface SyncOptions {
	direction: SyncDirection;
	conflictStrategy?: ConflictResolutionStrategy;
	batchSize?: number;
	dryRun?: boolean;
	forceSync?: boolean;
	since?: Date;
	filters?: Record<string, any>;
	useTransaction?: boolean;
}

export interface TableConfig {
	name: string;
	modelName: string;
	endpoint: string;
	syncDirection: SyncDirection;
	conflictStrategy: ConflictResolutionStrategy;
	primaryKey: string;
	syncFields?: string[];
	excludeFields?: string[];
	softDelete?: boolean;
	batchSize: number;
}

export interface RecordData {
	id?: string | number;
	uuid?: string;
	synced?: boolean;
	syncedAt?: Date;
	localVersion?: number;
	serverVersion?: number;
	deletedAt?: Date | null;
	createdAt?: Date;
	updatedAt?: Date;
	[key: string]: any;
}

export interface ConflictRecord {
	tableName: string;
	recordId: string;
	localData: RecordData;
	serverData: RecordData;
	conflictType: 'update_conflict' | 'delete_conflict' | 'create_conflict';
	resolvedBy?: ConflictResolutionStrategy;
	resolvedAt?: Date;
}

export interface SyncBatch {
	tableName: string;
	operation: 'create' | 'update' | 'delete';
	records: RecordData[];
	batchId: string;
	timestamp: Date;
}

export interface SyncTransaction {
	transactionId: string;
	batches: SyncBatch[];
	direction: SyncDirection;
	status: 'pending' | 'in_progress' | 'committed' | 'rolled_back' | 'failed';
	startedAt: Date;
	completedAt?: Date;
	error?: string;
}

export interface SyncState {
	tableName: string;
	lastPullAt?: Date;
	lastPushAt?: Date;
	lastSyncVersion?: number;
	pendingChanges: number;
	status: 'idle' | 'syncing' | 'error';
	errorMessage?: string;
}

export interface PullResult {
	success: boolean;
	recordsReceived: number;
	recordsInserted: number;
	recordsUpdated: number;
	recordsSkipped: number;
	conflicts: ConflictRecord[];
	errors: string[];
	timestamp: string;
}

export interface PushResult {
	success: boolean;
	recordsSent: number;
	recordsAccepted: number;
	recordsRejected: number;
	conflicts: ConflictRecord[];
	errors: string[];
	timestamp: string;
}

export interface BidirectionalSyncResult {
	success: boolean;
	pull: PullResult;
	push: PushResult;
	conflicts: ConflictRecord[];
	resolvedConflicts: number;
	unresolvedConflicts: number;
	timestamp: string;
}

export interface SyncDelta {
	created: RecordData[];
	updated: RecordData[];
	deleted: string[];
	lastSyncAt: Date;
}

// ==========================================
// Outbound Sync Types (Local -> Remote)
// ==========================================

export interface OutboundSyncResult {
	success: boolean;
	tableName: string;
	recordsSent: number;
	recordsAccepted: number;
	recordsFailed: number;
	errors: string[];
	timestamp: string;
}

export interface OutboundSyncStatus {
	isRunning: boolean;
	isSyncing: boolean;
	intervalMs: number;
	tables: string[];
	pendingCounts?: Record<string, number>;
}

// ==========================================
// Incoming Sync Types (Remote receives from Local)
// ==========================================

export interface IncomingSyncResult {
	success: boolean;
	accepted: string[];
	rejected: { id: string; reason: string }[];
	timestamp: string;
}

export interface IncomingSyncStats {
	totalSynced: Record<string, number>;
	lastSyncAt: Record<string, Date | null>;
}

// ==========================================
// Sync Queue Types
// ==========================================

export interface SyncQueueItem {
	id: string;
	tableName: string;
	recordId: string;
	operation: 'create' | 'update' | 'delete';
	data: Record<string, any>;
	attempts: number;
	maxRetries: number;
	lastAttemptAt?: Date;
	nextRetryAt?: Date;
	error?: string;
	status: 'pending' | 'processing' | 'completed' | 'failed';
	createdAt: Date;
	updatedAt: Date;
}

export interface SyncQueueStats {
	pending: number;
	processing: number;
	completed: number;
	failed: number;
	totalByTable: Record<string, number>;
}