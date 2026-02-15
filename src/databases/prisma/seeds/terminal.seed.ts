import { PrismaClient } from "../generated/mysql/client";

export async function seedTerminal(prisma: PrismaClient) {
    console.log('📝 Seeding terminal...');
    const now = new Date();

    await prisma.terminal.upsert({
        where: { terminalId: '-1' },
        update: {},
        create: {
            terminalId: '-1',
            tenantId: '-1',
            branchId: '-1',
            terminalCode: 'TERM001',
            terminalLabel: 'Main Terminal',
            deviceId: 'DEFAULT_DEVICE',
            activationStatus: 'ACTIVATED',
            isPrimary: true,
            registeredAt: now
        },
    });

    console.log('✓ Terminal seeded');
}