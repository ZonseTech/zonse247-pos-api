/**
 * Terminal Sync State Service
 *
 * Manages per-terminal sync state using the TerminalSyncState table.
 * This replaces storing everything on Terminal.lastSyncAt, giving us:
 *
 * - Separate push / pull timestamps (no cross-contamination)
 * - Per-terminal sequence tracking for ChangeLog-based delta sync
 * - Clean audit trail of sync activity
 */

import prisma from '../../databases/prisma/client';
import { LOG_PREFIX } from './constants/sync.constants';

export interface SyncStateSnapshot {
    lastPulledAt: Date | null;
    lastPushedAt: Date | null;
    lastSequence: bigint | null;
}

/**
 * Get or create the TerminalSyncState for a given terminal.
 */
export async function getOrCreateSyncState(
    terminalId: string,
    tenantId: string,
    branchId: string
): Promise<SyncStateSnapshot> {
    try {
        const state = await prisma.terminalSyncState.upsert({
            where: {
                unique_terminal_sync: { tenantId, branchId, terminalId },
            },
            update: {}, // no-op if exists
            create: {
                terminalId,
                tenantId,
                branchId,
                lastPulledAt: null,
                lastPushedAt: null,
                lastSequence: null,
            },
            select: {
                lastPulledAt: true,
                lastPushedAt: true,
                lastSequence: true,
            },
        });

        return {
            lastPulledAt: state.lastPulledAt,
            lastPushedAt: state.lastPushedAt,
            lastSequence: state.lastSequence,
        };
    } catch (error) {
        console.error(`${LOG_PREFIX.RECEIVER} Failed to get/create sync state:`, error);
        return { lastPulledAt: null, lastPushedAt: null, lastSequence: null };
    }
}

/**
 * Update the push timestamp after a successful push cycle.
 */
export async function updatePushTimestamp(
    terminalId: string,
    tenantId: string,
    branchId: string,
    timestamp: Date
): Promise<void> {
    try {
        await prisma.terminalSyncState.upsert({
            where: {
                unique_terminal_sync: { tenantId, branchId, terminalId },
            },
            update: { lastPushedAt: timestamp },
            create: {
                terminalId,
                tenantId,
                branchId,
                lastPushedAt: timestamp,
            },
        });
    } catch (error) {
        console.error(`${LOG_PREFIX.RECEIVER} Failed to update push timestamp:`, error);
    }
}

/**
 * Update the pull timestamp and last sequence after a successful pull cycle.
 */
export async function updatePullState(
    terminalId: string,
    tenantId: string,
    branchId: string,
    timestamp: Date,
    lastSequence?: bigint | null
): Promise<void> {
    try {
        const updateData: Record<string, unknown> = { lastPulledAt: timestamp };
        if (lastSequence !== undefined && lastSequence !== null) {
            updateData.lastSequence = lastSequence;
        }

        await prisma.terminalSyncState.upsert({
            where: {
                unique_terminal_sync: { tenantId, branchId, terminalId },
            },
            update: updateData,
            create: {
                terminalId,
                tenantId,
                branchId,
                lastPulledAt: timestamp,
                lastSequence: lastSequence ?? null,
            },
        });
    } catch (error) {
        console.error(`${LOG_PREFIX.RECEIVER} Failed to update pull state:`, error);
    }
}

/**
 * Reset sync state for a terminal (e.g. for forced re-sync).
 */
export async function resetSyncState(
    terminalId: string,
    tenantId: string,
    branchId: string
): Promise<void> {
    try {
        await prisma.terminalSyncState.updateMany({
            where: { terminalId, tenantId, branchId },
            data: {
                lastPulledAt: null,
                lastPushedAt: null,
                lastSequence: null,
            },
        });
    } catch (error) {
        console.error(`${LOG_PREFIX.RECEIVER} Failed to reset sync state:`, error);
    }
}
