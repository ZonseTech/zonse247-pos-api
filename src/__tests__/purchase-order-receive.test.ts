/**
 * POST /v1/purchase-orders/:purchaseOrderId/receive
 *
 * Covers the three layers the route owns:
 *   1. body validation  (purchaseOrderSchemas.receivePurchaseOrder via validateBody)
 *   2. controller       (PurchaseOrderController.receivePurchaseOrder)
 *   3. quick receive    (GoodsReceiptService.quickReceive — PO lookup + item mapping + create/verify/post)
 */
import { validateBody } from '../middlewares/validation.middleware';
import { purchaseOrderSchemas } from '../validations/purchase-order.schemas';
import { PurchaseOrderController } from '../controllers/purchase-order.controller';
import { PurchaseOrderService } from '../services/inventory/purchase-order.service';
import { ProcurementAuditService } from '../services/procurement-audit.service';
import { GoodsReceiptService } from '../services/inventory/goods-receipt.service';
import { prisma } from '../databases/prisma/client';

jest.mock('../databases/prisma/client', () => {
    const tx = { purchaseOrder: { findFirst: jest.fn() } };
    const mockPrisma = {
        __tx: tx,
        $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
        purchaseOrder: { findFirst: jest.fn() },
    };
    return { __esModule: true, default: mockPrisma, prisma: mockPrisma };
});

jest.mock('../services/procurement-audit.service', () => ({
    ProcurementAuditService: { logStatusChange: jest.fn() },
}));

jest.mock('../services/inventory/inventory-valuation.service', () => ({
    InventoryValuationService: { addCostLayer: jest.fn(), consumeCostLayers: jest.fn() },
}));

const tx = (prisma as any).__tx as { purchaseOrder: { findFirst: jest.Mock } };

