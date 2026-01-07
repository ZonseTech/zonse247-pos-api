import { PrismaClient } from "../generated/prisma/client";

const PAYMENT_METHODS = [
    { methodId: 'cash', name: 'Cash', icon: '💵', sortOrder: 1 },
    { methodId: 'bank-transfer', name: 'Bank Transfer', icon: '🏦', sortOrder: 2 },
    { methodId: 'mobile-money', name: 'Mobile Money', icon: '📱', sortOrder: 3 },
    { methodId: 'credit-card', name: 'Credit Card', icon: '💳', sortOrder: 4 },
    { methodId: 'debit-card', name: 'Debit Card', icon: '💳', sortOrder: 5 },
    { methodId: 'cheque', name: 'Cheque', icon: '📝', sortOrder: 6 },
];

export async function seedPaymentMethods(prisma: PrismaClient) {
    console.log('📝 Seeding payment methods...');

    for (const method of PAYMENT_METHODS) {
        await prisma.paymentMethod.upsert({
            where: { methodId: method.methodId },
            update: {},
            create: {
                ...method,
                tenantId: '-1',
                branchId: '-1',
                userId: '-1',
            },
        });
    }

    console.log('✓ Payment methods seeded');
}