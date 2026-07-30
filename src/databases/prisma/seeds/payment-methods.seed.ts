import { PrismaClient } from "../generated/mysql/client";

// Payment method templates (without tenant/branch IDs).
// "bank" is seeded before its children ("pos", "bank-transfer") since the
// upsert loop below runs sequentially and parentMethodId is a self-FK.
// `category` lets the global provider catalog (bank/mobile-money networks)
// resolve for this tenant even though method_id is globally unique - see
// the 20260727_01 migration and payment-method-provisioning.service.ts,
// which uses this same category scheme for every other tenant/branch.
const PAYMENT_METHOD_TEMPLATES = [
    { methodId: 'cash', name: 'Cash', icon: '💵', sortOrder: 1, isActive: true, category: 'cash' },
    { methodId: 'bank', name: 'Bank', icon: '🏦', sortOrder: 2, isActive: true, category: 'bank' },
    { methodId: 'pos', name: 'POS', sortOrder: 1, parentMethodId: 'bank', isActive: true, category: 'bank' },
    { methodId: 'bank-transfer', name: 'Bank Transfer', icon: '🏦', sortOrder: 2, parentMethodId: 'bank', isActive: true, category: 'bank' },
    { methodId: 'mobile-money', name: 'Mobile Money', icon: '📱', sortOrder: 3, isActive: true, category: 'mobile-money' },
    { methodId: 'credit-card', name: 'Credit Card', icon: '💳', sortOrder: 4, isActive: true, category: 'credit-card' },
    { methodId: 'debit-card', name: 'Debit Card', icon: '💳', sortOrder: 5, isActive: true, category: 'debit-card' },
    { methodId: 'cheque', name: 'Cheque', icon: '📝', sortOrder: 6, isActive: true, category: 'cheque' },
];

export async function seedPaymentMethods(prisma: PrismaClient) {
    console.log('📝 Seeding payment methods...');

    // Use the default tenant and branch that were seeded earlier
    const tenantId = '-1';
    const branchId = '-1';

    for (const template of PAYMENT_METHOD_TEMPLATES) {
        await prisma.paymentMethod.upsert({
            where: { methodId: template.methodId },
            update: { category: template.category },
            create: {
                ...template,
                tenantId,
                branchId,
            },
        });
    }

    console.log('✓ Payment methods seeded');
}