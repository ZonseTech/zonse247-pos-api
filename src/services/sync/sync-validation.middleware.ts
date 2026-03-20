/**
 * Sync Validation Middleware
 *
 * Validates incoming sync request payloads before they reach the handlers.
 * Catches malformed data early, reducing wasted DB round-trips.
 */

import { Request, Response, NextFunction } from 'express';

const MAX_BATCH_SIZE = 5000;
const MAX_RECORDS_PER_TABLE = 2000;

/**
 * Validate batch sync payload — ensures each table's data
 * is an array (or absent) and doesn't exceed size limits.
 */
export function validateBatchSync(req: Request, res: Response, next: NextFunction): void {
    const body = req.body;

    if (!body || typeof body !== 'object') {
        res.status(400).json({ success: false, message: 'Request body is required' });
        return;
    }

    const tableLikeFields = [
        'sales', 'saleItems', 'salePayments', 'returns', 'returnItems',
        'stockMovements', 'customers', 'orders', 'users',
    ];

    let totalRecords = 0;

    for (const field of tableLikeFields) {
        const value = body[field];

        if (value === undefined || value === null) continue;

        if (!Array.isArray(value)) {
            res.status(400).json({
                success: false,
                message: `Field "${field}" must be an array`,
            });
            return;
        }

        if (value.length > MAX_RECORDS_PER_TABLE) {
            res.status(400).json({
                success: false,
                message: `Field "${field}" exceeds max ${MAX_RECORDS_PER_TABLE} records per table`,
            });
            return;
        }

        totalRecords += value.length;
    }

    if (totalRecords > MAX_BATCH_SIZE) {
        res.status(400).json({
            success: false,
            message: `Total records (${totalRecords}) exceeds max batch size of ${MAX_BATCH_SIZE}`,
        });
        return;
    }

    next();
}

/**
 * Validate individual table sync payload — ensures records array exists.
 */
export function validateTableSync(req: Request, res: Response, next: NextFunction): void {
    const { records } = req.body;

    if (!records || !Array.isArray(records)) {
        res.status(400).json({
            success: false,
            message: 'Records array is required',
        });
        return;
    }

    if (records.length > MAX_RECORDS_PER_TABLE) {
        res.status(400).json({
            success: false,
            message: `Records array exceeds max ${MAX_RECORDS_PER_TABLE} records`,
        });
        return;
    }

    next();
}

/**
 * Validate pull request — ensures required IDs are present.
 */
export function validatePullRequest(req: Request, res: Response, next: NextFunction): void {
    const terminalId = req.headers['x-terminal-id'] as string || req.body.terminalId;
    const tenantId = req.headers['x-tenant-id'] as string || req.body.tenantId;
    const branchId = req.headers['x-branch-id'] as string || req.body.branchId;

    if (!terminalId || !tenantId || !branchId) {
        res.status(400).json({
            success: false,
            message: 'Terminal ID, Tenant ID, and Branch ID are required',
        });
        return;
    }

    next();
}

/**
 * Validate bidirectional sync payload.
 */
export function validateBidirectionalSync(req: Request, res: Response, next: NextFunction): void {
    const terminalId = req.headers['x-terminal-id'] as string || req.body.terminalId;
    const tenantId = req.headers['x-tenant-id'] as string || req.body.tenantId;
    const branchId = req.headers['x-branch-id'] as string || req.body.branchId;

    if (!terminalId || !tenantId || !branchId) {
        res.status(400).json({
            success: false,
            message: 'Terminal ID, Tenant ID, and Branch ID are required',
        });
        return;
    }

    // Validate push data if present
    if (req.body.push && typeof req.body.push === 'object') {
        const push = req.body.push;
        const tableLikeFields = [
            'sales', 'saleItems', 'salePayments', 'returns', 'returnItems',
            'stockMovements', 'customers', 'orders', 'users',
        ];

        for (const field of tableLikeFields) {
            if (push[field] && !Array.isArray(push[field])) {
                res.status(400).json({
                    success: false,
                    message: `push.${field} must be an array`,
                });
                return;
            }
        }
    }

    next();
}
