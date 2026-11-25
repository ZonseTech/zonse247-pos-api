/**
 * Server side: two terminals of one branch push sales with the same number.
 *
 * Terminals number sales from their own local database only (sales are never
 * pulled), so two tills selling on the same day both create SALE-<date>-00001.
 * The server's unique (tenantId, branchId, saleNumber) key and
 * createMany({ skipDuplicates }) — INSERT IGNORE on MySQL — then drop the
 * second terminal's sale without reporting it, and its items are rejected
 * with "Parent sale not found" on every sync cycle from then on.
 *
 * The prisma models below are an in-memory table that applies the primary
 * key and the unique sale-number key the way INSERT IGNORE does.
 *
 * The server now stores such a sale as <number>-<terminal code> and reports
 * anything it cannot store as rejected, so nothing disappears silently.
 */
import { prisma } from '../databases/prisma/client';
import { receiveSales, receiveSaleItems } from '../services/sync/handlers/sales.handler';

type Row = Record<string, any>;
type SyncRow = Row & { id: string };

function asStored(row: Row): Row {
    const out: Row = { ...row };
    for (const k of Object.keys(out)) {
        if (k.endsWith('At') && typeof out[k] === 'string') out[k] = new Date(out[k]);
    }
    return out;
}

function fakeTable(uniqueKeys: string[][] = []) {
    const rows: Row[] = [];
    const violates = (row: Row) =>
        rows.some((r) => r.id === row.id) ||
        uniqueKeys.some((key) => rows.some((r) => key.every((k) => r[k] === row[k])));

    return {
        rows,
        findMany: jest.fn(async ({ where }: any) => {
            const [field, cond] = Object.entries(where)[0] as [string, any];
            return rows.filter((r) => cond.in.includes(r[field]));
        }),
        update: jest.fn(async ({ where, data }: any) => {
            const row = rows.find((r) => r.id === where.id);
            if (!row) throw new Error('Record to update not found');
            Object.assign(row, asStored(data));
            return row;
        }),
        createMany: jest.fn(async ({ data, skipDuplicates }: any) => {
            let count = 0;
            for (const row of data) {
                if (violates(row)) {
                    if (skipDuplicates) continue;
                    throw new Error('Unique constraint failed');
                }
                rows.push(asStored(row));
                count++;
            }
            return { count };
        }),
    };
}

jest.mock('../databases/prisma/client', () => {
    const mockPrisma: Record<string, any> = {};
    return { __esModule: true, default: mockPrisma, prisma: mockPrisma };
});

const TENANT = 'tenant_1';
const BRANCH = 'branch_1';
const TILL_A = 'terminal_a';
const TILL_B = 'terminal_b';

function sale(id: string, terminalId: string, saleNumber: string): SyncRow {
    return {
        id,
        tenantId: TENANT,
        branchId: BRANCH,
        terminalId,
        saleNumber,
        userId: 'user_1',
        totalAmount: 1000,
        status: 'COMPLETED',
        saleDate: '2026-08-19T11:42:55.176Z',
        createdAt: '2026-08-19T11:42:55.176Z',
        updatedAt: '2026-08-19T11:42:55.176Z',
    };
}

function item(id: string, saleId: string): SyncRow {
    return {
        id,
        saleId,
        tenantId: TENANT,
        branchId: BRANCH,
        productId: 'product_1',
        variantId: 'variant_1',
        quantity: 1,
        unitPrice: 1000,
        totalAmount: 1000,
        createdAt: '2026-08-19T11:42:55.176Z',
        updatedAt: '2026-08-19T11:42:55.176Z',
    };
}

let sales: ReturnType<typeof fakeTable>;
let saleItems: ReturnType<typeof fakeTable>;

beforeEach(async () => {
    sales = fakeTable([['tenantId', 'branchId', 'saleNumber']]);
    saleItems = fakeTable();
    (prisma as any).sale = sales;
    (prisma as any).saleItem = saleItems;
    (prisma as any).terminal = {
        findUnique: jest.fn(async ({ where }: any) => (where.terminalId === TILL_B ? { terminalCode: 'TR004' } : null)),
    };

    const first = await receiveSales([sale('sale_a1', TILL_A, 'SALE-20260819-00001')], TILL_A);
    expect(first.accepted).toBe(1);
});

