import { v4 as uuidv4 } from 'uuid';
import prisma from '../databases/prisma/client';

export interface DefaultPaymentMethodTemplate {
    key: string;
    name: string;
    icon?: string;
    sortOrder: number;
    parentKey?: string;
}

// Root templates are also their own `category` (see PaymentMethod.category).
// Leaf/channel templates (POS, Bank Transfer) inherit their parent's category.
export const DEFAULT_PAYMENT_METHOD_TEMPLATES: DefaultPaymentMethodTemplate[] = [
    { key: 'cash', name: 'Cash', icon: '💵', sortOrder: 1 },
    { key: 'bank', name: 'Bank', icon: '🏦', sortOrder: 2 },
    { key: 'pos', name: 'POS', sortOrder: 1, parentKey: 'bank' },
    { key: 'bank-transfer', name: 'Bank Transfer', icon: '🏦', sortOrder: 2, parentKey: 'bank' },
    { key: 'mobile-money', name: 'Mobile Money', icon: '📱', sortOrder: 3 },
    { key: 'credit-card', name: 'Credit Card', icon: '💳', sortOrder: 4 },
    { key: 'debit-card', name: 'Debit Card', icon: '💳', sortOrder: 5 },
    { key: 'cheque', name: 'Cheque', icon: '📝', sortOrder: 6 },
];

/**
 * Creates any of the standard payment-method hierarchy (Cash, Bank -> POS/Bank
 * Transfer, Mobile Money, ...) that a tenant/branch is missing.
 *
 * payment_methods.method_id is globally unique, so every tenant needs its own
 * distinct method_id per method - this generates a fresh uuid per row (same
 * convention as PaymentMethodService.createPaymentMethod for custom methods) and
 * classifies each row with `category` so the global provider catalog (bank/mobile
 * money networks) can still resolve for this tenant. See the 20260727_01
 * migration for why `category` exists separately from method_id.
 *
 * Idempotent per template (matched by name), NOT an all-or-nothing "skip if any
 * row exists" check - many tenants already had one or more custom payment methods
 * (created via the settings UI, pre-dating this hierarchy feature) before this was
 * written, and an all-or-nothing guard would leave them stuck with just that one
 * custom method forever. Safe to call repeatedly, from both branch-creation flows
 * and a one-off backfill for existing tenants.
 */
export async function provisionDefaultPaymentMethods(tenantId: string, branchId: string): Promise<void> {
    const existing = await prisma.paymentMethod.findMany({
        where: { tenantId, branchId, deletedAt: null },
        select: { methodId: true, name: true, category: true, parentMethodId: true },
    });

    const rootIdByCategory = new Map<string, string>();
    const existingNames = new Set<string>();
    for (const row of existing) {
        existingNames.add(row.name);
        if (!row.parentMethodId && row.category) {
            rootIdByCategory.set(row.category, row.methodId);
        }
    }

    const roots = DEFAULT_PAYMENT_METHOD_TEMPLATES.filter(t => !t.parentKey);
    const children = DEFAULT_PAYMENT_METHOD_TEMPLATES.filter(t => t.parentKey);

    for (const template of roots) {
        if (rootIdByCategory.has(template.key) || existingNames.has(template.name)) continue;

        const methodId = uuidv4();
        rootIdByCategory.set(template.key, methodId);
        existingNames.add(template.name);
        await prisma.paymentMethod.create({
            data: {
                methodId,
                tenantId,
                branchId,
                name: template.name,
                icon: template.icon,
                sortOrder: template.sortOrder,
                category: template.key,
                isActive: true,
            },
        });
    }

    for (const template of children) {
        if (existingNames.has(template.name)) continue;

        const parentMethodId = rootIdByCategory.get(template.parentKey as string);
        await prisma.paymentMethod.create({
            data: {
                methodId: uuidv4(),
                tenantId,
                branchId,
                name: template.name,
                icon: template.icon,
                sortOrder: template.sortOrder,
                parentMethodId,
                category: template.parentKey,
                isActive: true,
            },
        });
    }
}
