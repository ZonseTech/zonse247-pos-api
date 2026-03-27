import prisma from '../../../databases/prisma/client';
import type { UpsertResult, PullTableName } from '../types/sync.types';
import { isNewerRecord } from './base.handler';

/**
 * Upsert a pulled record into local database
 */
export async function upsertPulledRecord(
    tableName: PullTableName,
    record: Record<string, unknown>
): Promise<UpsertResult> {
    switch (tableName) {
        case 'products':
            return upsertProduct(record);
        case 'productVariants':
            return upsertProductVariant(record);
        case 'categories':
            return upsertCategory(record);
        case 'inventory':
            return upsertInventory(record);
        case 'paymentMethods':
            return upsertPaymentMethod(record);
        case 'stockMovements':
            return upsertStockMovement(record);
        case 'customers':
            return upsertCustomer(record);
        case 'users':
            return upsertUser(record);
        default:
            return 'skipped';
    }
}

async function upsertProduct(record: Record<string, unknown>): Promise<UpsertResult> {
    const id = record.id as string;
    const existing = await prisma.product.findUnique({ where: { id } });

    if (existing) {
        if (isNewerRecord(record, existing)) {
            await prisma.product.update({ where: { id }, data: record as never });
            return 'updated';
        }
        return 'skipped';
    }

    await prisma.product.create({ data: record as never });
    return 'inserted';
}

async function upsertProductVariant(record: Record<string, unknown>): Promise<UpsertResult> {
    const id = record.id as string;
    const variantData = normalizeDecimalFields(record, [
        'sellingPrice',
        'costPrice',
        'weight',
        'volume',
        'promoPrice',
    ]);

    const existing = await prisma.productVariant.findUnique({ where: { id } });

    if (existing) {
        if (isNewerRecord(record, existing)) {
            await prisma.productVariant.update({ where: { id }, data: variantData as never });
            return 'updated';
        }
        return 'skipped';
    }

    await prisma.productVariant.create({ data: variantData as never });
    return 'inserted';
}

async function upsertCategory(record: Record<string, unknown>): Promise<UpsertResult> {
    const categoryId = record.categoryId as string;

    const categoryData = {
        categoryId: record.categoryId,
        branchId: record.branchId,
        tenantId: record.tenantId,
        userId: record.userId,
        terminalId: record.terminalId || null,
        name: record.name,
        description: record.description || null,
        color: record.color || null,
        isActive: record.isActive ?? true,
        isDefault: record.isDefault ?? false,
        sortOrder: record.sortOrder ?? 0,
        itemCount: record.itemCount ?? null,
        lastSyncedAt: record.lastSyncedAt ? new Date(record.lastSyncedAt as string) : null,
        version: record.version ?? 1,
        deletedAt: record.deletedAt ? new Date(record.deletedAt as string) : null,
        createdAt: record.createdAt ? new Date(record.createdAt as string) : undefined,
        updatedAt: record.updatedAt ? new Date(record.updatedAt as string) : undefined,
    };

    const existing = await prisma.category.findUnique({ where: { categoryId } });

    if (existing) {
        if (isNewerRecord(record, existing)) {
            await prisma.category.update({ where: { categoryId }, data: categoryData as never });
            return 'updated';
        }
        return 'skipped';
    }

    await prisma.category.create({ data: categoryData as never });
    return 'inserted';
}

async function upsertInventory(record: Record<string, unknown>): Promise<UpsertResult> {
    const id = record.id as string;
    const inventoryData = normalizeDecimalFields(record, ['averageCost', 'lastPurchaseCost']);

    const existing = await prisma.inventory.findUnique({ where: { id } });

    if (existing) {
        if (isNewerRecord(record, existing)) {
            await prisma.inventory.update({ where: { id }, data: inventoryData as never });
            return 'updated';
        }
        return 'skipped';
    }

    await prisma.inventory.create({ data: inventoryData as never });
    return 'inserted';
}

async function upsertPaymentMethod(record: Record<string, unknown>): Promise<UpsertResult> {
    const methodId = record.methodId as string;
    const existing = await prisma.paymentMethod.findUnique({ where: { methodId } });

    if (existing) {
        if (isNewerRecord(record, existing)) {
            await prisma.paymentMethod.update({ where: { methodId }, data: record as never });
            return 'updated';
        }
        return 'skipped';
    }

    await prisma.paymentMethod.create({ data: record as never });
    return 'inserted';
}

