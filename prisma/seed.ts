import { prisma } from "./client";
import {
    seedBranch,
    seedCategories,
    seedCustomers,
    seedPaymentMethods,
    seedPermissions,
    seedRolePermissions,
    seedRoles,
    seedTenant,
    seedTerminal,
    seedUser
} from "./seeds";

async function main() {
    console.log('🌱 Starting database seeding...');

    try {
        await seedRoles(prisma);
        await seedPermissions(prisma);
        await seedRolePermissions(prisma);
        await seedTenant(prisma);
        await seedBranch(prisma);
        await seedTerminal(prisma);
        await seedUser(prisma);
        await seedCategories(prisma);
        await seedCustomers(prisma);
        await seedPaymentMethods(prisma);

        console.log('🎉 Database seeding completed successfully!');
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    }
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });