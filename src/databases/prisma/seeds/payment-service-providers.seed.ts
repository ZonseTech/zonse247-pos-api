import { PrismaClient } from "../generated/mysql/client";

const PAYMENT_SERVICE_PROVIDERS = [
    // Banks - linked to the "bank" root payment method (shared by both the
    // POS and Bank Transfer channels)
    { providerId: 'national-bank', name: 'National Bank', type: 'bank', description: 'National Bank of Malawi (NB)', logoUrl: null, sortOrder: 1, paymentMethodId: 'bank' },
    { providerId: 'first-capital-bank', name: 'First Capital Bank', type: 'bank', description: 'First Capital Bank Malawi (FCB)', logoUrl: null, sortOrder: 2, paymentMethodId: 'bank' },
    { providerId: 'fdh-bank', name: 'FDH Bank', type: 'bank', description: 'FDH Bank Malawi', logoUrl: null, sortOrder: 3, paymentMethodId: 'bank' },
    { providerId: 'standard-bank', name: 'Standard Bank', type: 'bank', description: 'Standard Bank Malawi', logoUrl: null, sortOrder: 4, paymentMethodId: 'bank' },
    { providerId: 'nbs-bank', name: 'NBS Bank', type: 'bank', description: 'NBS Bank Malawi', logoUrl: null, sortOrder: 5, paymentMethodId: 'bank' },
    { providerId: 'ecobank', name: 'Ecobank', type: 'bank', description: 'Ecobank Malawi', logoUrl: null, sortOrder: 6, paymentMethodId: 'bank' },
    { providerId: 'cdh-investment-bank', name: 'CDH Investment Bank', type: 'bank', description: 'CDH Investment Bank Malawi', logoUrl: null, sortOrder: 7, paymentMethodId: 'bank' },
    { providerId: 'mybucks-banking-corporation', name: 'MyBucks Banking Corporation', type: 'bank', description: 'MyBucks Banking Corporation Malawi', logoUrl: null, sortOrder: 8, paymentMethodId: 'bank' },

    // Mobile money - linked to the "mobile-money" root payment method
    { providerId: 'airtel-money', name: 'Airtel Money', type: 'epayment', description: 'Airtel Mobile Money', logoUrl: null, sortOrder: 1, paymentMethodId: 'mobile-money' },
    { providerId: 'tnm-mpamba', name: 'TNM Mpamba', type: 'epayment', description: 'TNM Mobile Money', logoUrl: null, sortOrder: 2, paymentMethodId: 'mobile-money' },
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
