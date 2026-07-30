#!/usr/bin/env npx tsx
/**
 * Role-Permission Module Grants Seed Script
 *
 * Applies the roles.view/create/edit/delete and system.admin grants
 * added for super-admin, tenant-owner, admin, and owner-operator to
 * an already-running database, without re-running the full seed
 * (which would also touch tenant/branch/user/customer/etc. data).
 *
 * seedRolePermissions() is upsert-based, so this is safe to run
 * repeatedly and against a database that already has data. Run this
 * against every existing deployment before/alongside the
 * refactor/role-permission-module rollout — otherwise the new route
 * guards on role.routes.ts, permission.routes.ts, and
 * role-permission.routes.ts will lock out admin-tier users who were
 * previously relying on the frontend's role-based fallback instead
 * of an actual permission grant.
 *
 * ── Usage ──────────────────────────────────────────────────────────
 *   npx tsx scripts/seed-role-permission-grants.ts
 */

import { getPrisma, disconnectPrisma, setDatabaseReady } from '../src/databases/prisma/client';
import { seedRolePermissions } from '../src/databases/prisma/seeds';

async function main() {
    console.log('🌱 Seeding role-permission module grants...');

    setDatabaseReady();

    const prisma = await getPrisma();

    await seedRolePermissions(prisma);

    console.log('🎉 Role-permission module grants seeded successfully!');
}

main()
    .then(async () => {
        await disconnectPrisma();
    })
    .catch(async (e) => {
        console.error('❌ Error seeding role-permission module grants:', e);
        await disconnectPrisma();
        process.exit(1);
    });
