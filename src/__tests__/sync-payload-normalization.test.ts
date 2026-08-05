import fs from 'fs';
import path from 'path';
import { prisma } from '../databases/prisma/client';
import { normalizeRecordForCreateMany } from '../services/sync/handlers/base.handler';
import { receiveSales, receiveSaleItems, receiveSalePayments } from '../services/sync/handlers/sales.handler';

jest.mock('../databases/prisma/client', () => ({
    prisma: {
        sale: {
            findMany: jest.fn(),
            createMany: jest.fn(),
        },
        saleItem: {
            findMany: jest.fn(),
            createMany: jest.fn(),
        },
        salePayment: {
            findMany: jest.fn(),
            createMany: jest.fn(),
        },
    },
}));

function parseModelFields(schemaText: string, modelName: string): Set<string> {
    const modelRegex = new RegExp(`model\\s+${modelName}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm');
    const match = schemaText.match(modelRegex);

    if (!match) {
        throw new Error(`Model ${modelName} not found in schema`);
    }

    const fields = new Set<string>();

    for (const rawLine of match[1].split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('//') || line.startsWith('@@')) {
            continue;
        }

        const fieldMatch = line.match(/^([A-Za-z][A-Za-z0-9_]*)\s+/);
        if (fieldMatch) {
            fields.add(fieldMatch[1]);
        }
    }

    return fields;
}

describe('offline sync processing', () => {
    const schemaDir = path.resolve(__dirname, '..', 'databases', 'prisma');
    const baseSchema = fs.readFileSync(path.join(schemaDir, 'schema.prisma'), 'utf8');
    const sqliteSchema = fs.readFileSync(path.join(schemaDir, 'schema.sqlite.prisma'), 'utf8');
    const mysqlSchema = fs.readFileSync(path.join(schemaDir, 'schema.mysql.prisma'), 'utf8');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('removes nested relation data and arrays while preserving scalar fields', () => {
        const record = {
            id: 'sale-1',
            tenantId: 'tenant-1',
            branchId: 'branch-1',
            saleNumber: 'SALE-001',
            subtotal: 100,
            notes: 'offline sale',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            customer: { connect: { customerId: 'cust-1' } },
            payments: [{ id: 'pay-1' }],
            items: [{ id: 'item-1' }],
            paymentMethod: { connect: { methodId: 'cash' } },
            undefinedField: undefined,
            nullField: null,
        };

        expect(normalizeRecordForCreateMany(record)).toEqual({
            id: 'sale-1',
            tenantId: 'tenant-1',
            branchId: 'branch-1',
            saleNumber: 'SALE-001',
            subtotal: 100,
            notes: 'offline sale',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            nullField: null,
        });
    });

    it('keeps sync payloads compatible with both SQLite and MySQL schemas', () => {
        const saleFieldsSqlite = parseModelFields(sqliteSchema, 'Sale');
        const saleFieldsMysql = parseModelFields(mysqlSchema, 'Sale');
        const saleItemFieldsSqlite = parseModelFields(sqliteSchema, 'SaleItem');
        const saleItemFieldsMysql = parseModelFields(mysqlSchema, 'SaleItem');
        const salePaymentFieldsSqlite = parseModelFields(sqliteSchema, 'SalePayment');
        const salePaymentFieldsMysql = parseModelFields(mysqlSchema, 'SalePayment');

        const sharedSaleFields = [...saleFieldsSqlite].filter((field) => saleFieldsMysql.has(field));
        const sharedSaleItemFields = [...saleItemFieldsSqlite].filter((field) => saleItemFieldsMysql.has(field));
        const sharedSalePaymentFields = [...salePaymentFieldsSqlite].filter((field) => salePaymentFieldsMysql.has(field));

        expect(sharedSaleFields.length).toBeGreaterThan(0);
        expect(sharedSaleItemFields.length).toBeGreaterThan(0);
        expect(sharedSalePaymentFields.length).toBeGreaterThan(0);

        const normalizedSale = normalizeRecordForCreateMany({
            id: 'sale-1',
            tenantId: 'tenant-1',
            branchId: 'branch-1',
            saleNumber: 'SALE-001',
            subtotal: 100,
            customer: { connect: { customerId: 'cust-1' } },
        });
        const normalizedItem = normalizeRecordForCreateMany({
            id: 'item-1',
            tenantId: 'tenant-1',
            branchId: 'branch-1',
            saleId: 'sale-1',
            variantId: 'variant-1',
            quantity: 2,
            unitPrice: 50,
            sale: { connect: { id: 'sale-1' } },
        });
        const normalizedPayment = normalizeRecordForCreateMany({
            id: 'payment-1',
            tenantId: 'tenant-1',
            branchId: 'branch-1',
            saleId: 'sale-1',
            paymentMethodId: 'cash',
            amount: 100,
            sale: { connect: { id: 'sale-1' } },
        });

        for (const field of Object.keys(normalizedSale)) {
            expect(sharedSaleFields).toContain(field);
        }

        for (const field of Object.keys(normalizedItem)) {
            expect(sharedSaleItemFields).toContain(field);
        }

        for (const field of Object.keys(normalizedPayment)) {
            expect(sharedSalePaymentFields).toContain(field);
        }

        const baseSaleFields = parseModelFields(baseSchema, 'Sale');
        expect(baseSaleFields.has('tenantId')).toBe(true);
        expect(baseSaleFields.has('saleNumber')).toBe(true);
    });

    it('processes sales, sale items and sale payments through the full sync handlers', async () => {
        const saleModel = prisma.sale as any;
        const saleItemModel = prisma.saleItem as any;
        const salePaymentModel = prisma.salePayment as any;

        saleModel.findMany.mockImplementation(async ({ where }: { where: { id?: { in?: string[] } } }) => {
            const ids = where?.id?.in ?? [];
            return ids.filter((id: string) => id === 'sale-existing').map((id: string) => ({ id }));
        });
        saleItemModel.findMany.mockImplementation(async ({ where }: { where: { id?: { in?: string[] } } }) => {
            const ids = where?.id?.in ?? [];
            return ids.filter((id: string) => id === 'item-existing').map((id: string) => ({ id }));
        });
        salePaymentModel.findMany.mockImplementation(async ({ where }: { where: { id?: { in?: string[] } } }) => {
            const ids = where?.id?.in ?? [];
            return ids.filter((id: string) => id === 'payment-existing').map((id: string) => ({ id }));
        });

        saleModel.createMany.mockResolvedValue({ count: 1 });
        saleItemModel.createMany.mockResolvedValue({ count: 1 });
        salePaymentModel.createMany.mockResolvedValue({ count: 1 });

        const salesResult = await receiveSales([
            { id: 'sale-existing', tenantId: 'tenant-1', branchId: 'branch-1', saleNumber: 'SALE-001' },
            {
                id: 'sale-new',
                tenantId: 'tenant-1',
                branchId: 'branch-1',
                saleNumber: 'SALE-002',
                customer: { connect: { customerId: 'cust-1' } },
                items: [{ id: 'item-1' }],
                payments: [{ id: 'pay-1' }],
            },
        ], 'terminal-1');

        expect(salesResult.accepted).toBe(1);
        expect(salesResult.skipped).toBe(1);
        expect(saleModel.createMany).toHaveBeenCalledWith(expect.objectContaining({
            data: [expect.objectContaining({
                id: 'sale-new',
                tenantId: 'tenant-1',
                branchId: 'branch-1',
                saleNumber: 'SALE-002',
                terminalId: 'terminal-1',
            })],
            skipDuplicates: true,
        }));

        const itemResult = await receiveSaleItems([
            { id: 'item-existing', tenantId: 'tenant-1', branchId: 'branch-1', saleId: 'sale-existing', variantId: 'variant-1', quantity: 1, unitPrice: 10, subtotal: 10 },
            {
                id: 'item-new',
                tenantId: 'tenant-1',
                branchId: 'branch-1',
                saleId: 'sale-existing',
                variantId: 'variant-2',
                quantity: 2,
                unitPrice: 20,
                subtotal: 40,
                sale: { connect: { id: 'sale-existing' } },
            },
        ], 'terminal-2');

        expect(itemResult.accepted).toBe(1);
        expect(itemResult.skipped).toBe(1);
        expect(saleItemModel.createMany).toHaveBeenCalledWith(expect.objectContaining({
            data: [expect.objectContaining({
                id: 'item-new',
                tenantId: 'tenant-1',
                branchId: 'branch-1',
                saleId: 'sale-existing',
                terminalId: 'terminal-2',
            })],
            skipDuplicates: true,
        }));

        const paymentResult = await receiveSalePayments([
            { id: 'payment-existing', tenantId: 'tenant-1', branchId: 'branch-1', saleId: 'sale-existing', paymentMethodId: 'cash', amount: 50 },
            {
                id: 'payment-new',
                tenantId: 'tenant-1',
                branchId: 'branch-1',
                saleId: 'sale-existing',
                paymentMethodId: 'cash',
                amount: 50,
                sale: { connect: { id: 'sale-existing' } },
            },
        ]);

        expect(paymentResult.accepted).toBe(1);
        expect(paymentResult.skipped).toBe(1);
        expect(salePaymentModel.createMany).toHaveBeenCalledWith(expect.objectContaining({
            data: [expect.objectContaining({
                id: 'payment-new',
                tenantId: 'tenant-1',
                branchId: 'branch-1',
                saleId: 'sale-existing',
            })],
            skipDuplicates: true,
        }));
    });
});
