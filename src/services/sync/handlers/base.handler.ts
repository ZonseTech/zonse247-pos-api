import type { SyncResult, SyncRecordBase } from '../types/sync.types';

type SyncRecordWithId = { id: string } & Record<string, unknown>;

/**
 * Create an empty sync result
 */
export function createEmptySyncResult(): SyncResult {
    return {
        success: true,
        accepted: 0,
        rejected: 0,
        skipped: 0,
        errors: [],
    };
}

/**
 * Finalize sync result by setting success based on rejections
 */
export function finalizeSyncResult(result: SyncResult): SyncResult {
    result.success = result.rejected === 0;
    return result;
}

/**
 * Add an error to sync result
 */
export function addSyncError(result: SyncResult, id: string, error: string): void {
    result.rejected++;
    result.errors.push({ id, error });
}

/**
 * Mark record as skipped
 */
export function markSkipped(result: SyncResult): void {
    result.skipped++;
}

/**
 * Mark record as accepted
 */
export function markAccepted(result: SyncResult): void {
    result.accepted++;
}

/**
 * Type guard for sync record base
 */
export function isSyncRecordBase(record: unknown): record is SyncRecordBase {
    if (typeof record !== 'object' || record === null) return false;
    const obj = record as Record<string, unknown>;
    return typeof obj.id === 'string' && typeof obj.tenantId === 'string';
}

/**
 * Check if record is newer than existing based on updatedAt
 */
export function isNewerRecord(
    newRecord: { updatedAt?: Date | string | null },
    existing: { updatedAt?: Date | null }
): boolean {
    if (!newRecord.updatedAt) return false;
    const newDate = new Date(newRecord.updatedAt);
    const existingDate = existing.updatedAt ?? new Date(0);
    return newDate > existingDate;
}

/**
 * Safe error message extraction
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Unknown error';
}

/**
 * Generic record processor for sync operations
 * Handles common try/catch and result tracking patterns
 */
export async function processRecords<T extends SyncRecordWithId>(
    records: T[],
    processor: (record: T) => Promise<'accepted' | 'skipped' | { rejected: string }>
): Promise<SyncResult> {
    const result = createEmptySyncResult();

    for (const record of records) {
        try {
            const outcome = await processor(record);

            if (outcome === 'accepted') {
                markAccepted(result);
            } else if (outcome === 'skipped') {
                markSkipped(result);
            } else {
                addSyncError(result, record.id, outcome.rejected);
            }
        } catch (error) {
            addSyncError(result, record.id, getErrorMessage(error));
        }
    }

    return finalizeSyncResult(result);
}
