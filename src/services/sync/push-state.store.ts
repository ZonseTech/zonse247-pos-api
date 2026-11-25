/**
 * Push State Store
 *
 * Persists, per terminal, where each table's push has got to and which
 * records the server rejected, in the db_meta key/value table (present on
 * every terminal database, so no schema migration is needed).
 *
 *   cursors  — per table: the order-field value (ISO) up to which every
 *              record has been sent. The next push fetches records after it.
 *   retry    — per table: records the server rejected. They are resent at
 *              the start of every push cycle until accepted, without holding
 *              back newer records.
 */
import prisma from '../../databases/prisma/client';
import type { PushTableName } from './types/sync.types';
import { LOG_PREFIX } from './constants/sync.constants';

export interface RetryEntry {
    id: string;
    record: Record<string, unknown>;
    attempts: number;
    lastError: string;
    firstRejectedAt: string;
}

export interface PushState {
    cursors: Partial<Record<PushTableName, string>>;
    retry: Partial<Record<PushTableName, RetryEntry[]>>;
}

const stateKey = (terminalId: string) => `sync_push_state:${terminalId}`;

export function emptyPushState(): PushState {
    return { cursors: {}, retry: {} };
}

export async function loadPushState(terminalId: string): Promise<PushState | null> {
    try {
        const rows = (await prisma.$queryRawUnsafe(
            'SELECT `value` FROM db_meta WHERE `key` = ?',
            stateKey(terminalId)
        )) as Array<{ value: string }>;
        if (!rows?.[0]?.value) return null;
        const parsed = JSON.parse(rows[0].value);
        return { cursors: parsed.cursors ?? {}, retry: parsed.retry ?? {} };
    } catch (error) {
        console.warn(`${LOG_PREFIX.JOB} Could not read push state, starting from terminal timestamp:`, error);
        return null;
    }
}

export async function savePushState(terminalId: string, state: PushState): Promise<void> {
    try {
        await prisma.$executeRawUnsafe(
            'REPLACE INTO db_meta (`key`, `value`, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
            stateKey(terminalId),
            JSON.stringify(state)
        );
    } catch (error) {
        console.error(`${LOG_PREFIX.JOB} Failed to save push state:`, error);
    }
}

export async function clearPushState(terminalId: string): Promise<void> {
    try {
        await prisma.$executeRawUnsafe('DELETE FROM db_meta WHERE `key` = ?', stateKey(terminalId));
    } catch (error) {
        console.error(`${LOG_PREFIX.JOB} Failed to clear push state:`, error);
    }
}
