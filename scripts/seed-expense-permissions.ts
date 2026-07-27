#!/usr/bin/env npx tsx
/**
 * Expense Permissions Seed Script
 *
 * Applies the expense module's permissions and role-permission grants
 * to an already-running database, without re-running the full seed
 * (which would also touch tenant/branch/user/customer/etc. data).
 *
 * Both seedPermissions() and seedRolePermissions() are upsert-based,
 * so this is safe to run repeatedly and against a database that
 * already has data.
 *
 * ── Usage ──────────────────────────────────────────────────────────
 *   npx tsx scripts/seed-expense-permissions.ts
 */

import { getPrisma, disconnectPrisma, setDatabaseReady } from '../src/databases/prisma/client';
import { seedPermissions, seedRolePermissions } from '../src/databases/prisma/seeds';

async function main() {
    console.log('🌱 Seeding expense permissions & role grants...');

    setDatabaseReady();

    const prisma = await getPrisma();

    await seedPermissions(prisma);
    await seedRolePermissions(prisma);

    console.log('🎉 Expense permissions seeded successfully!');
}

main()
    .then(async () => {
        await disconnectPrisma();
    })
    .catch(async (e) => {
        console.error('❌ Error seeding expense permissions:', e);
        await disconnectPrisma();
        process.exit(1);
    });