describe('sync: sale number used by another terminal of the branch', () => {
    it('stores a sale whose number is unique in the branch', async () => {
        const result = await receiveSales([sale('sale_b1', TILL_B, 'SALE-20260819-00002')], TILL_B);
        expect(result).toMatchObject({ accepted: 1, rejected: 0, skipped: 0 });
        expect(sales.rows.map((r) => r.id)).toContain('sale_b1');
    });

    it('accounts for every sale sent: stored, skipped as already present, or rejected with a reason', async () => {
        const result = await receiveSales([sale('sale_b1', TILL_B, 'SALE-20260819-00001')], TILL_B);
        expect(result.accepted + result.skipped + result.rejected).toBe(1);
    });

    it('keeps the second terminal\'s sale instead of dropping it', async () => {
        await receiveSales([sale('sale_b1', TILL_B, 'SALE-20260819-00001')], TILL_B);
        expect(sales.rows.map((r) => r.id)).toContain('sale_b1');
    });

    it('accepts the items of that sale once the sale has been sent', async () => {
        await receiveSales([sale('sale_b1', TILL_B, 'SALE-20260819-00001')], TILL_B);
        const result = await receiveSaleItems([item('item_b1', 'sale_b1')], TILL_B);
        expect(result.rejected).toBe(0);
        expect(result.accepted).toBe(1);
    });

    it('stores the clashing sale under <number>-<terminal code> and keeps the original number in its notes', async () => {
        const result = await receiveSales([sale('sale_b1', TILL_B, 'SALE-20260819-00001')], TILL_B);
        expect(result).toMatchObject({ accepted: 1, rejected: 0 });
        const stored = sales.rows.find((r) => r.id === 'sale_b1')!;
        expect(stored.saleNumber).toBe('SALE-20260819-00001-TR004');
        expect(stored.notes).toContain('SALE-20260819-00001');
    });

    it('picks a free number when the suffixed number is also taken', async () => {
        await receiveSales([sale('sale_b1', TILL_B, 'SALE-20260819-00001')], TILL_B);
        await receiveSales([sale('sale_b2', TILL_B, 'SALE-20260819-00001')], TILL_B);
        const numbers = sales.rows.map((r) => r.saleNumber);
        expect(new Set(numbers).size).toBe(numbers.length);
        expect(numbers).toContain('SALE-20260819-00001-TR004-2');
    });

    it('renumbers a clash inside one batch', async () => {
        const result = await receiveSales(
            [sale('sale_b1', TILL_B, 'SALE-20260819-00009'), sale('sale_b2', TILL_B, 'SALE-20260819-00009')],
            TILL_B
        );
        expect(result).toMatchObject({ accepted: 2, rejected: 0 });
    });

    it('falls back to the terminal id when the terminal has no code', async () => {
        await receiveSales([sale('sale_c1', 'abcd1234-ef56-7890', 'SALE-20260819-00001')], 'abcd1234-ef56-7890');
        expect(sales.rows.find((r) => r.id === 'sale_c1')!.saleNumber).toBe('SALE-20260819-00001-ABCD1234');
    });

    it('reports a sale the database still drops as rejected', async () => {
        sales.createMany.mockResolvedValueOnce({ count: 0 });
        const result = await receiveSales([sale('sale_b1', TILL_B, 'SALE-20260819-00002')], TILL_B);
        expect(result.rejected).toBe(1);
        expect(result.errors[0]).toMatchObject({ id: 'sale_b1' });
    });

    it('applies a refund made on the terminal after the sale was synced', async () => {
        const refunded = {
            ...sale('sale_a1', TILL_A, 'SALE-20260819-00001'),
            status: 'REFUNDED',
            notes: 'Refund: printer test',
            updatedAt: '2026-08-19T12:00:00.000Z',
        };
        const result = await receiveSales([refunded], TILL_A);
        expect(result).toMatchObject({ accepted: 1, skipped: 0, rejected: 0 });
        expect(sales.rows[0]).toMatchObject({ status: 'REFUNDED', notes: 'Refund: printer test' });
        expect(sales.rows[0].saleNumber).toBe('SALE-20260819-00001');
    });

    it('ignores an older copy of a sale the server already has', async () => {
        sales.rows[0].updatedAt = new Date('2026-08-20T00:00:00.000Z');
        const stale = { ...sale('sale_a1', TILL_A, 'SALE-20260819-00001'), status: 'VOIDED' };
        const result = await receiveSales([stale], TILL_A);
        expect(result).toMatchObject({ accepted: 0, skipped: 1 });
        expect(sales.rows[0].status).toBe('COMPLETED');
    });

    it('skips a sale that is resent with the same id (idempotent push)', async () => {
        const result = await receiveSales([sale('sale_a1', TILL_A, 'SALE-20260819-00001')], TILL_A);
        expect(result).toMatchObject({ accepted: 0, rejected: 0, skipped: 1 });
        expect(sales.rows).toHaveLength(1);
    });
});