function mockResponse() {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

const validItem = { variantId: 'var-1', receivedQuantity: 10, damagedQuantity: 0 };

// ─── 1. Validation ─────────────────────────────────────────────────

describe('receive purchase order — body validation', () => {
    const middleware = validateBody(purchaseOrderSchemas.receivePurchaseOrder);

    function run(body: unknown) {
        const res = mockResponse();
        const next = jest.fn();
        middleware({ body } as any, res, next);
        return { res, next };
    }

    test('accepts a valid body', () => {
        const { res, next } = run({ items: [validItem, { variantId: 'var-2', receivedQuantity: 0, damagedQuantity: 3 }] });
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    test.each([
        ['missing items', {}],
        ['empty items', { items: [] }],
        ['missing variantId', { items: [{ receivedQuantity: 1, damagedQuantity: 0 }] }],
        ['missing receivedQuantity', { items: [{ variantId: 'v', damagedQuantity: 0 }] }],
        ['missing damagedQuantity', { items: [{ variantId: 'v', receivedQuantity: 1 }] }],
        ['negative receivedQuantity', { items: [{ ...validItem, receivedQuantity: -1 }] }],
        ['negative damagedQuantity', { items: [{ ...validItem, damagedQuantity: -1 }] }],
        ['fractional quantity', { items: [{ ...validItem, receivedQuantity: 1.5 }] }],
    ])('rejects %s with 400', (_label, body) => {
        const { res, next } = run(body);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Validation Error' }));
    });
});

// ─── 2. Controller ─────────────────────────────────────────────────

describe('receive purchase order — controller', () => {
    const receivedPo = { id: 'po-1', poNumber: 'PO-0001', status: 'RECEIVED' };
    let receiveSpy: jest.SpyInstance;

    beforeEach(() => {
        receiveSpy = jest.spyOn(PurchaseOrderService, 'receivePurchaseOrder').mockResolvedValue(receivedPo as any);
    });

    afterEach(() => receiveSpy.mockRestore());

    function makeReq(auth: Record<string, unknown>) {
        return {
            params: { purchaseOrderId: 'po-1' },
            body: { items: [validItem] },
            auth: { tenantId: 't-1', branchId: 'b-home', userId: 'u-1', ...auth },
        } as any;
    }

    test('receives against the active branch and records the receiving user', async () => {
        const res = mockResponse();
        await PurchaseOrderController.receivePurchaseOrder(makeReq({ activeBranchId: 'b-active' }), res);

        expect(receiveSpy).toHaveBeenCalledWith('po-1', 't-1', 'b-active', {
            items: [validItem],
            receivedBy: 'u-1',
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Purchase order received successfully',
            data: receivedPo,
        });
    });

    test('falls back to the home branch when no active branch is set', async () => {
        await PurchaseOrderController.receivePurchaseOrder(makeReq({}), mockResponse());
        expect(receiveSpy).toHaveBeenCalledWith('po-1', 't-1', 'b-home', expect.any(Object));
    });

    test('writes a SENT → new-status audit entry', async () => {
        await PurchaseOrderController.receivePurchaseOrder(makeReq({ activeBranchId: 'b-active' }), mockResponse());

        expect(ProcurementAuditService.logStatusChange).toHaveBeenCalledWith(
            { tenantId: 't-1', branchId: 'b-active', userId: 'u-1' },
            'receive',
            'PurchaseOrder',
            'po-1',
            'PO-0001',
            'SENT',
            'RECEIVED',
            { itemCount: 1 }
        );
    });

    test('returns 400 with the service error and skips the audit when receiving fails', async () => {
        receiveSpy.mockRejectedValue(new Error('Purchase order not found'));
        const res = mockResponse();

        await PurchaseOrderController.receivePurchaseOrder(makeReq({}), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Failed to receive purchase order',
            error: 'Purchase order not found',
        });
        expect(ProcurementAuditService.logStatusChange).not.toHaveBeenCalled();
    });
});

// ─── 3. Quick receive ──────────────────────────────────────────────

describe('receive purchase order — GoodsReceiptService.quickReceive', () => {
    const po = {
        id: 'po-1',
        items: [
            { id: 'poi-1', variantId: 'var-1', unitPrice: '12.50' },
            { id: 'poi-2', variantId: 'var-2', unitPrice: '4.00' },
        ],
    };
    let createStep: jest.SpyInstance;
    let verifyStep: jest.SpyInstance;
    let postStep: jest.SpyInstance;

    beforeEach(() => {
        tx.purchaseOrder.findFirst.mockResolvedValue(po);
        createStep = jest.spyOn(GoodsReceiptService as any, '_createStep').mockResolvedValue({ id: 'grn-1' });
        verifyStep = jest.spyOn(GoodsReceiptService as any, '_verifyStep').mockResolvedValue(undefined);
        postStep = jest.spyOn(GoodsReceiptService as any, '_postStep').mockResolvedValue({ id: 'grn-1', status: 'POSTED' });
    });

    afterEach(() => {
        createStep.mockRestore();
        verifyStep.mockRestore();
        postStep.mockRestore();
    });

    test('looks the PO up inside a transaction, scoped to tenant and branch', async () => {
        await GoodsReceiptService.quickReceive('po-1', 't-1', 'b-1', 'u-1', [validItem]);

        expect(prisma.$transaction).toHaveBeenCalled();
        expect(tx.purchaseOrder.findFirst).toHaveBeenCalledWith({
            where: { id: 'po-1', tenantId: 't-1', branchId: 'b-1', deletedAt: null },
            include: { items: { where: { deletedAt: null } } },
        });
    });

    test('maps request items onto PO lines, damaged → rejected', async () => {
        await GoodsReceiptService.quickReceive('po-1', 't-1', 'b-1', 'u-1', [
            { variantId: 'var-1', receivedQuantity: 10, damagedQuantity: 0 },
            { variantId: 'var-2', receivedQuantity: 5, damagedQuantity: 2 },
        ]);

        expect(createStep).toHaveBeenCalledWith(
            tx,
            {
                purchaseOrderId: 'po-1',
                items: [
                    {
                        purchaseOrderItemId: 'poi-1',
                        variantId: 'var-1',
                        receivedQuantity: 10,
                        rejectedQuantity: 0,
                        rejectionReason: undefined,
                        unitCost: 12.5,
                    },
                    {
                        purchaseOrderItemId: 'poi-2',
                        variantId: 'var-2',
                        receivedQuantity: 5,
                        rejectedQuantity: 2,
                        rejectionReason: 'Damaged (Quick Receive)',
                        unitCost: 4,
                    },
                ],
            },
            't-1',
            'b-1',
            'u-1'
        );
    });

    test('creates, verifies, then posts the GRN and returns the posted receipt', async () => {
        const result = await GoodsReceiptService.quickReceive('po-1', 't-1', 'b-1', 'u-1', [validItem]);

        expect(verifyStep).toHaveBeenCalledWith(tx, 'grn-1', 't-1', 'b-1');
        expect(postStep).toHaveBeenCalledWith(tx, 'grn-1', 't-1', 'b-1', 'u-1');
        expect(createStep.mock.invocationCallOrder[0]).toBeLessThan(verifyStep.mock.invocationCallOrder[0]);
        expect(verifyStep.mock.invocationCallOrder[0]).toBeLessThan(postStep.mock.invocationCallOrder[0]);
        expect(result).toEqual({ id: 'grn-1', status: 'POSTED' });
    });

    test('throws when the PO does not exist in this tenant/branch', async () => {
        tx.purchaseOrder.findFirst.mockResolvedValue(null);

        await expect(
            GoodsReceiptService.quickReceive('po-x', 't-1', 'b-1', 'u-1', [validItem])
        ).rejects.toThrow('Purchase order not found');
        expect(createStep).not.toHaveBeenCalled();
    });

    test('throws when an item variant is not on the PO, before creating anything', async () => {
        await expect(
            GoodsReceiptService.quickReceive('po-1', 't-1', 'b-1', 'u-1', [
                validItem,
                { variantId: 'var-999', receivedQuantity: 1, damagedQuantity: 0 },
            ])
        ).rejects.toThrow('Variant var-999 not found in purchase order');
        expect(createStep).not.toHaveBeenCalled();
    });
});

// ─── 4. Full pipeline: short delivery with damage ──────────────────
//
// Ordered 10, received 8 good + 2 damaged (10 delivered in total).
// Runs the real create → verify → post steps and StockMovementService against
// an in-memory transaction, so the resulting PO / inventory state is asserted end-to-end.

function applyUpdate(target: any, data: Record<string, any>) {
    for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === 'object' && 'increment' in value) {
            target[key] = (target[key] ?? 0) + value.increment;
        } else {
            target[key] = value;
        }
    }
}

