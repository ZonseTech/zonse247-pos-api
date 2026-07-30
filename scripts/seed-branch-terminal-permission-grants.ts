#!/usr/bin/env npx tsx
/**
 * Branch/Terminal Permission Grants Seed Script
 *
 * Applies the new branches.terminals. permission definitions and
 * their role grants to an already-running database, without
 * re-running the full seed (which would also touch tenant/branch/
 * user/customer/etc. data).
 *
 * Both seedPermissions() and seedRolePermissions() are upsert-based,
 * so this is safe to run repeatedly and against a database that
 * already has data. Run this against every existing deployment
 * before/alongside the refactor/branches-terminals-permission-module
 * rollout — otherwise the new route guards on branch.routes.ts and
 * terminal.routes.ts will lock out roles (branch-manager, manager,
 * assistant-manager, etc.) that were previously relying on the
 * frontend's role-based checks instead of an actual permission grant.
 *
 * ── Usage ──────────────────────────────────────────────────────────
 *   npx tsx scripts/seed-branch-terminal-permission-grants.ts
 */

import { getPrisma, disconnectPrisma, setDatabaseReady } from '../src/databases/prisma/client';
import { seedPermissions, seedRolePermissions } from '../src/databases/prisma/seeds';

async function main() {
    console.log('🌱 Seeding branch/terminal permission grants...');

    setDatabaseReady();

    const prisma = await getPrisma();

    await seedPermissions(prisma);
    await seedRolePermissions(prisma);

    console.log('🎉 Branch/terminal permission grants seeded successfully!');
}

main()
    .then(async () => {
        await disconnectPrisma();
    })
    .catch(async (e) => {
        console.error('❌ Error seeding branch/terminal permission grants:', e);
        await disconnectPrisma();
        process.exit(1);
    });