async function upsertStockMovement(record: Record<string, unknown>): Promise<UpsertResult> {
    const id = record.id as string;
    const existing = await prisma.stockMovement.findUnique({ where: { id } });

    if (existing) {
        return 'skipped';
    }

    const movementData = normalizeDecimalFields(record, ['unitCost', 'totalCost']);
    await prisma.stockMovement.create({ data: movementData as never });
    return 'inserted';
}

async function upsertCustomer(record: Record<string, unknown>): Promise<UpsertResult> {
    const customerId = record.customerId as string;
    const existing = await prisma.customer.findUnique({ where: { customerId } });

    if (existing) {
        if (isNewerRecord(record, existing)) {
            await prisma.customer.update({ where: { customerId }, data: record as never });
            return 'updated';
        }
        return 'skipped';
    }

    await prisma.customer.create({ data: record as never });
    return 'inserted';
}

/**
 * Upsert a user record pulled from the server into the local/offline database
 * 
 * This handles server-side changes flowing to terminals:
 * - Admin resets password → terminal gets the new hash
 * - Admin changes role/status → terminal gets the update
 * - Password conflict: latest passwordChangedAt wins
 * - Profile conflict: latest updatedAt wins
 */
async function upsertUser(record: Record<string, unknown>): Promise<UpsertResult> {
    const userId = record.userId as string;
    const existing = await prisma.user.findUnique({ where: { userId } });

    if (existing) {
        const updateData: Record<string, unknown> = {};
        let hasChanges = false;

        // Password: latest passwordChangedAt wins
        if (record.password && record.passwordChangedAt) {
            const incomingPwdAt = new Date(record.passwordChangedAt as string);
            const existingPwdAt = existing.passwordChangedAt
                ? new Date(existing.passwordChangedAt as string)
                : new Date(0);

            if (incomingPwdAt > existingPwdAt) {
                updateData.password = record.password;
                updateData.passwordChangedAt = incomingPwdAt;
                updateData.forcePasswordChange = record.forcePasswordChange ?? existing.forcePasswordChange;
                hasChanges = true;
            }
        }

        // All other fields: latest updatedAt wins
        if (isNewerRecord(record, existing)) {
            const syncFields = [
                'username', 'fullname', 'email', 'phone', 'roleId', 'status',
                'accessibleBranches', 'allowedTerminals', 'maxDiscountPercent',
                'canOverridePrices', 'pinCode', 'currentBranchId',
            ];

            for (const field of syncFields) {
                if (record[field] !== undefined) {
                    updateData[field] = field === 'maxDiscountPercent'
                        ? toNumber(record[field])
                        : record[field];
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                updateData.updatedAt = record.updatedAt
                    ? new Date(record.updatedAt as string)
                    : new Date();
            }
        }

        if (hasChanges) {
            // Handle roleId with proper relation connect syntax
            if (updateData.roleId) {
                const roleId = updateData.roleId as string;
                // Ensure role exists locally
                const roleExists = await prisma.role.findUnique({ where: { roleId } });
                if (!roleExists) {
                    await prisma.role.create({
                        data: {
                            roleId,
                            name: roleId,
                            displayName: roleId,
                            isSystemRole: false,
                            isActive: true,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        },
                    });
                }
                updateData.role = { connect: { roleId } };
                delete updateData.roleId;
            }

            await prisma.user.update({
                where: { userId },
                data: updateData as any,
            });
            return 'updated';
        }

        return 'skipped';
    }

    // Don't create new users via pull - they must arrive through login/saveUserOffline
    return 'skipped';
}

/**
 * Convert Prisma Decimal fields to numbers for SQLite compatibility
 */
function normalizeDecimalFields(
    record: Record<string, unknown>,
    fields: string[]
): Record<string, unknown> {
    const result = { ...record };

    for (const field of fields) {
        if (result[field] != null) {
            result[field] = toNumber(result[field]);
        }
    }

    return result;
}

/**
 * Convert Prisma Decimal to number
 */
function toNumber(value: unknown): number {
    if (value == null) return 0;
    if (typeof value === 'number') return value;
    if (typeof (value as { toNumber?: () => number }).toNumber === 'function') {
        return (value as { toNumber: () => number }).toNumber();
    }
    return parseFloat(String(value)) || 0;
}
