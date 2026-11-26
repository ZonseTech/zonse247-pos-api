/**
 * Terminal side: how the push cursors move.
 *
 * Each push cycle fetches, per table, the records changed after that table's
 * cursor, oldest first, capped at batchSize × BATCH_MULTIPLIERS[table].
 * The cursor then moves to the last record sent (1 ms before it when the page
 * was full), rejected records go to a retry list, and child tables never move
 * past their parent. Previously one cursor for all tables jumped to "now" and
 * only when nothing was rejected, which lost every sale past the first page
 * and froze a till on a single rejected record.
 *
 * fetchPendingRecords is replaced by an in-memory version of the real query,
 * the push state store by an in-memory map and the HTTP client by a fake
 * server, so whole cycles run without a database.
 */
import axios from 'axios';
import { SyncJobService } from '../services/sync/sync-job.service';
import { BATCH_MULTIPLIERS } from '../services/sync/constants/sync.constants';
import type { PushState } from '../services/sync/push-state.store';

type Row = { id: string; saleId?: string; updatedAt: Date };

const terminalState: { lastSyncAt: Date | null; lastSeenAt: Date | null } = { lastSyncAt: null, lastSeenAt: null };
const local: Record<string, Row[]> = { sales: [], saleItems: [] };
let storedState: PushState | null = null;

jest.mock('../databases/prisma/client', () => {
    const mockPrisma = {
        terminal: {
            findUnique: jest.fn(async () => terminalState),
            update: jest.fn(async ({ data }: any) => Object.assign(terminalState, data)),
        },
    };
    return { __esModule: true, default: mockPrisma, prisma: mockPrisma };
});

jest.mock('../services/sync/push-state.store', () => {
    const actual = jest.requireActual('../services/sync/push-state.store');
    return {
        ...actual,
        loadPushState: jest.fn(async () => (storedState ? JSON.parse(JSON.stringify(storedState)) : null)),
        savePushState: jest.fn(async (_terminalId: string, state: PushState) => {
            storedState = JSON.parse(JSON.stringify(state));
        }),
        clearPushState: jest.fn(async () => {
            storedState = null;
        }),
    };
});

jest.mock('../services/sync/handlers', () => {
    const actual = jest.requireActual('../services/sync/handlers');
    return {
        ...actual,
        fetchPendingRecords: jest.fn(async (table: string, opts: { batchSize: number }, since: Date | null) => {
            const rows = local[table];
            if (!rows) return [];
            const limit = opts.batchSize * (BATCH_MULTIPLIERS as Record<string, number>)[table];
            return rows
                .filter((r) => !since || r.updatedAt > since)
                .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
                .slice(0, limit);
        }),
        markRecordsSynced: jest.fn(async () => undefined),
    };
});

jest.mock('axios', () => {
    const actual = jest.requireActual('axios');
    return { ...actual, __esModule: true, default: { ...actual.default, create: jest.fn() } };
});

const BATCH_SIZE = 10;
const WINDOW = BATCH_SIZE * BATCH_MULTIPLIERS.sales;

const received: Record<string, Set<string>> = {};
const sendCount = new Map<string, number>();
let rejectIds = new Set<string>();
let serverDown = false;

const salesReceived = () => (received['/sync/sales'] ??= new Set());
const itemsReceived = () => (received['/sync/sale-items'] ??= new Set());
const id = (prefix: string, n: number) => `${prefix}_${String(n).padStart(4, '0')}`;
const START = Date.UTC(2026, 7, 19, 11, 0, 0);

function seedSales(count: number, { withItems = false, sameTimestamp = false } = {}) {
    for (let i = 0; i < count; i++) {
        const updatedAt = new Date(sameTimestamp ? START : START + i * 60_000);
        local.sales.push({ id: id('sale', i + 1), updatedAt });
        if (withItems) local.saleItems.push({ id: id('item', i + 1), saleId: id('sale', i + 1), updatedAt });
    }
}

function newJob() {
    return new SyncJobService({
        serverUrl: 'http://server.test/v1',
        terminalId: 'terminal_b',
        tenantId: 'tenant_1',
        branchId: 'branch_1',
        batchSize: BATCH_SIZE,
        maxRetries: 1,
        enablePull: false,
    });
}

