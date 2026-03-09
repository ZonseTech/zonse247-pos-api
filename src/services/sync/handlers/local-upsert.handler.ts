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
