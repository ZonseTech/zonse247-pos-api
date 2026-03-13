# Inventory & Stock Movement System Guide

> **For Frontend Developers**  
> Last Updated: March 7, 2026

## Table of Contents

1. [Overview](#overview)
2. [Golden Rule](#golden-rule)
3. [Movement Types](#movement-types)
4. [API Endpoints](#api-endpoints)
5. [Common Workflows](#common-workflows)
6. [Offline Sync Flow](#offline-sync-flow)
7. [Testing Checklist](#testing-checklist)
8. [Error Handling](#error-handling)

---

## Overview

The inventory system is built on an **immutable ledger** pattern. Instead of directly updating inventory quantities, we record stock movements. The current inventory is always the **sum of all movements**.

### Key Concepts

| Concept           | Description                                                               |
| ----------------- | ------------------------------------------------------------------------- |
| **Inventory**     | Cache table for fast reads. Contains `availableQuantity`, `version`, etc. |
| **StockMovement** | Immutable ledger entry. Records every inventory change.                   |
| **Movement Type** | Category of movement (SALE, RETURN, ADJUSTMENT, etc.)                     |
| **Reference**     | Links movement to source record (Sale ID, Return ID, etc.)                |

---

## Golden Rule

> **Never update inventory quantities directly.**  
> Always record a stock movement. The inventory cache is updated automatically.

### Why?

1. **Complete Audit Trail** - Every change is recorded with who, when, and why
2. **Offline Sync** - Movements from multiple terminals can be merged without conflicts
3. **Data Integrity** - Inventory can always be recalculated from movements
4. **Compliance** - Immutable records for tax/audit requirements

---

## Movement Types

### Increase Types (Add Stock)

| Type               | Description                           | When Used                                |
| ------------------ | ------------------------------------- | ---------------------------------------- |
| `PURCHASE_RECEIPT` | Stock received from supplier          | Receiving purchase orders, initial stock |
| `RETURN`           | Customer return                       | Processing refunds/returns               |
| `ADJUSTMENT`       | Manual increase                       | Stock count reconciliation (positive)    |
| `TRANSFER_IN`      | Stock transferred from another branch | Inter-branch transfers                   |

### Decrease Types (Remove Stock)

| Type           | Description                  | When Used               |
| -------------- | ---------------------------- | ----------------------- |
| `SALE`         | Stock sold to customer       | Processing sales        |
| `DAMAGE`       | Stock damaged/destroyed      | Recording damaged goods |
| `EXPIRY`       | Stock expired                | Recording expired goods |
| `TRANSFER_OUT` | Stock sent to another branch | Inter-branch transfers  |

### Reference Types

| Reference Type   | Used With Movement Types   |
| ---------------- | -------------------------- |
| `PURCHASE_ORDER` | PURCHASE_RECEIPT           |
| `SALE`           | SALE, RETURN (for voids)   |
| `RETURN`         | RETURN                     |
| `ADJUSTMENT`     | ADJUSTMENT, DAMAGE, EXPIRY |
| `TRANSFER`       | TRANSFER_IN, TRANSFER_OUT  |

---

## API Endpoints

### Base Path: `/api/stock-movements`

#### Record Operations

| Method | Endpoint       | Description                             |
| ------ | -------------- | --------------------------------------- |
| `POST` | `/`            | Record a single movement                |
| `POST` | `/sync`        | Sync movements from offline terminal    |
| `POST` | `/stock-count` | Record physical stock count             |
| `POST` | `/adjust`      | Record manual adjustment (+/-)          |
| `POST` | `/damage`      | Record damaged stock                    |
| `POST` | `/expiry`      | Record expired stock                    |
| `POST` | `/transfer`    | Record inter-branch transfer            |
| `POST` | `/correction`  | Create compensating movement for errors |

#### Query Operations

| Method | Endpoint              | Description                      |
| ------ | --------------------- | -------------------------------- |
| `GET`  | `/:id`                | Get single movement by ID        |
| `GET`  | `/variant/:variantId` | Get movements for a variant      |
| `GET`  | `/branch`             | Get movements for current branch |

#### Recalculation

| Method | Endpoint                    | Description                          |
| ------ | --------------------------- | ------------------------------------ |
| `POST` | `/recalculate/:inventoryId` | Recalculate inventory from movements |
| `POST` | `/recalculate-branch`       | Recalculate all branch inventory     |

---

## Common Workflows

### 1. Creating a Product with Initial Stock

```typescript
// POST /api/products
const product = await api.post("/products", {
  name: "Widget",
  categoryId: "cat-123",
  variants: [
    {
      sku: "WDG-001",
      sellingPrice: 100,
      costPrice: 50,
      quantity: 100, // Initial stock
      trackInventory: true,
    },
  ],
});

// Backend automatically creates:
// 1. Product record
// 2. ProductVariant record
// 3. Inventory record
// 4. StockMovement (PURCHASE_RECEIPT, qty: 100)
```

### 2. Processing a Sale

```typescript
// POST /api/sales
const sale = await api.post("/sales", {
  items: [
    { variantId: "var-123", quantity: 2, unitPrice: 100 },
    { variantId: "var-456", quantity: 1, unitPrice: 50 },
  ],
  payments: [{ paymentMethodId: "cash", amount: 250 }],
  userId: "user-123",
  terminalId: "term-001", // Important for offline sync!
});

// Backend automatically creates for each item:
// - SaleItem record
// - StockMovement (SALE, referenceId: sale.id)
// - Updates Inventory.availableQuantity
```

### 3. Voiding a Sale

```typescript
// PUT /api/sales/:saleId/void
await api.put(`/sales/${saleId}/void`, {
  voidReason: "Customer changed mind",
  voidedBy: "user-123",
});

// Backend automatically creates for each item:
// - StockMovement (RETURN) - compensating movement
// - Restores Inventory.availableQuantity
// - Sets sale.isVoided = true
```

### 4. Processing a Return

```typescript
// POST /api/returns
const returnData = await api.post("/returns", {
  originalSaleId: "sale-123",
  items: [{ saleItemId: "item-123", quantity: 1, reason: "Defective" }],
  refundAmount: 100,
  userId: "user-123",
});

// Creates RETURN movements for returned items
```

### 5. Stock Adjustment

```typescript
// POST /api/stock-movements/adjust
await api.post("/stock-movements/adjust", {
  inventoryId: "inv-123",
  quantity: 10, // Positive = increase, Negative = decrease
  notes: "Found extra stock during count",
});

// Creates ADJUSTMENT movement
```

### 6. Stock Count (Physical Inventory)

```typescript
// POST /api/stock-movements/stock-count
const result = await api.post("/stock-movements/stock-count", {
  inventoryId: "inv-123",
  actualQuantity: 95, // What you physically counted
  notes: "Monthly stock count",
});

// Response includes:
// {
//   movementId: 'mov-123',
//   variance: -5,  // System had 100, actual was 95
//   previousQuantity: 100,
//   newQuantity: 95
// }
```

---

## Offline Sync Flow

### How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Terminal A    │     │     Server      │     │   Terminal B    │
│ (offline sale)  │     │                 │     │ (offline sale)  │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  Local: stock 10→5    │                       │
         │  (sold 5 units)       │                       │
         │                       │    Local: stock 10→6  │
         │                       │    (sold 4 units)     │
         │                       │                       │
         ├───── PUSH movements ─►│                       │
         │                       │◄─── PUSH movements ───┤
         │                       │                       │
         │                       │  Server processes:    │
         │                       │  Insert A's movement  │
         │                       │  Insert B's movement  │
         │                       │  Recalculate: 10-5-4=1│
         │                       │                       │
         │◄──── PULL updates ────┤                       │
         │                       ├──── PULL updates ────►│
         │                       │                       │
         │  Local recalculates   │                       │  Local recalculates
         │  stock = 1 ✓          │                       │  stock = 1 ✓
         │                       │                       │
```

### Push Sync Order

**Important:** Send records in this order to satisfy foreign key constraints:

1. `Sales` (parent records)
2. `SaleItems` (references Sale)
3. `SalePayments` (references Sale)
4. `StockMovements` (references Sale via referenceId)

```typescript
// POST /api/sync/push
await api.post('/sync/push', {
  sales: [...],          // Process first
  saleItems: [...],      // Process second
  salePayments: [...],   // Process third
  stockMovements: [...], // Process last
});
```

### Sync Stock Movements

```typescript
// POST /api/stock-movements/sync
const result = await api.post("/stock-movements/sync", {
  movements: [
    {
      id: "mov-local-123", // UUID generated locally
      tenantId: "tenant-1",
      branchId: "branch-1",
      terminalId: "term-001", // Required for offline tracking
      variantId: "var-123",
      movementType: "SALE",
      quantity: 5,
      previousQuantity: 10,
      newQuantity: 5,
      referenceType: "SALE",
      referenceId: "sale-local-456",
      unitCost: 50,
      totalCost: 250,
      movedBy: "user-123",
      movementDate: "2026-03-07T10:30:00Z",
      createdAt: "2026-03-07T10:30:00Z",
    },
  ],
});

// Response:
// {
//   success: true,
//   processed: 1,
//   inserted: 1,
//   skipped: 0,           // Duplicates detected by ID
//   inventoriesRecalculated: 1,
//   errors: []
// }
```

---

## Testing Checklist

### ✅ 1. Creating Product with Initial Stock

**Test:** Create a new product with initial quantity.

**Expected:**

- Product and variant records created
- Inventory record created with `availableQuantity` = initial stock
- StockMovement created with:
  - `movementType` = `PURCHASE_RECEIPT` (or `ADJUSTMENT`)
  - `quantity` = initial stock
  - `previousQuantity` = 0
  - `newQuantity` = initial stock

**Verification Query:**

```sql
SELECT * FROM stock_movements
WHERE inventory_id = '<inventory_id>'
ORDER BY movement_date DESC LIMIT 1;
```

---

### ✅ 2. Completing a Sale

**Test:** Create a sale with multiple items.

**Expected:**

- Sale record created with `status` = `COMPLETED`
- SaleItem records created for each item
- For each item, StockMovement created with:
  - `movementType` = `SALE`
  - `referenceType` = `SALE`
  - `referenceId` = sale ID
  - `previousQuantity` = quantity before sale
  - `newQuantity` = previousQuantity - soldQuantity
- Inventory `availableQuantity` reduced by sold amount

**Verification:**

```typescript
// Before sale
const inventoryBefore = await api.get(`/inventory/${inventoryId}`);
console.log('Stock before:', inventoryBefore.availableQuantity); // e.g., 100

// Make sale
const sale = await api.post('/sales', { items: [{ variantId, quantity: 5 }], ... });

// After sale
const inventoryAfter = await api.get(`/inventory/${inventoryId}`);
console.log('Stock after:', inventoryAfter.availableQuantity); // Should be 95
```

---

### ✅ 3. Voiding a Sale

**Test:** Void a completed sale.

**Expected:**

- Sale record updated: `isVoided` = true, `voidedAt`, `voidedBy`, `voidReason` set
- For each item, StockMovement created with:
  - `movementType` = `RETURN`
  - `referenceType` = `SALE`
  - `referenceId` = voided sale ID
  - Quantity = original sold quantity
- Inventory `availableQuantity` restored to original

**Verification:**

```typescript
// Original stock: 100
// After sale of 5: 95
// After void: should be back to 100

const sale = await api.post('/sales', { items: [{ quantity: 5 }], ... });
let inv = await api.get(`/inventory/${inventoryId}`);
console.log('After sale:', inv.availableQuantity); // 95

await api.put(`/sales/${sale.id}/void`, { voidReason: 'Test', voidedBy: userId });
inv = await api.get(`/inventory/${inventoryId}`);
console.log('After void:', inv.availableQuantity); // 100 ✓
```

---

### ✅ 4. Partial Return

**Test:** Return only some items from a sale.

**Expected:**

- Return record created
- ReturnItem records created for returned items only
- StockMovement created only for returned items with:
  - `movementType` = `RETURN`
  - `quantity` = returned quantity (not full sale quantity)
- Inventory increased by returned amount only

**Verification:**

```typescript
// Sale: 5 red widgets + 3 blue widgets
// Return: only 2 red widgets

const returnData = await api.post("/returns", {
  originalSaleId: sale.id,
  items: [{ saleItemId: redWidgetItemId, quantity: 2 }],
});

// Red widget inventory should increase by 2
// Blue widget inventory should remain unchanged
```

---

### ✅ 5. Stock Adjustments

**Test:** Perform positive and negative stock adjustments.

**Expected:**

- StockMovement created with:
  - `movementType` = `ADJUSTMENT`
  - `referenceType` = `ADJUSTMENT`
  - `quantity` = adjustment amount (positive or negative)
  - `previousQuantity` and `newQuantity` correctly calculated
- Inventory `availableQuantity` updated

**Positive Adjustment:**

```typescript
// Stock: 95, adjust +10
await api.post("/stock-movements/adjust", {
  inventoryId,
  quantity: 10,
  notes: "Found additional stock",
});
// Stock should now be 105
```

**Negative Adjustment:**

```typescript
// Stock: 105, adjust -5
await api.post("/stock-movements/adjust", {
  inventoryId,
  quantity: -5,
  notes: "Damaged goods removed",
});
// Stock should now be 100
```

---

### ✅ 6. Offline Sync - Multiple Terminals

**Test:** Two terminals sell the same item while offline, then sync.

**Setup:**

```
Initial stock: 10 units
Terminal A (offline): Sells 5 units → local stock: 5
Terminal B (offline): Sells 4 units → local stock: 6 (hasn't seen A's sale)
```

**Sync Sequence:**

```typescript
// Terminal A syncs first
await api.post("/stock-movements/sync", {
  movements: [{ ...terminalAMovement, quantity: 5, movementType: "SALE" }],
});

// Terminal B syncs
await api.post("/stock-movements/sync", {
  movements: [{ ...terminalBMovement, quantity: 4, movementType: "SALE" }],
});

// Both pull updates
const serverInventory = await api.get(`/inventory/${inventoryId}`);
```

**Expected:**

- Server inserts both movements (no duplicates - different IDs)
- Server recalculates inventory: 10 - 5 - 4 = **1 unit**
- Both terminals pull and recalculate to **1 unit**
- **No conflicts!** (movements are additive)

---

### ✅ 7. Negative Stock Prevention

**Test:** Attempt sale when stock is insufficient and `allowNegativeStock` = false.

**Setup:**

```typescript
// Set inventory to disallow negative stock
await api.put(`/inventory/${inventoryId}`, { allowNegativeStock: false });
// Current stock: 3 units
```

**Test Case:**

```typescript
try {
  await api.post('/sales', {
    items: [{ variantId, quantity: 5 }], // Trying to sell 5, only have 3
    ...
  });
} catch (error) {
  // Expected error:
  // "Insufficient stock. Available: 3, Requested: 5"
}
```

**Expected:**

- Sale should be rejected with clear error message
- No StockMovement should be created
- Inventory should remain unchanged at 3 units

**When Allowed:**

```typescript
await api.put(`/inventory/${inventoryId}`, { allowNegativeStock: true });
const sale = await api.post('/sales', { items: [{ quantity: 5 }], ... });
// Sale succeeds, stock goes to -2
```

---

### ✅ 8. Movement Quantities Validation

**Test:** Verify all movements have correct `previousQuantity` and `newQuantity`.

**Test Sequence:**

```typescript
// Starting stock: 0
// Action 1: Add 100 units (PURCHASE_RECEIPT)
// Action 2: Sell 30 units (SALE)
// Action 3: Return 5 units (RETURN)
// Action 4: Adjust -10 units (ADJUSTMENT)

const movements = await api.get(`/stock-movements/variant/${variantId}`);

// Expected movements (newest first):
// Movement 4: prev=75, new=65, type=ADJUSTMENT, qty=10
// Movement 3: prev=70, new=75, type=RETURN, qty=5
// Movement 2: prev=100, new=70, type=SALE, qty=30
// Movement 1: prev=0, new=100, type=PURCHASE_RECEIPT, qty=100
```

**Validation Rules:**

- `newQuantity` = `previousQuantity` + `quantity` (for increase types)
- `newQuantity` = `previousQuantity` - `quantity` (for decrease types)
- Each movement's `newQuantity` should equal the next movement's `previousQuantity`
- Final inventory `availableQuantity` should equal the latest movement's `newQuantity`

---

## Error Handling

### Common Errors

| Error                           | Cause                               | Solution                                                |
| ------------------------------- | ----------------------------------- | ------------------------------------------------------- |
| `Insufficient stock`            | Sale exceeds available quantity     | Check stock before sale, or enable `allowNegativeStock` |
| `Inventory not found`           | Invalid inventoryId or variantId    | Verify product/variant exists                           |
| `Movement already exists`       | Duplicate movement ID during sync   | Safe to ignore - movement already recorded              |
| `Stock movements are immutable` | Attempted to update/delete movement | Use compensating movement instead                       |

### Creating Corrections

If a movement was recorded incorrectly:

```typescript
// DON'T try to update or delete the movement!

// DO create a compensating movement:
await api.post("/stock-movements/correction", {
  originalMovementId: "mov-123", // The incorrect movement
  reason: "Quantity was entered incorrectly - should have been 3 not 30",
});

// This creates a new ADJUSTMENT movement that reverses the original
```

---

## Quick Reference

### Movement Flow Summary

```
┌──────────────────────────────────────────────────────────────────┐
│                        INVENTORY CHANGES                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Create Product (initial stock)                                  │
│     └─► PURCHASE_RECEIPT movement                                │
│                                                                  │
│  Sale                                                            │
│     └─► SALE movement (decreases stock)                          │
│                                                                  │
│  Void Sale                                                       │
│     └─► RETURN movement (restores stock)                         │
│                                                                  │
│  Customer Return                                                 │
│     └─► RETURN movement (increases stock)                        │
│                                                                  │
│  Stock Count                                                     │
│     └─► ADJUSTMENT movement (matches physical count)             │
│                                                                  │
│  Manual Adjustment                                               │
│     └─► ADJUSTMENT movement (+/-)                                │
│                                                                  │
│  Damaged Goods                                                   │
│     └─► DAMAGE movement (decreases stock)                        │
│                                                                  │
│  Expired Goods                                                   │
│     └─► EXPIRY movement (decreases stock)                        │
│                                                                  │
│  Transfer Out                                                    │
│     └─► TRANSFER_OUT movement (decreases source)                 │
│                                                                  │
│  Transfer In                                                     │
│     └─► TRANSFER_IN movement (increases destination)             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Key Timestamps

| Field          | Description                                       |
| -------------- | ------------------------------------------------- |
| `movementDate` | When the movement logically occurred              |
| `createdAt`    | When the record was created (offline: local time) |
| `updatedAt`    | Last modified (for soft delete)                   |

### Version Field

Every `Inventory` update increments `version`. Use for optimistic locking:

```typescript
// Read current version
const inv = await api.get(`/inventory/${id}`);

// Make change
await api.put(`/inventory/${id}`, {
  ...changes,
  expectedVersion: inv.version, // Optional: fail if version changed
});
```

---

## Support

For questions or issues:

1. Check this documentation first
2. Review API error messages
3. Contact backend team with:
   - Request/response payloads
   - Movement IDs involved
   - Expected vs actual behavior