function createFakeDb(seed: { orderedQuantity: number; availableQuantity: number }) {
    const poItem = {
        id: 'poi-1',
        purchaseOrderId: 'po-1',
        variantId: 'var-1',
        orderedQuantity: seed.orderedQuantity,
        receivedQuantity: 0,
        damagedQuantity: 0,
        unitPrice: '12.50',
        deletedAt: null,
    };
    const po = { id: 'po-1', status: 'SENT', isLocked: false, items: [poItem] };
    const inventory = {
        id: 'inv-1',
        variantId: 'var-1',
        availableQuantity: seed.availableQuantity,
        damagedQuantity: 0,
        averageCost: 12.5,
        allowNegativeStock: false,
        costingMethod: 'WEIGHTED_AVERAGE',
    };
    const receipts: any[] = [];
    const movements: any[] = [];

    const sumGrnItems = (purchaseOrderItemId: string) =>
        receipts
            .filter((grn) => grn.status !== 'CANCELLED')
            .flatMap((grn) => grn.items)
            .filter((item: any) => item.purchaseOrderItemId === purchaseOrderItemId)
            .reduce(
                (sum: any, item: any) => ({
                    receivedQuantity: sum.receivedQuantity + item.receivedQuantity,
                    rejectedQuantity: sum.rejectedQuantity + item.rejectedQuantity,
                }),
                { receivedQuantity: 0, rejectedQuantity: 0 }
            );

    const db = {
        purchaseOrder: {
            findFirst: jest.fn(async () => po),
            update: jest.fn(async ({ data }: any) => applyUpdate(po, data)),
        },
        purchaseOrderItem: {
            update: jest.fn(async ({ data }: any) => applyUpdate(poItem, data)),
            findMany: jest.fn(async () => [poItem]),
        },
        goodsReceipt: {
            findFirst: jest.fn(async ({ where }: any) => {
                const grn = receipts.find((r) => r.id === where.id) ?? null;
                return grn && { ...grn, purchaseOrder: po };
            }),
            create: jest.fn(async ({ data }: any) => {
                const grn = { ...data, items: data.items.create };
                receipts.push(grn);
                return grn;
            }),
            update: jest.fn(async ({ where, data }: any) => {
                const grn = receipts.find((r) => r.id === where.id);
                applyUpdate(grn, data);
                return grn;
            }),
        },
        goodsReceiptItem: {
            aggregate: jest.fn(async ({ where }: any) => ({ _sum: sumGrnItems(where.purchaseOrderItemId) })),
        },
        inventory: {
            findFirst: jest.fn(async () => inventory),
            findUnique: jest.fn(async () => inventory),
            update: jest.fn(async ({ data }: any) => applyUpdate(inventory, data)),
        },
        stockMovement: {
            create: jest.fn(async ({ data }: any) => movements.push(data)),
        },
    };

    return { db, po, poItem, inventory, receipts, movements };
}

