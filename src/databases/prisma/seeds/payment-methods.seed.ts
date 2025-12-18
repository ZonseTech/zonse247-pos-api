import { PrismaClient } from "../generated/prisma/client";

const PAYMENT_METHODS = [
    { methodId: '1', name: 'Cash' },
    { methodId: '2', name: 'Mobile Transfer' },
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