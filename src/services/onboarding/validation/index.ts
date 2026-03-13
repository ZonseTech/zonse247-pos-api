/**
 * Onboarding Validation Helpers
 * Request validation utilities for onboarding endpoints
 */

import { Request } from 'express';
import { ValidationError } from '../errors';
import { INITIAL_SYNC_TABLES, InitialSyncTable } from '../constants';
import { TenantBranchParams, OnboardingParams } from '../types';

// ==========================================
// Type Guards
// ==========================================

/**
 * Check if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if value is a valid array
 */
export function isValidArray<T>(value: unknown): value is T[] {
    return Array.isArray(value) && value.length >= 0;
}

/**
 * Check if value is a valid table name
 */
export function isValidTable(value: unknown): value is InitialSyncTable {
    return typeof value === 'string' && INITIAL_SYNC_TABLES.includes(value as InitialSyncTable);
}

// ==========================================
// Validation Functions
// ==========================================

/**
 * Validate tenant and branch IDs from request body
 */
export function validateTenantBranchParams(req: Request): TenantBranchParams {
    const { tenantId, branchId } = req.body;

    if (!isNonEmptyString(tenantId)) {
        throw ValidationError.missingField('tenantId');
    }

    if (!isNonEmptyString(branchId)) {
        throw ValidationError.missingField('branchId');
    }

    return { tenantId, branchId };
}

/**
 * Validate onboarding params (tenant, branch, terminal)
 */
export function validateOnboardingParams(req: Request): OnboardingParams {
    const params = validateTenantBranchParams(req);
    const { terminalId } = req.body;

    if (!isNonEmptyString(terminalId)) {
        throw ValidationError.missingField('terminalId');
    }

    return { ...params, terminalId };
}

/**
 * Validate required array field
 */
export function validateArrayField<T>(
    data: unknown,
    fieldName: string
): T[] {
    if (!isValidArray<T>(data)) {
        throw ValidationError.invalidArray(fieldName);
    }
    return data;
}

/**
 * Validate data object exists
 */
export function validateDataObject(data: unknown): Record<string, unknown[]> {
    if (!data || typeof data !== 'object') {
        throw new ValidationError('data object is required with master data tables');
    }
    return data as Record<string, unknown[]>;
}

/**
 * Validate table name
 */
export function validateTableName(table: unknown): InitialSyncTable {
    if (!table) {
        throw new ValidationError('table query parameter is required', 'table');
    }

    if (!isValidTable(table)) {
        throw ValidationError.invalidTable(table as string, [...INITIAL_SYNC_TABLES]);
    }

    return table as InitialSyncTable;
}

/**
 * Validate list of table names
 */
export function validateTableList(tables: unknown): InitialSyncTable[] | undefined {
    if (!tables) return undefined;

    if (!Array.isArray(tables)) {
        throw new ValidationError('tables must be an array', 'tables');
    }

    const invalidTables = tables.filter(t => !isValidTable(t));
    if (invalidTables.length > 0) {
        throw new ValidationError(
            `Invalid tables: ${invalidTables.join(', ')}`,
            'tables'
        );
    }

    return tables as InitialSyncTable[];
}

/**
 * Validate step type for onboarding
 */
export function validateStepType(stepType: unknown): string {
    if (!isNonEmptyString(stepType)) {
        throw ValidationError.missingField('stepType');
    }
    return stepType;
}

/**
 * Validate terminal save data
 */
export function validateTerminalSaveData(data: unknown): {
    terminalId: string;
    tenantId: string;
    branchId: string;
    tenant: unknown;
    branch: unknown;
    [key: string]: unknown;
} {
    if (!data || typeof data !== 'object') {
        throw new ValidationError('Terminal data is required');
    }

    const body = data as Record<string, unknown>;

    if (!isNonEmptyString(body.terminalId)) {
        throw ValidationError.missingField('terminalId');
    }

    if (!isNonEmptyString(body.tenantId)) {
        throw ValidationError.missingField('tenantId');
    }

    if (!isNonEmptyString(body.branchId)) {
        throw ValidationError.missingField('branchId');
    }

    if (!body.tenant) {
        throw new ValidationError('tenant data is required');
    }

    if (!body.branch) {
        throw new ValidationError('branch data is required');
    }

    return body as {
        terminalId: string;
        tenantId: string;
        branchId: string;
        tenant: unknown;
        branch: unknown;
        [key: string]: unknown;
    };
}

/**
 * Validate activation code
 */
export function validateActivationCode(code: unknown): string {
    if (!isNonEmptyString(code)) {
        throw new ValidationError('Activation code is required', 'activationCode');
    }
    return code;
}

// ==========================================
// Parse Query Parameters
// ==========================================

/**
 * Parse pagination query parameters
 */
export function parsePaginationParams(req: Request): {
    cursor?: string;
    limit: number;
    since?: string;
} {
    const cursor = req.query.cursor as string | undefined;
    const limit = parseInt(req.query.limit as string) || 500;
    const since = req.query.since as string | undefined;

    return { cursor, limit, since };
}

/**
 * Parse optional tenant/branch params (for tables without scope)
 */
export function parseOptionalTenantBranchParams(req: Request): TenantBranchParams {
    const { tenantId, branchId } = req.body;
    return {
        tenantId: tenantId || '',
        branchId: branchId || '',
    };
}
