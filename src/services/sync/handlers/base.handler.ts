import type { SyncResult, SyncRecordBase } from '../types/sync.types';

type SyncRecordWithId = { id: string } & Record<string, unknown>;

// ==========================================
// Result helpers
// ==========================================

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

// ==========================================
// Type guards & utilities
// ==========================================

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

// ==========================================
// Record processing (single + batch)
// ==========================================

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

// ==========================================
// Batch helpers — eliminate N+1 queries
// ==========================================

/**
 * Find existing IDs from a set of record IDs in one query.
 * Returns a Set for O(1) lookup.
 *
 * @param model   - Prisma delegate (e.g. `prisma.sale`)
 * @param ids     - Array of primary key values to check
 * @param idField - Name of the primary key column (default `'id'`)
 */
export async function findExistingIds<T extends string = string>(
    model: { findMany: (args: any) => Promise<any[]> },
    ids: T[],
    idField = 'id'
): Promise<Set<T>> {
    if (ids.length === 0) return new Set();

    const existing = await model.findMany({
        where: { [idField]: { in: ids } },
        select: { [idField]: true },
    });

    return new Set(existing.map((r: Record<string, any>) => r[idField] as T));
}

/**
 * Partition records into "new" and "existing" based on a pre-fetched
 * set of existing IDs.
 */
export function partitionRecords<T extends Record<string, unknown>>(
    records: T[],
    existingIds: Set<string>,
    idField = 'id'
): { newRecords: T[]; existingRecords: T[] } {
    const newRecords: T[] = [];
    const existingRecords: T[] = [];

    for (const record of records) {
        if (existingIds.has(record[idField] as string)) {
            existingRecords.push(record);
        } else {
            newRecords.push(record);
        }
    }

    return { newRecords, existingRecords };
}

/**
 * Chunk an array into smaller arrays of a given max size.
 * Useful for batched createMany / updateMany to avoid DB payload limits.
 */
export function chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

/**
 * Safe batch insert using createMany with skipDuplicates.
 * Returns the count of successfully inserted records.
 */
export function normalizeRecordForCreateMany(record: Record<string, unknown>): Record<string, unknown> {
    const normalized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
        if (value === undefined) continue;

        if (value === null) {
            normalized[key] = null;
            continue;
        }

        if (Array.isArray(value)) {
            continue;
        }

        if (typeof value === 'object') {
            if (value instanceof Date) {
                normalized[key] = value;
                continue;
            }

            if (value && 'connect' in value) {
                continue;
            }

            if (value && 'create' in value) {
                continue;
            }

            continue;
        }

        normalized[key] = value;
    }

    return normalized;
}

export async function batchInsert(
    model: { createMany: (args: any) => Promise<{ count: number }> },
    records: Record<string, unknown>[],
    batchSize = 500
): Promise<number> {
    if (records.length === 0) return 0;

    let totalInserted = 0;

    for (const batch of chunk(records, batchSize)) {
        const normalizedBatch = batch.map((record) => normalizeRecordForCreateMany(record));
        const { count } = await model.createMany({
            data: normalizedBatch as any,
            skipDuplicates: true,
        });
        totalInserted += count;
    }

    return totalInserted;
}
