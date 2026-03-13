/**
 * Initial Sync Service
 * Handles initial master data sync from cloud to local Electron app
 * Uses table-sync-configs for individual table sync operations
 */

import type { OnboardingStepType } from 'on-boarding';
import {
    OnboardingParams,
    InitialSyncResult,
    TableSyncResult
} from './types';
import {
    INITIAL_SYNC_TABLES,
    STEP_TO_TABLES_MAP,
    InitialSyncTable
} from './constants';
import { syncTable } from './table-sync-configs';
import { calculateSummary, createEmptyTableSyncResult } from './base-sync.service';
import { getErrorMessage } from './errors';

// Re-export for backward compatibility
export { INITIAL_SYNC_TABLES, STEP_TO_TABLES_MAP };
export type { InitialSyncTable };

// Legacy type alias for backward compatibility
export type InitialSyncParams = OnboardingParams;

/**
 * @class   InitialSyncService
 * @desc    Handles initial master data sync from cloud to local Electron app
 *          Used during onboarding after terminal activation
 */
export class InitialSyncService {
    /**
     * Sync all master data from cloud server for initial sync
     * Processes tables in dependency order (parent tables first)
     * 
     * @param params - Tenant, branch, and terminal identifiers
     * @param data - Master data organized by table name
     * @returns Sync result with statistics for each table
     */
    static async syncMasterData(
        params: OnboardingParams,
        data: Record<string, unknown[]>
    ): Promise<InitialSyncResult> {
        const tableResults: TableSyncResult[] = [];
        const errors: string[] = [];

        for (const table of INITIAL_SYNC_TABLES) {
            const records = data[table];

            if (!records || !Array.isArray(records) || records.length === 0) {
                continue;
            }

            try {
                const tableResult = await syncTable(table, records, params);
                tableResults.push(tableResult);

                if (tableResult.errors.length > 0) {
                    errors.push(...tableResult.errors);
                }
            } catch (error) {
                const errorResult = createEmptyTableSyncResult(table);
                errorResult.success = false;
                errorResult.failed = records.length;
                errorResult.errors.push(`${table}: ${getErrorMessage(error)}`);
                tableResults.push(errorResult);
                errors.push(errorResult.errors[0]);
            }
        }

        const summary = calculateSummary(tableResults);

        return {
            success: summary.failedTables === 0 && summary.failedRecords === 0,
            tables: tableResults,
            summary,
            errors,
            completedAt: new Date(),
        };
    }

    /**
     * Sync tables for a specific onboarding step
     * Maps step type to its associated tables and syncs only those
     * 
     * @param stepType - The onboarding step type (e.g., 'PRODUCTS_SYNC')
     * @param params - Tenant, branch, and terminal identifiers
     * @param data - Master data organized by table name
     * @returns Sync result with statistics for synced tables
     */
    static async syncStepTables(
        stepType: OnboardingStepType,
        params: OnboardingParams,
        data: Record<string, unknown[]>
    ): Promise<InitialSyncResult> {
        const tablesToSync = STEP_TO_TABLES_MAP[stepType] || [];

        // Filter data to only include tables for this step
        const filteredData: Record<string, unknown[]> = {};
        for (const table of tablesToSync) {
            if (data[table]) {
                filteredData[table] = data[table];
            }
        }

        return this.syncMasterData(params, filteredData);
    }

    /**
     * Get list of tables that need to be synced for initial data load
     * Tables are listed in dependency order
     */
    static getTables(): readonly string[] {
        return INITIAL_SYNC_TABLES;
    }

    /**
     * Get tables associated with a specific onboarding step
     */
    static getStepTables(stepType: OnboardingStepType): string[] {
        return STEP_TO_TABLES_MAP[stepType] || [];
    }
}
