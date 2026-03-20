/**
 * Change Log Service
 *
 * Records data mutations into the `change_log` table for efficient delta sync.
 *
 * Instead of having terminals scan entire tables with `WHERE updatedAt > X`,
 * the server records every INSERT/UPDATE/DELETE here, and terminals can
 * pull only the specific records that changed via sequence-based cursors.
 *
 * USAGE:
 * ------
 * Call `recordChange()` or `recordChanges()` after any mutation that
 * should be visible to offline terminals. This is typically done in:
 *
 *   - Product / Category / Inventory / PaymentMethod CRUD services
 *   - Customer updates from the web dashboard
 *   - User management (role changes, password resets)
 *   - Stock adjustments from the server
 *
 * The sync push handlers (sales, returns, etc.) do NOT need to record
 * changes because those records originated from terminals and will be
 * visible via the terminal's own push timestamp.
 *
 * PERFORMANCE:
 * -----------
 * - Uses createMany for batch operations (single round-trip)
 * - Async fire-and-forget option for non-critical paths
 * - Auto-cleanup of old entries (configurable retention)
 */

import prisma from '../../databases/prisma/client';
import { DATABASE_OFFLINE_MODE } from '../../config/db';
import { LOG_PREFIX } from './constants/sync.constants';

export type ChangeOperation = 'INSERT' | 'UPDATE' | 'DELETE';

export interface ChangeEntry {
    tableName: string;
    recordId: string;
    operation: ChangeOperation;
    tenantId: string;
    branchId: string;
    version?: number;
    terminalId?: string | null;
    userId?: string | null;
    payload?: Record<string, unknown> | null;
}

/**
 * Record a single data change for delta sync.
 * No-op when running in offline/SQLite mode (terminals don't need a local change log).
 */
export async function recordChange(entry: ChangeEntry): Promise<void> {
    if (DATABASE_OFFLINE_MODE) return;

    try {
        await prisma.changeLog.create({
            data: {
                tableName: entry.tableName,
                recordId: entry.recordId,
                operation: entry.operation,
                tenantId: entry.tenantId,
                branchId: entry.branchId,
                version: entry.version ?? 1,
                terminalId: entry.terminalId ?? null,
                userId: entry.userId ?? null,
                payload: entry.payload ?? undefined,
            },
        });
    } catch (error) {
        // Non-critical — log but don't throw
        console.error(`${LOG_PREFIX.RECEIVER} Failed to record change:`, error);
    }
}

/**
 * Record multiple changes in a single DB round-trip.
 * No-op when running in offline/SQLite mode.
 */
export async function recordChanges(entries: ChangeEntry[]): Promise<void> {
    if (DATABASE_OFFLINE_MODE || entries.length === 0) return;

    try {
        await prisma.changeLog.createMany({
            data: entries.map((e) => ({
                tableName: e.tableName,
                recordId: e.recordId,
                operation: e.operation,
                tenantId: e.tenantId,
                branchId: e.branchId,
                version: e.version ?? 1,
                terminalId: e.terminalId ?? null,
                userId: e.userId ?? null,
                payload: e.payload ?? undefined,
            })),
        });
    } catch (error) {
        console.error(`${LOG_PREFIX.RECEIVER} Failed to record batch changes:`, error);
    }
}

/**
 * Fire-and-forget variant — does not await the DB write.
 * Use when the change log is non-critical and you don't want to
 * add latency to the main request path.
 */
export function recordChangeAsync(entry: ChangeEntry): void {
    recordChange(entry).catch(() => { /* swallowed */ });
}

/**
 * Fire-and-forget batch variant.
 */
export function recordChangesAsync(entries: ChangeEntry[]): void {
    recordChanges(entries).catch(() => { /* swallowed */ });
}

/**
 * Clean up old change log entries.
 * Call this on a schedule (e.g. daily cron job).
 *
 * @param retentionDays - Number of days to keep (default: 30)
 * @returns Number of deleted entries
 */
export async function purgeOldChangeLogs(retentionDays = 30): Promise<number> {
    if (DATABASE_OFFLINE_MODE) return 0;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    try {
        const { count } = await prisma.changeLog.deleteMany({
            where: { createdAt: { lt: cutoff } },
        });

        if (count > 0) {
            console.log(`${LOG_PREFIX.RECEIVER} Purged ${count} old change log entries`);
        }

        return count;
    } catch (error) {
        console.error(`${LOG_PREFIX.RECEIVER} Failed to purge change logs:`, error);
        return 0;
    }
}

/**
 * Get the latest sequence number (highest ChangeLog ID).
 * Useful for initial sync state creation.
 */
export async function getLatestSequence(): Promise<bigint | null> {
    if (DATABASE_OFFLINE_MODE) return null;

    try {
        const latest = await prisma.changeLog.findFirst({
            orderBy: { id: 'desc' },
            select: { id: true },
        });

        return latest?.id ?? null;
    } catch {
        return null;
    }
}