beforeEach(() => {
    local.sales = [];
    local.saleItems = [];
    for (const k of Object.keys(received)) delete received[k];
    sendCount.clear();
    rejectIds = new Set();
    serverDown = false;
    storedState = null;
    terminalState.lastSyncAt = null;
    terminalState.lastSeenAt = null;

    (axios.create as jest.Mock).mockReturnValue({
        post: jest.fn(async (endpoint: string, body: { records: Row[] }) => {
            if (serverDown) throw new Error('connect ECONNREFUSED');
            const store = (received[endpoint] ??= new Set());
            let accepted = 0;
            let rejected = 0;
            const errors: { id: string; error: string }[] = [];
            for (const r of body.records) {
                sendCount.set(r.id, (sendCount.get(r.id) || 0) + 1);
                if (rejectIds.has(r.id)) {
                    rejected++;
                    errors.push({ id: r.id, error: 'Rejected by test server' });
                } else if (endpoint === '/sync/sale-items' && !salesReceived().has(r.saleId!)) {
                    rejected++;
                    errors.push({ id: r.id, error: 'Parent sale not found' });
                } else {
                    store.add(r.id);
                    accepted++;
                }
            }
            return { data: { accepted, rejected, errors } };
        }),
        get: jest.fn(),
    });
});

async function runCycles(job: SyncJobService, n: number) {
    for (let i = 0; i < n; i++) await job.runSyncCycle();
}

describe('sync push cursor', () => {
    it('sends every pending sale when the backlog fits in one cycle', async () => {
        seedSales(WINDOW - 5);
        await runCycles(newJob(), 1);
        expect(salesReceived().size).toBe(WINDOW - 5);
        expect(terminalState.lastSyncAt).not.toBeNull();
    });

    it('sends a rejected record again on the next cycle', async () => {
        seedSales(5);
        rejectIds = new Set(['sale_0003']);
        await runCycles(newJob(), 2);
        expect(sendCount.get('sale_0003')).toBe(2);
        expect(salesReceived().has('sale_0003')).toBe(false);
    });

    it('sends a backlog larger than one cycle\'s window over several cycles', async () => {
        seedSales(WINDOW + 20);
        await runCycles(newJob(), 3);
        expect(salesReceived().size).toBe(WINDOW + 20);
    });

    it('keeps sending newer sales while one old record is rejected every cycle', async () => {
        seedSales(WINDOW + 20);
        rejectIds = new Set(['sale_0001']);
        await runCycles(newJob(), 3);
        expect(salesReceived().has(id('sale', WINDOW + 20))).toBe(true);
    });

    it('keeps sending sales made after the rejection, as on the stalled till', async () => {
        seedSales(WINDOW);
        rejectIds = new Set(['sale_0001']);
        const job = newJob();
        await runCycles(job, 2);

        local.sales.push({ id: 'sale_new', updatedAt: new Date(Date.UTC(2026, 9, 5, 9, 2, 45)) });
        await runCycles(job, 2);

        expect(salesReceived().has('sale_new')).toBe(true);
    });

    it('drops a record from the retry list once the server accepts it', async () => {
        seedSales(3);
        rejectIds = new Set(['sale_0002']);
        const job = newJob();
        await runCycles(job, 1);
        expect(storedState?.retry.sales?.map((e) => e.id)).toEqual(['sale_0002']);

        rejectIds = new Set();
        await runCycles(job, 1);
        expect(salesReceived().has('sale_0002')).toBe(true);
        expect(storedState?.retry.sales ?? []).toHaveLength(0);
    });

    it('resumes a stalled till from its old single push timestamp', async () => {
        seedSales(40);
        terminalState.lastSyncAt = local.sales[29].updatedAt;
        await runCycles(newJob(), 1);
        expect(salesReceived().size).toBe(10);
        expect(salesReceived().has('sale_0031')).toBe(true);
        expect(salesReceived().has('sale_0030')).toBe(false);
    });

    it('does not move the cursor past a batch that failed as a whole', async () => {
        seedSales(25);
        const job = newJob();
        serverDown = true;
        await runCycles(job, 1);
        expect(storedState?.cursors.sales).toBeUndefined();

        serverDown = false;
        await runCycles(job, 1);
        expect(salesReceived().size).toBe(25);
    });

    it('never lets sale items run ahead of their sales', async () => {
        seedSales(WINDOW + 20, { withItems: true });
        await runCycles(newJob(), 3);
        expect(salesReceived().size).toBe(WINDOW + 20);
        expect(itemsReceived().size).toBe(WINDOW + 20);
        expect(storedState?.retry.saleItems ?? []).toHaveLength(0);
    });

    it('gets past a full page of records that share one timestamp', async () => {
        seedSales(WINDOW + 10, { sameTimestamp: true });
        await runCycles(newJob(), 3);
        expect(salesReceived().size).toBe(WINDOW + 10);
    });
});
