import { v4 as uuidv4 } from 'uuid';
import prisma from '../databases/prisma/client';

export interface DefaultPaymentMethodTemplate {
    key: string;
    name: string;
    icon?: string;
    sortOrder: number;
    parentKey?: string;
}

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
