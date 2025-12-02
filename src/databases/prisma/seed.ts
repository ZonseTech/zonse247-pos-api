import { getPrismaClient, disconnectPrisma } from "./client";
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
    const prisma = await getPrismaClient();

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
    .then(async () => {
        await disconnectPrisma();
    })
    .catch(async (e) => {
        console.error('❌ Error seeding database:', e);
        await disconnectPrisma();
        process.exit(1);
    });