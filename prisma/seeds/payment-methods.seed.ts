import { PrismaClient } from "../../generated/prisma/client";

const PAYMENT_METHODS = [
    { method_id: '1', name: 'Cash' },
    { method_id: '2', name: 'Mobile Transfer' },
];

export async function seedPaymentMethods(prisma: PrismaClient) {
    console.log('📝 Seeding payment methods...');

    for (const method of PAYMENT_METHODS) {
        await prisma.payment_methods.upsert({
            where: { method_id: method.method_id },
            update: {},
            create: {
                ...method,
                tenant_id: '-1',
                branch_id: '-1',
                user_id: '-1',
            },
        });
    }

    console.log('✅ Payment methods seeded');
}