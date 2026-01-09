import { PrismaClient } from "../generated/prisma/client";

const PAYMENT_METHODS = [
    { methodId: 'cash', name: 'Cash', icon: '💵', sortOrder: 1, isActive: true },
    { methodId: 'bank-transfer', name: 'Bank Transfer', icon: '🏦', sortOrder: 2, isActive: true },
    { methodId: 'mobile-money', name: 'Mobile Money', icon: '📱', sortOrder: 3, isActive: true },
    { methodId: 'credit-card', name: 'Credit Card', icon: '💳', sortOrder: 4, isActive: true },
    { methodId: 'debit-card', name: 'Debit Card', icon: '💳', sortOrder: 5, isActive: true },
    { methodId: 'cheque', name: 'Cheque', icon: '📝', sortOrder: 6, isActive: true },
];

export async function seedPaymentMethods(prisma: PrismaClient) {
    console.log('📝 Seeding payment methods...');

    for (const method of PAYMENT_METHODS) {
        await prisma.paymentMethod.upsert({
            where: { methodId: method.methodId },
            update: {},
            create: method,
        });
    }

    console.log('✓ Payment methods seeded');
}