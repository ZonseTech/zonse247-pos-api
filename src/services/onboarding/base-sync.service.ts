/**
 * Base Sync Service
 * Abstract base class implementing common sync patterns
 * Uses "exists-skip" pattern for idempotent operations
 */

import prisma from '../../databases/prisma/client';
import { SyncResult, SyncSummary, TableSyncResult, OnboardingParams } from './types';
import { getErrorMessage } from './errors';
import { InitialSyncTable, TABLE_ID_FIELDS } from './constants';

// ==========================================
// Generic Sync Operations
// ==========================================

/**
 * Generic sync configuration for a single record
 */
export interface RecordSyncConfig<TInput, TOutput> {
    /** Extract the unique identifier from input record */
    getId: (record: TInput) => string | undefined;
    /** Check if record already exists */
    findExisting: (id: string) => Promise<TOutput | null>;
    /** Transform input to create data */
    transformForCreate: (record: TInput, params?: OnboardingParams) => unknown;
    /** Create the record */
    create: (data: unknown) => Promise<TOutput>;
    /** Entity name for error messages */
    entityName: string;
}

/**
 * Create an empty sync result
 */
export function createEmptySyncResult<T>(): SyncResult<T> {
    return {
        saved: [],
        skipped: [],
        failed: [],
        summary: { total: 0, saved: 0, skipped: 0, failed: 0 },
    };
}

/**
 * Create an empty table sync result
 */
export function createEmptyTableSyncResult(table: string): TableSyncResult {
    return {
        table,
        success: true,
        inserted: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: [],
    };
}

/**
 * Generic sync function using the "exists-skip" pattern
 * Processes records sequentially to avoid race conditions
 */
export async function syncRecords<TInput, TOutput>(
    records: TInput[],
    config: RecordSyncConfig<TInput, TOutput>,
    params?: OnboardingParams
): Promise<SyncResult<TOutput>> {
    const result = createEmptySyncResult<TOutput>();
    result.summary.total = records.length;

    for (const record of records) {
        try {
            const id = config.getId(record);

            if (!id) {
                result.failed.push({
                    data: record as unknown as TOutput,
                    error: `${config.entityName} missing required ID field`,
                });
                result.summary.failed++;
                continue;
            }

            const existing = await config.findExisting(id);

            if (existing) {
                result.skipped.push(existing);
                result.summary.skipped++;
            } else {
                const createData = config.transformForCreate(record, params);
                const saved = await config.create(createData);
                result.saved.push(saved);
                result.summary.saved++;
            }
        } catch (error) {
            result.failed.push({
                data: record as unknown as TOutput,
                error: getErrorMessage(error),
            });
            result.summary.failed++;
        }
    }

    return result;
}

/**
 * Sync function that returns TableSyncResult format
 * Used by InitialSyncService
 */
export async function syncTableRecords<TInput>(
    records: TInput[],
    config: {
        getId: (record: TInput) => string | undefined;
        findExisting: (id: string) => Promise<unknown | null>;
        transformForCreate: (record: TInput, params?: OnboardingParams) => unknown;
        create: (data: unknown) => Promise<unknown>;
    },
    tableName: string,
    params?: OnboardingParams
): Promise<TableSyncResult> {
    const result = createEmptyTableSyncResult(tableName);

    for (const record of records) {
        try {
            const id = config.getId(record);

            if (!id) {
                result.failed++;
                result.errors.push(`${tableName}: Missing required ID field`);
                continue;
            }

            const existing = await config.findExisting(id);

            if (existing) {
                result.skipped++;
            } else {
                const createData = config.transformForCreate(record, params);
                await config.create(createData);
                result.inserted++;
            }
        } catch (error) {
            result.failed++;
            result.errors.push(`${tableName}: ${getErrorMessage(error)}`);
        }
    }

    result.success = result.failed === 0;
    return result;
}

// ==========================================
// Prisma Model Helpers
// ==========================================

/**
 * Get Prisma model by table name
 */
export function getPrismaModel(table: InitialSyncTable) {
    const modelMap: Record<InitialSyncTable, unknown> = {
        districts: prisma.district,
        roles: prisma.role,
        permissions: prisma.permission,
        rolePermissions: prisma.rolePermission,
        subscriptionPlans: prisma.subscriptionPlan,
        planFeatures: prisma.planFeature,
        paymentMethods: prisma.paymentMethod,
        paymentServiceProviders: prisma.paymentServiceProvider,
        categories: prisma.category,
        suppliers: prisma.supplier,
        customers: prisma.customer,
        products: prisma.product,
        productVariants: prisma.productVariant,
        productBarcodes: prisma.productBarcode,
        variantBarcodes: prisma.variantBarcode,
        inventory: prisma.inventory,
        users: prisma.user,
    };

    return modelMap[table];
}

/**
 * Get primary key field for a table
 */
export function getIdField(table: InitialSyncTable): string {
    return TABLE_ID_FIELDS[table] || 'id';
}

// ==========================================
// Data Transformation Utilities
// ==========================================

/**
 * Clean up relation objects from data before passing to Prisma
 * Removes nested objects that shouldn't be passed to create
 */
export function stripRelations<T extends Record<string, unknown>>(
    data: T,
    relationFields: string[]
): Omit<T, typeof relationFields[number]> {
    const cleaned = { ...data };
    for (const field of relationFields) {
        delete cleaned[field];
    }
    return cleaned;
}

/**
 * Parse numeric value safely
 */
export function parseNumeric(value: unknown, defaultValue = 0): number {
    if (value === null || value === undefined) return defaultValue;
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse boolean value safely with default
 */
export function parseBoolean(value: unknown, defaultValue = false): boolean {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return defaultValue;
}

/**
 * Parse date value safely
 */
export function parseDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    const date = new Date(value as string);
    return isNaN(date.getTime()) ? null : date;
}

/**
 * Get display name from snake_case or camelCase name
 */
export function toDisplayName(name: string): string {
    return name
        .split(/[_\s]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// ==========================================
// Summary Helpers
// ==========================================

/**
 * Calculate summary from individual table results
 */
export function calculateSummary(tableResults: TableSyncResult[]): {
    totalTables: number;
    successfulTables: number;
    failedTables: number;
    totalRecords: number;
    insertedRecords: number;
    skippedRecords: number;
    failedRecords: number;
} {
    return tableResults.reduce(
        (acc, result) => ({
            totalTables: acc.totalTables + 1,
            successfulTables: acc.successfulTables + (result.success ? 1 : 0),
            failedTables: acc.failedTables + (result.success ? 0 : 1),
            totalRecords: acc.totalRecords + result.inserted + result.skipped + result.failed,
            insertedRecords: acc.insertedRecords + result.inserted,
            skippedRecords: acc.skippedRecords + result.skipped,
            failedRecords: acc.failedRecords + result.failed,
        }),
        {
            totalTables: 0,
            successfulTables: 0,
            failedTables: 0,
            totalRecords: 0,
            insertedRecords: 0,
            skippedRecords: 0,
            failedRecords: 0,
        }
    );
}

/**
 * Format sync summary message
 */
export function formatSyncSummaryMessage(
    summary: SyncSummary,
    entityName: string
): string {
    return `${entityName} sync completed. Saved: ${summary.saved}, Skipped: ${summary.skipped}, Failed: ${summary.failed}`;
}
