import { PrismaClient } from "../generated/prisma/client";

export const featureCategories = [
    {
        title: 'Core Features',
        features: [
            'Terminals',
            'Basic Inventory Management',
            'Advanced Inventory Management',
            'Sales Reports',
            'Detailed Sales Analytics',
            'Customer Management',
            'Customer Loyalty Program',
        ],
        displayOrder: 1,
    },
    {
        title: 'Connectivity & Technical',
        features: [
            'Offline Access',
            'Cloud Backup',
            'Cloud Backup & Sync',
            'Offline Access (Sync Later)',
            'MRA Integration',
            'Multiple Locations',
            'API Access',
            'Custom Branding',
        ],
        displayOrder: 2,
    },
    {
        title: 'Support',
        features: [
            'Email Support',
            'Phone Support',
        ],
        displayOrder: 3,
    },
];

export async function seedPlanFeatures(prisma: PrismaClient) {
    console.log('🌱 Seeding plan features...');

    try {
        // Clear existing features
        await prisma.planFeature.deleteMany({});

        for (const category of featureCategories) {
            await prisma.planFeature.create({
                data: {
                    title: category.title,
                    features: category.features as any,
                    displayOrder: category.displayOrder,
                },
            });
            console.log(`✓ Created feature category: ${category.title}`);
        }

        console.log('✓ Plan features seeded successfully!');
    } catch (error) {
        console.error('❌ Error seeding plan features:', error);
        throw error;
    }
}
