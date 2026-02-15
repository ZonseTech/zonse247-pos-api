import { PrismaClient } from "../generated/mysql/client";

const PAYMENT_SERVICE_PROVIDERS = [
    {
        providerId: 'nb-bank',
        name: 'NB Bank',
        type: 'bank',
        description: 'National Bank of Malawi',
        logoUrl: null,
        sortOrder: 1
    },
    {
        providerId: 'standard-bank',
        name: 'Standard Bank',
        type: 'bank',
        description: 'Standard Bank Malawi',
        logoUrl: null,
        sortOrder: 2
    },
    {
        providerId: 'fnb',
        name: 'FNB',
        type: 'bank',
        description: 'First National Bank',
        logoUrl: null,
        sortOrder: 3
    },
    {
        providerId: 'airtel-money',
        name: 'Airtel Money',
        type: 'epayment',
        description: 'Airtel Mobile Money',
        logoUrl: null,
        sortOrder: 4
    },
    {
        providerId: 'tnm-mpamba',
        name: 'TNM Mpamba',
        type: 'epayment',
        description: 'TNM Mobile Money',
        logoUrl: null,
        sortOrder: 5
    },
    {
        providerId: 'visa',
        name: 'Visa',
        type: 'bank',
        description: 'Visa Card Payments',
        logoUrl: null,
        sortOrder: 6
    },
    {
        providerId: 'mastercard',
        name: 'Mastercard',
        type: 'bank',
        description: 'Mastercard Payments',
        logoUrl: null,
        sortOrder: 7
    },
];

export async function seedPaymentServiceProviders(prisma: PrismaClient) {
    console.log('📝 Seeding payment service providers...');

    for (const provider of PAYMENT_SERVICE_PROVIDERS) {
        await prisma.paymentServiceProvider.upsert({
            where: { providerId: provider.providerId },
            update: {},
            create: {
                ...provider,
                userId: '-1',
            },
        });
    }

    console.log('✓ Payment service providers seeded');
}
