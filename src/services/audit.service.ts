import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../databases/prisma/client';
import { getEffectiveBranchId } from '../lib/express.type';

// ─── Types ─────────────────────────────────────────────────────────

/**
 * Action types for audit log entries.
 * Matches the AuditLogActionType enum in the Prisma schema.
 */
export type AuditActionType =
    | 'create' | 'update' | 'delete'
    | 'login' | 'logout' | 'access'
    | 'export' | 'import' | 'backup' | 'sync'
    | 'approve' | 'reject' | 'send' | 'receive'
    | 'post' | 'verify' | 'cancel' | 'void' | 'dispute' | 'pay';

export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Context extracted from the HTTP request.
 * Use `getAuditContext(req)` to build this automatically.
 */
export interface AuditContext {
    tenantId?: string;
    branchId?: string;
    userId?: string;
    terminalId?: string;
    ipAddress?: string;
    userAgent?: string;
    requestMethod?: string;
    requestUrl?: string;
}

/**
 * Describes the audit entry to record.
 */
export interface AuditEntry {
    actionType: AuditActionType;
    entityType: string;
    entityId?: string;
    entityName?: string;
    description: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    severity?: AuditSeverity;
}

// ─── Helper: Extract audit context from req ────────────────────────

/**
 * Builds an AuditContext from an Express request.
 * Works with both authenticated (`req.auth`) and unauthenticated requests.
 *
 * @example
 * ```ts
 * const ctx = getAuditContext(req);
 * await AuditService.logCreate(ctx, 'Customer', customer.customerId, customer.name, customer);
 * ```
 */
export function getAuditContext(req: any): AuditContext {
    const auth = req?.auth;

    return {
        tenantId: auth?.tenantId || (req as any).verifiedMetadata?.tenantId || undefined,
        branchId: auth ? getEffectiveBranchId(auth) : (req as any).verifiedMetadata?.branchId || undefined,
        userId: auth?.userId || undefined,
        terminalId: auth?.terminalId || (req as any).verifiedMetadata?.terminalId || undefined,
        ipAddress: req.ip || req.socket?.remoteAddress || undefined,
        userAgent: req.get?.('user-agent') || undefined,
        requestMethod: req.method || undefined,
        requestUrl: req.originalUrl || req.url || undefined,
    };
}

// ─── Helper: Auto-generate changes summary ────────────────────────

function buildChangesSummary(
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>
): string | null {
    if (!oldValues || !newValues) return null;

    const changes: string[] = [];
    const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);

    for (const key of allKeys) {
        const oldVal = oldValues[key];
        const newVal = newValues[key];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changes.push(`${key}: ${truncate(oldVal)} → ${truncate(newVal)}`);
        }
    }

    return changes.length > 0 ? changes.join('; ') : null;
}

