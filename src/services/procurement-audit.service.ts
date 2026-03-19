import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../databases/prisma/client';

// ─── Types ─────────────────────────────────────────────────────────

/**
 * Local type alias — generated client not regenerated, so enum values
 * for new procurement actions are declared here.
 */
type AuditActionType =
    | 'create' | 'update' | 'delete'
    | 'approve' | 'reject' | 'send' | 'receive'
    | 'post' | 'verify' | 'cancel' | 'void' | 'dispute' | 'pay'
    | 'ship' | 'complete';

type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Entity types used in procurement audit entries.
 */
type ProcurementEntityType =
    | 'PurchaseRequisition'
    | 'PurchaseOrder'
    | 'GoodsReceipt'
    | 'SupplierInvoice'
    | 'SupplierPayment'
    | 'SupplierReturn'
    | 'SupplierCreditNote';

/**
 * Context provided by the caller (controller/service layer).
 */
export interface AuditContext {
    tenantId: string;
    branchId: string;
    userId: string;
    terminalId?: string;
}

/**
 * Full audit entry input.
 */
export interface AuditEntry {
    actionType: AuditActionType;
    entityType: ProcurementEntityType;
    entityId: string;
    entityName?: string;
    description: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    severity?: AuditSeverity;
}

// ─── Service ───────────────────────────────────────────────────────

export class ProcurementAuditService {
    /**
     * Write an audit log entry.
     *
     * Can be called with an optional Prisma transaction client (`tx`).
     * When provided, the audit entry is part of the same transaction —
     * if the parent operation rolls back, the audit entry rolls back too.
     *
     * When called without `tx`, writes directly to the database.
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
                    tenantId: ctx.tenantId,
                    branchId: ctx.branchId,
                    userId: ctx.userId,
                    terminalId: ctx.terminalId || null,
                    actionType: entry.actionType as any, // generated client may not know new enum values
                    entityType: entry.entityType,
                    entityId: entry.entityId,
                    entityName: entry.entityName || null,
                    description: entry.description,
                    oldValues: entry.oldValues ? JSON.parse(JSON.stringify(entry.oldValues)) : null,
                    newValues: entry.newValues ? JSON.parse(JSON.stringify(entry.newValues)) : null,
                    severity: entry.severity || 'medium',
                },
            });
        } catch (error) {
            // Audit logging should never break the parent operation.
            // Log to console and continue.
            console.error('[ProcurementAuditService] Failed to write audit log:', error);
        }
    }

    // ─── Convenience Methods ───────────────────────────────────────

    static async logCreate(
        ctx: AuditContext,
        entityType: ProcurementEntityType,
        entityId: string,
        entityName: string,
        newValues: Record<string, unknown>,
        tx?: any
    ): Promise<void> {
        await this.log(ctx, {
            actionType: 'create',
            entityType,
            entityId,
            entityName,
            description: `Created ${entityType} ${entityName}`,
            newValues,
            severity: 'low',
        }, tx);
    }

    static async logStatusChange(
        ctx: AuditContext,
        actionType: AuditActionType,
        entityType: ProcurementEntityType,
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
            description: `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} ${entityType} ${entityName}: ${oldStatus} → ${newStatus}`,
            oldValues: { status: oldStatus },
            newValues: { status: newStatus, ...additionalData },
            severity: this.getSeverity(actionType),
        }, tx);
    }

    static async logPayment(
        ctx: AuditContext,
        actionType: 'pay' | 'void' | ProcurementEntityType,
        entityId: string,
        entityName: string,
        data: Record<string, unknown> | number,
        additionalData?: Record<string, unknown>,
        tx?: any
    ): Promise<void> {
        // Handle credit note application
        if (actionType === 'SupplierCreditNote' || actionType === 'CreditNote' as any) {
            await this.log(ctx, {
                actionType: 'pay',
                entityType: 'SupplierCreditNote',
                entityId,
                entityName,
                description: `Applied credit note ${entityName} for ${data}`,
                newValues: { amount: data, ...additionalData },
                severity: 'high',
            }, tx);
            return;
        }

        const isVoid = actionType === 'void';
        await this.log(ctx, {
            actionType: actionType as AuditActionType,
            entityType: 'SupplierPayment',
            entityId,
            entityName,
            description: isVoid
                ? `Voided payment ${entityName}`
                : `Recorded payment ${entityName} for ${(data as Record<string, unknown>).amount}`,
            oldValues: isVoid ? data as Record<string, unknown> : undefined,
            newValues: isVoid ? { status: 'CANCELLED' } : data as Record<string, unknown>,
            severity: 'high',
        }, tx);
    }

    // ─── Helpers ───────────────────────────────────────────────────

    private static getSeverity(actionType: AuditActionType): AuditSeverity {
        switch (actionType) {
            case 'post':
            case 'pay':
            case 'void':
                return 'high';
            case 'approve':
            case 'reject':
            case 'cancel':
            case 'dispute':
                return 'medium';
            default:
                return 'low';
        }
    }
}