describe('receive purchase order — ordered 10, received 8, damaged 2', () => {
    let fake: ReturnType<typeof createFakeDb>;

    beforeEach(async () => {
        fake = createFakeDb({ orderedQuantity: 10, availableQuantity: 5 });
        (prisma.$transaction as jest.Mock).mockImplementationOnce((cb: any) => cb(fake.db));

        await GoodsReceiptService.quickReceive('po-1', 't-1', 'b-1', 'u-1', [
            { variantId: 'var-1', receivedQuantity: 8, damagedQuantity: 2 },
        ]);
    });

    test('posts a GRN recording 8 received and 2 rejected as damaged', () => {
        expect(fake.receipts).toHaveLength(1);
        expect(fake.receipts[0].status).toBe('POSTED');
        expect(fake.receipts[0].items).toEqual([
            expect.objectContaining({
                purchaseOrderItemId: 'poi-1',
                receivedQuantity: 8,
                rejectedQuantity: 2,
                rejectionReason: 'Damaged (Quick Receive)',
                totalCost: 100,
            }),
        ]);
    });

    test('rolls 8 received / 2 damaged onto the PO line', () => {
        expect(fake.poItem.receivedQuantity).toBe(8);
        expect(fake.poItem.damagedQuantity).toBe(2);
    });

    test('marks the PO RECEIVED and locks it, since 8 + 2 covers the 10 ordered', () => {
        expect(fake.po.status).toBe('RECEIVED');
        expect(fake.po.isLocked).toBe(true);
    });

    test('tracks the 2 damaged units on the inventory record', () => {
        expect(fake.inventory.damagedQuantity).toBe(2);
    });

    test('adds only the 8 good units to available stock (5 on hand → 13)', () => {
        expect(fake.inventory.availableQuantity).toBe(13);
    });
});

describe('receive purchase order — stock ledger for damaged deliveries', () => {
    async function receive(orderedQuantity: number, receivedQuantity: number, damagedQuantity: number) {
        const fake = createFakeDb({ orderedQuantity, availableQuantity: 5 });
        (prisma.$transaction as jest.Mock).mockImplementationOnce((cb: any) => cb(fake.db));
        await GoodsReceiptService.quickReceive('po-1', 't-1', 'b-1', 'u-1', [
            { variantId: 'var-1', receivedQuantity, damagedQuantity },
        ]);
        return fake;
    }

    test('ordered 10, received 8, damaged 2: receipt of 10 delivered, then damage write-off of 2', async () => {
        const fake = await receive(10, 8, 2);

        expect(fake.movements.map((m) => [m.movementType, m.quantity, m.previousQuantity, m.newQuantity])).toEqual([
            ['PURCHASE_RECEIPT', 10, 5, 15],
            ['DAMAGE', 2, 15, 13],
        ]);
    });

    test('all units damaged: still records the delivery and write-off, stock unchanged', async () => {
        const fake = await receive(3, 0, 3);

        expect(fake.movements.map((m) => [m.movementType, m.quantity])).toEqual([
            ['PURCHASE_RECEIPT', 3],
            ['DAMAGE', 3],
        ]);
        expect(fake.inventory.availableQuantity).toBe(5);
        expect(fake.inventory.damagedQuantity).toBe(3);
        expect(fake.po.status).toBe('RECEIVED');
    });
});