function truncate(val: unknown, maxLen = 80): string {
    if (val === null || val === undefined) return 'null';
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

// ─── Service ───────────────────────────────────────────────────────

export class AuditService {

    /**
     * Write a general-purpose audit log entry.
     *
     * Fail-safe: errors are logged to console but NEVER propagated,
     * so audit logging never breaks the parent operation.
     *
     * Supports optional Prisma transaction client (`tx`).
     */
    static async log(
        ctx: AuditContext,
        entry: AuditEntry,
        tx?: any
    ): Promise<void> {
        const db = tx || prisma;

        try {
            await db.auditLog.create({
                data: {
                    logId: uuidv4(),
                    tenantId: ctx.tenantId || null,
                    branchId: ctx.branchId || null,
                    userId: ctx.userId || null,
                    terminalId: ctx.terminalId || null,
                    actionType: entry.actionType as any,
                    entityType: entry.entityType,
                    entityId: entry.entityId || null,
                    entityName: entry.entityName || null,
                    description: entry.description,
                    oldValues: entry.oldValues
                        ? JSON.parse(JSON.stringify(entry.oldValues))
                        : null,
                    newValues: entry.newValues
                        ? JSON.parse(JSON.stringify(entry.newValues))
                        : null,
                    changesSummary: buildChangesSummary(entry.oldValues, entry.newValues),
                    severity: entry.severity || 'low',
                    ipAddress: ctx.ipAddress || null,
                    userAgent: ctx.userAgent || null,
                    requestMethod: ctx.requestMethod || null,
                    requestUrl: ctx.requestUrl || null,
                },
            });
        } catch (error) {
            // Never break the parent operation.
            console.error('[AuditService] Failed to write audit log:', error);
        }
    }

    // ─── Convenience Methods ───────────────────────────────────────

    /**
     * Log a CREATE action.
     */
    static async logCreate(
        ctx: AuditContext,
        entityType: string,
        entityId: string,
        entityName: string,
        newValues?: Record<string, unknown>,
        tx?: any
    ): Promise<void> {
        await this.log(ctx, {
            actionType: 'create',
            entityType,
            entityId,
            entityName,
            description: `Created ${entityType} "${entityName}"`,
            newValues,
            severity: 'low',
        }, tx);
    }

    /**
     * Log an UPDATE action.
     * Provide oldValues and newValues to auto-generate a changesSummary.
     */
    static async logUpdate(
        ctx: AuditContext,
        entityType: string,
        entityId: string,
        entityName: string,
        oldValues?: Record<string, unknown>,
        newValues?: Record<string, unknown>,
        tx?: any
    ): Promise<void> {
        await this.log(ctx, {
            actionType: 'update',
            entityType,
            entityId,
            entityName,
            description: `Updated ${entityType} "${entityName}"`,
            oldValues,
            newValues,
            severity: 'low',
        }, tx);
    }

    /**
     * Log a DELETE action.
     */
    static async logDelete(
        ctx: AuditContext,
        entityType: string,
        entityId: string,
        entityName: string,
        oldValues?: Record<string, unknown>,
        tx?: any
    ): Promise<void> {
        await this.log(ctx, {
            actionType: 'delete',
            entityType,
            entityId,
            entityName,
            description: `Deleted ${entityType} "${entityName}"`,
            oldValues,
            severity: 'medium',
        }, tx);
    }

    /**
     * Log a status change (approve, reject, cancel, void, etc.).
     */
    static async logStatusChange(
        ctx: AuditContext,
        actionType: AuditActionType,
        entityType: string,
        entityId: string,
        entityName: string,
        oldStatus: string,
        newStatus: string,
        additionalData?: Record<string, unknown>,
        tx?: any
    ): Promise<void> {
        await this.log(ctx, {
            actionType,
            entityType,
            entityId,
            entityName,
            description: `${capitalize(actionType)} ${entityType} "${entityName}": ${oldStatus} → ${newStatus}`,
            oldValues: { status: oldStatus },
            newValues: { status: newStatus, ...additionalData },
            severity: this.getSeverity(actionType),
        }, tx);
    }

    /**
     * Log an authentication event (login, logout, switchBranch, etc.).
     */
    static async logAuth(
        ctx: AuditContext,
        actionType: 'login' | 'logout' | 'access',
        description: string,
        additionalData?: Record<string, unknown>,
        tx?: any
    ): Promise<void> {
        await this.log(ctx, {
            actionType,
            entityType: 'Auth',
            entityId: ctx.userId || undefined,
            description,
            newValues: additionalData,
            severity: actionType === 'login' || actionType === 'logout' ? 'medium' : 'low',
        }, tx);
    }

    /**
     * Log a bulk operation.
     */
    static async logBulk(
        ctx: AuditContext,
        actionType: AuditActionType,
        entityType: string,
        count: number,
        description?: string,
        tx?: any
    ): Promise<void> {
        await this.log(ctx, {
            actionType,
            entityType,
            description: description || `Bulk ${actionType} on ${count} ${entityType} record(s)`,
            newValues: { count },
            severity: 'medium',
        }, tx);
    }

    // ─── Helpers ───────────────────────────────────────────────────

    private static getSeverity(actionType: AuditActionType): AuditSeverity {
        switch (actionType) {
            case 'delete':
            case 'void':
            case 'pay':
                return 'high';
            case 'approve':
            case 'reject':
            case 'cancel':
            case 'dispute':
            case 'post':
                return 'medium';
            default:
                return 'low';
        }
    }
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
