import { PrismaClient } from "../generated/mysql/client";

// Payment method templates (without tenant/branch IDs).
// "bank" is seeded before its children ("pos", "bank-transfer") since the
// upsert loop below runs sequentially and parentMethodId is a self-FK.
const PAYMENT_METHOD_TEMPLATES = [
    { methodId: 'cash', name: 'Cash', icon: '💵', sortOrder: 1, isActive: true },
    { methodId: 'bank', name: 'Bank', icon: '🏦', sortOrder: 2, isActive: true },
    { methodId: 'pos', name: 'POS', sortOrder: 1, parentMethodId: 'bank', isActive: true },
    { methodId: 'bank-transfer', name: 'Bank Transfer', icon: '🏦', sortOrder: 2, parentMethodId: 'bank', isActive: true },
    { methodId: 'mobile-money', name: 'Mobile Money', icon: '📱', sortOrder: 3, isActive: true },
    { methodId: 'credit-card', name: 'Credit Card', icon: '💳', sortOrder: 4, isActive: true },
    { methodId: 'debit-card', name: 'Debit Card', icon: '💳', sortOrder: 5, isActive: true },
    { methodId: 'cheque', name: 'Cheque', icon: '📝', sortOrder: 6, isActive: true },
];

export async function seedPaymentMethods(prisma: PrismaClient) {
    console.log('📝 Seeding payment methods...');

    // Use the default tenant and branch that were seeded earlier
    const tenantId = '-1';
    const branchId = '-1';

    for (const template of PAYMENT_METHOD_TEMPLATES) {
        await prisma.paymentMethod.upsert({
            where: { methodId: template.methodId },
            update: {},
            create: {
                ...template,
                tenantId,
                branchId,
            },
        });
    }

    console.log('✓ Payment methods seeded');
}