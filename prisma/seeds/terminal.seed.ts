import { PrismaClient } from "../../generated/prisma/client";

export async function seedTerminal(prisma: PrismaClient) {
    console.log('📝 Seeding terminal...');

    await prisma.terminals.upsert({
        where: { terminal_id: '-1' },
        update: {},
        create: {
            terminal_id: '-1',
            tenant_id: '-1',
            branch_id: '-1',
            terminal_code: 'TERM001',
            terminal_label: 'Main Terminal',
            device_id: 'DEFAULT_DEVICE',
            activation_status: 'ACTIVATED',
            is_primary: true,
        },
    });

    console.log('✅ Terminal seeded');
}