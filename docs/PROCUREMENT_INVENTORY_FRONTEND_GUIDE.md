# Procurement & Inventory System — Frontend Integration Guide

> **Base URL:** `/v1` (e.g. `http://localhost:3000/v1`)
>
> **Auth:** All endpoints require `Authorization: Bearer <token>` plus headers `x-tenant-id`, `x-branch-id`, `x-client-type`.
>
> **Response envelope:** `{ success: boolean, message: string, data?: T, error?: string }`

---

## Table of Contents

1. [Procurement Lifecycle](#1-procurement-lifecycle)
2. [Supplier Returns & Credit Notes](#2-supplier-returns--credit-notes)
3. [Stock Movements & Adjustments](#3-stock-movements--adjustments)
4. [Inventory Valuation & Reports](#4-inventory-valuation--reports)
5. [Workflow Diagrams](#5-workflow-diagrams)
6. [Movement Types Reference](#6-movement-types-reference)
7. [Key Response Shapes](#7-key-response-shapes)

---

## 1. Procurement Lifecycle

The procurement workflow follows: **Requisition → Purchase Order → Goods Receipt → Supplier Invoice → Supplier Payment**.

### 1.1 Purchase Requisitions — `/v1/purchase-requisitions`

**Statuses:** `PENDING` → `APPROVED` | `PARTIALLY_APPROVED` | `REJECTED` | `CANCELLED`

| Method   | Path                      | Description           | Key Fields                                                                            |
| -------- | ------------------------- | --------------------- | ------------------------------------------------------------------------------------- |
| `POST`   | `/`                       | Create requisition    | **Body:** `items*` (`variantId*`, `requestedQuantity*` ≥1, `notes?`), `notes?`        |
| `GET`    | `/`                       | List requisitions     | **Query:** `status?`, `requestedBy?`, `page?`, `limit?` (max 100)                     |
| `GET`    | `/:requisitionId`         | Get single            | —                                                                                     |
| `PUT`    | `/:requisitionId`         | Update (PENDING only) | **Body:** `notes?`, `items?`                                                          |
| `POST`   | `/:requisitionId/approve` | Approve               | **Body:** `items?` (`variantId*`, `approvedQuantity*` ≥0) — supports partial approval |
| `POST`   | `/:requisitionId/reject`  | Reject                | **Body:** `rejectedReason?`                                                           |
| `POST`   | `/:requisitionId/cancel`  | Cancel                | —                                                                                     |
| `DELETE` | `/:requisitionId`         | Delete                | —                                                                                     |

### 1.2 Purchase Orders — `/v1/purchase-orders`

**Statuses:** `DRAFT` → `SENT` → `PARTIALLY_RECEIVED` | `RECEIVED` | `CANCELLED`

| Method   | Path                        | Description                      | Key Fields                                                                                                                                              |
| -------- | --------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/`                         | Create PO                        | **Body:** `supplierId*`, `items*` (`variantId*`, `orderedQuantity*` ≥1, `unitPrice*` ≥0, `notes?`), `requisitionId?`, `expectedDeliveryDate?`, `notes?` |
| `POST`   | `/from-requisition`         | Create from approved requisition | **Body:** `requisitionId*`, `supplierId*`, `itemPrices*` (`variantId*`, `unitPrice*`), `expectedDeliveryDate?`, `notes?`                                |
| `GET`    | `/`                         | List POs                         | **Query:** `status?`, `supplierId?`, `requisitionId?`, `page?`, `limit?`                                                                                |
| `GET`    | `/:purchaseOrderId`         | Get PO + items                   | —                                                                                                                                                       |
| `PUT`    | `/:purchaseOrderId`         | Update (DRAFT only)              | **Body:** `supplierId?`, `expectedDeliveryDate?`, `notes?`, `items?`                                                                                    |
| `POST`   | `/:purchaseOrderId/send`    | Mark as sent                     | —                                                                                                                                                       |
| `POST`   | `/:purchaseOrderId/receive` | Quick receive                    | **Body:** `items*` (`variantId*`, `receivedQuantity*` ≥0, `damagedQuantity*` ≥0)                                                                        |
| `POST`   | `/:purchaseOrderId/cancel`  | Cancel                           | —                                                                                                                                                       |
| `DELETE` | `/:purchaseOrderId`         | Delete                           | —                                                                                                                                                       |

### 1.3 Goods Receipts (GRN) — `/v1/goods-receipts`

**Statuses:** `DRAFT` → `VERIFIED` → `POSTED` | `CANCELLED`

> ⚠️ **Stock only moves when a GRN is POSTED.** This is the trigger for inventory increases and cost layer creation.

| Method   | Path                      | Description                                | Key Fields                                                                                                                                                                         |
| -------- | ------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/`                       | Create GRN                                 | **Body:** `purchaseOrderId*`, `items*` (`purchaseOrderItemId*`, `variantId*`, `receivedQuantity*` ≥0, `unitCost*` ≥0, `rejectedQuantity?`, `rejectionReason?`, `notes?`), `notes?` |
| `GET`    | `/`                       | List GRNs                                  | **Query:** `status?`, `purchaseOrderId?`, `page?`, `limit?`                                                                                                                        |
| `GET`    | `/:goodsReceiptId`        | Get GRN + items                            | —                                                                                                                                                                                  |
| `PUT`    | `/:goodsReceiptId`        | Update (DRAFT only)                        | **Body:** `notes?`, `items?`                                                                                                                                                       |
| `POST`   | `/:goodsReceiptId/verify` | DRAFT → VERIFIED                           | **Body:** `notes?`                                                                                                                                                                 |
| `POST`   | `/:goodsReceiptId/post`   | VERIFIED → POSTED **(stock arrives here)** | **Body:** `notes?`                                                                                                                                                                 |
| `POST`   | `/:goodsReceiptId/cancel` | Cancel GRN                                 | —                                                                                                                                                                                  |
| `DELETE` | `/:goodsReceiptId`        | Delete                                     | —                                                                                                                                                                                  |

### 1.4 Supplier Invoices — `/v1/supplier-invoices`

**Statuses:** `PENDING` → `PARTIALLY_PAID` → `PAID` | `OVERDUE` | `CANCELLED` | `DISPUTED`

| Method   | Path                      | Description                              | Key Fields                                                                                                                                                                                                                                                                                 |
| -------- | ------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST`   | `/`                       | Create invoice                           | **Body:** `supplierId*`, `invoiceNumber*`, `invoiceDate*`, `items*` (`variantId*`, `quantity*` ≥1, `unitPrice*` ≥0, `purchaseOrderItemId?`, `taxRate?`, `taxAmount?`, `discountAmount?`, `notes?`), `purchaseOrderId?`, `dueDate?`, `subtotal?`, `taxAmount?`, `discountAmount?`, `notes?` |
| `GET`    | `/`                       | List invoices                            | **Query:** `status?`, `supplierId?`, `purchaseOrderId?`, `page?`, `limit?`                                                                                                                                                                                                                 |
| `GET`    | `/:invoiceId`             | Get invoice                              | —                                                                                                                                                                                                                                                                                          |
| `GET`    | `/match/:purchaseOrderId` | **Three-way match** (PO ↔ GRN ↔ Invoice) | Returns comparison of ordered vs received vs invoiced quantities                                                                                                                                                                                                                           |
| `GET`    | `/balance/:supplierId`    | Get supplier balance (total owed)        | —                                                                                                                                                                                                                                                                                          |
| `PUT`    | `/:invoiceId`             | Update                                   | **Body:** `dueDate?`, `taxAmount?`, `discountAmount?`, `notes?`, `items?`                                                                                                                                                                                                                  |
| `POST`   | `/:invoiceId/cancel`      | Cancel                                   | —                                                                                                                                                                                                                                                                                          |
| `POST`   | `/:invoiceId/dispute`     | Flag as disputed                         | **Body:** `reason?`                                                                                                                                                                                                                                                                        |
| `DELETE` | `/:invoiceId`             | Delete                                   | —                                                                                                                                                                                                                                                                                          |

### 1.5 Supplier Payments — `/v1/supplier-payments`

**Statuses:** `PENDING` | `COMPLETED` | `FAILED` | `REFUNDED` | `CANCELLED`

| Method | Path                  | Description             | Key Fields                                                                                                                                                               |
| ------ | --------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST` | `/`                   | Create payment          | **Body:** `supplierId*` (uuid), `amount*` > 0, `allocations*` (`invoiceId*`, `allocatedAmount*` > 0, `notes?`), `paymentDate?`, `paymentMethod?`, `reference?`, `notes?` |
| `GET`  | `/`                   | List payments           | **Query:** `status?`, `supplierId?`, `page?` (def 1), `limit?` (def 50, max 200)                                                                                         |
| `GET`  | `/:paymentId`         | Get payment             | —                                                                                                                                                                        |
| `GET`  | `/invoice/:invoiceId` | Payments for an invoice | —                                                                                                                                                                        |
| `POST` | `/:paymentId/void`    | Void payment            | **Body:** `reason?`                                                                                                                                                      |

---

## 2. Supplier Returns & Credit Notes

### 2.1 Supplier Returns — `/v1/supplier-returns`

**Statuses:** `DRAFT` → `APPROVED` → `SHIPPED` → `COMPLETED` | `CANCELLED`

> ⚠️ **Stock impact only at COMPLETED** — inventory is reduced, WAC adjusted, and a credit note is auto-generated. Safe to draft/approve without touching inventory.

| Method   | Path                          | Description                          | Key Fields                                                                                                                                                                                     |
| -------- | ----------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/`                           | Create return (DRAFT)                | **Body:** `supplierId*`, `items*` (`variantId*`, `returnQuantity*` ≥1, `unitCost*` ≥0, `goodsReceiptItemId?`, `reason?`, `notes?`), `purchaseOrderId?`, `goodsReceiptId?`, `reason?`, `notes?` |
| `GET`    | `/`                           | List returns                         | **Query:** `status?`, `supplierId?`, `purchaseOrderId?`, `page?`, `limit?`                                                                                                                     |
| `GET`    | `/:supplierReturnId`          | Get return + items + credit notes    | —                                                                                                                                                                                              |
| `PUT`    | `/:supplierReturnId`          | Update (DRAFT only)                  | **Body:** `reason?`, `notes?`, `items?`                                                                                                                                                        |
| `POST`   | `/:supplierReturnId/approve`  | DRAFT → APPROVED                     | **Body:** `notes?`                                                                                                                                                                             |
| `POST`   | `/:supplierReturnId/ship`     | APPROVED → SHIPPED                   | **Body:** `notes?`                                                                                                                                                                             |
| `POST`   | `/:supplierReturnId/complete` | → COMPLETED **(stock removed here)** | **Body:** `notes?`                                                                                                                                                                             |
| `POST`   | `/:supplierReturnId/cancel`   | → CANCELLED (from DRAFT or APPROVED) | **Body:** `notes?`                                                                                                                                                                             |
| `DELETE` | `/:supplierReturnId`          | Delete (DRAFT only)                  | —                                                                                                                                                                                              |

### 2.2 Credit Notes — Sub-routes on `/v1/supplier-returns`

| Method | Path                                | Description                | Key Fields                                                                           |
| ------ | ----------------------------------- | -------------------------- | ------------------------------------------------------------------------------------ |
| `GET`  | `/credit-notes`                     | List all credit notes      | **Query:** `status?` (PENDING\|APPLIED\|CANCELLED), `supplierId?`, `page?`, `limit?` |
| `POST` | `/credit-notes/:creditNoteId/apply` | Apply credit to an invoice | **Body:** `invoiceId*`, `notes?` — reduces invoice `balanceDue`                      |

---

## 3. Stock Movements & Adjustments

### Base path: `/v1/stock-movements`

> **Golden rule:** Never update inventory quantities directly. Always record a stock movement — the inventory cache is updated atomically by the backend.

### 3.1 Record Operations

| Method | Path           | Description                     | Body Fields                                                                                                                             |
| ------ | -------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/`            | Record generic movement         | `movementType*`, `quantity*` ≥1, `variantId?` or `inventoryId?` (one required), `referenceType?`, `referenceId?`, `unitCost?`, `notes?` |
| `POST` | `/stock-count` | Physical count reconciliation   | `inventoryId*`, `actualQuantity*` ≥0, `unitCost?`, `notes?`                                                                             |
| `POST` | `/adjust`      | Manual adjustment (+/−)         | `inventoryId*`, `quantity*` (non-zero), `unitCost?`, `notes?`                                                                           |
| `POST` | `/damage`      | Record damage                   | `inventoryId*`, `quantity*` ≥1, `unitCost?`, `notes?`                                                                                   |
| `POST` | `/expiry`      | Record expiry                   | `inventoryId*`, `quantity*` ≥1, `unitCost?`, `expiryDate?`, `notes?`                                                                    |
| `POST` | `/transfer`    | Inter-branch transfer           | `sourceInventoryId*`, `destinationBranchId*`, `destinationInventoryId*`, `quantity*` ≥1, `transferId*`, `unitCost?`, `notes?`           |
| `POST` | `/correction`  | Reverse a prior movement        | `originalMovementId*`, `reason*` (min 5 chars)                                                                                          |
| `POST` | `/sync`        | Bulk sync from offline terminal | `movements*` array (see shape below)                                                                                                    |

> **`unitCost` is optional on adjust/damage/expiry/transfer** — if omitted, the backend auto-resolves from the item's current weighted average cost.

### 3.2 Query Operations

| Method | Path                  | Description                   | Params                                                                            |
| ------ | --------------------- | ----------------------------- | --------------------------------------------------------------------------------- |
| `GET`  | `/:id`                | Get single movement           | —                                                                                 |
| `GET`  | `/variant/:variantId` | History for a variant         | **Query:** `page?`, `perPage?` (def 50)                                           |
| `GET`  | `/branch`             | Branch movements (filterable) | **Query:** `movementType?`, `startDate?`, `endDate?`, `page?`, `limit?` (def 100) |

### 3.3 Data Repair

| Method | Path                        | Description                        |
| ------ | --------------------------- | ---------------------------------- |
| `POST` | `/recalculate/:inventoryId` | Rebuild single item from movements |
| `POST` | `/recalculate-branch`       | Rebuild all branch inventory       |

---

## 4. Inventory Valuation & Reports

### Base path: `/v1/inventory-valuation`

**Costing methods:** `WEIGHTED_AVERAGE` | `FIFO` | `LIFO` (configurable per item)

### 4.1 Valuation

| Method | Path                        | Description                                                          |
| ------ | --------------------------- | -------------------------------------------------------------------- |
| `GET`  | `/summary`                  | Full branch valuation (WAC + FIFO + LIFO totals, per-item breakdown) |
| `GET`  | `/:inventoryId`             | Single item: WAC/FIFO/LIFO values + cost layers                      |
| `GET`  | `/:inventoryId/cost-layers` | Remaining (non-depleted) cost layers                                 |

### 4.2 COGS

| Method | Path                      | Description                                                | Params                                                      |
| ------ | ------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------- |
| `GET`  | `/cogs/period`            | Period COGS from **stock movement ledger** (authoritative) | **Query:** `startDate*`, `endDate*`, `branchId?`            |
| `GET`  | `/cogs/period-from-sales` | Period COGS from **sale_items** (cross-check)              | **Query:** `startDate*`, `endDate*`, `branchId?`            |
| `POST` | `/cogs`                   | Preview COGS for quantity (read-only)                      | **Body:** `inventoryId*`, `quantity*` ≥1, `overrideMethod?` |

> Both period endpoints should yield identical `totalCOGS`. If they diverge, it signals a data integrity issue.

### 4.3 Profitability & Aging

| Method | Path                       | Description                           | Params                                                |
| ------ | -------------------------- | ------------------------------------- | ----------------------------------------------------- |
| `GET`  | `/gross-profit/by-product` | Gross profit per product/variant      | **Query:** `startDate*`, `endDate*`, `branchId?`      |
| `GET`  | `/aging`                   | Inventory aging / slow-mover analysis | **Query:** `thresholdDays?` (default 90), `branchId?` |

### 4.4 Configuration

| Method | Path               | Description                       | Body                                                                     |
| ------ | ------------------ | --------------------------------- | ------------------------------------------------------------------------ |
| `PUT`  | `/costing-method`  | Change costing method for an item | `inventoryId*`, `newMethod*` (WEIGHTED_AVERAGE\|FIFO\|LIFO)              |
| `POST` | `/opening-balance` | Record opening stock              | `inventoryId*`, `quantity*` ≥1, `unitCost*` ≥0, `openingDate?`, `notes?` |
| `POST` | `/rebuild-layers`  | Rebuild cost layers from history  | `inventoryId*`                                                           |

---

## 5. Workflow Diagrams

### Procurement Flow

```
Requisition          Purchase Order        Goods Receipt         Invoice            Payment
──────────          ──────────────        ─────────────         ───────            ───────
  PENDING     ──→     DRAFT          ──→    DRAFT          ──→   PENDING      ──→  COMPLETED
    │                   │                     │                    │
  APPROVED            SENT                 VERIFIED           PARTIALLY_PAID
    │                   │                     │                    │
    │            PARTIALLY_RECEIVED         POSTED ──── stock     PAID
    │                   │                   arrives
    │                RECEIVED                here
    │
    └──── POST /purchase-orders/from-requisition ────┘
```

### Supplier Return Flow

```
DRAFT  ──→  APPROVED  ──→  SHIPPED  ──→  COMPLETED
  │            │                            │
  │            │                            ├─ inventory reduced (RETURN_TO_SUPPLIER movement)
  │            └──── or directly ───────────├─ WAC adjusted at original purchase cost
  │                                         └─ credit note auto-generated (PENDING)
  │
  └──→ CANCELLED (from DRAFT or APPROVED only)

Then: POST /supplier-returns/credit-notes/:id/apply  →  reduces invoice balanceDue
```

### Physical Count Reconciliation

```
1. GET  /v1/inventory/:id           →  Read system quantity
2. POST /v1/stock-movements/stock-count
     { inventoryId, actualQuantity }
                    ↓
     Backend computes variance = actual − system
                    ↓
     If variance ≠ 0: creates ADJUSTMENT movement at current avg cost
     If variance = 0: returns "no adjustment needed"
```

---

## 6. Movement Types Reference

| Type                 | Direction  | Created By                                        | Cost Handling                                   |
| -------------------- | ---------- | ------------------------------------------------- | ----------------------------------------------- |
| `PURCHASE_RECEIPT`   | + increase | GRN post                                          | WAC recalculated, cost layer created            |
| `SALE`               | − decrease | Sale completion                                   | WAC unchanged, cost layers consumed (FIFO/LIFO) |
| `RETURN`             | + increase | Customer return / sale void                       | WAC recalculated at original sale COGS          |
| `ADJUSTMENT`         | + increase | Stock count (+), manual adjust (+)                | WAC recalculated at avg cost                    |
| `DAMAGE`             | − decrease | Damage record, stock count (−), manual adjust (−) | WAC unchanged, valued at avg cost               |
| `EXPIRY`             | − decrease | Expiry record                                     | WAC unchanged, valued at avg cost               |
| `TRANSFER_OUT`       | − decrease | Inter-branch transfer (source)                    | WAC unchanged, valued at source avg cost        |
| `TRANSFER_IN`        | + increase | Inter-branch transfer (dest)                      | WAC recalculated with incoming cost             |
| `OPENING_BALANCE`    | + increase | Opening stock record                              | WAC set/recalculated, cost layer created        |
| `RETURN_TO_SUPPLIER` | − decrease | Supplier return completion                        | WAC adjusted at original GRN cost               |

---

## 7. Key Response Shapes

### Valuation Summary (`GET /inventory-valuation/summary`)

```json
{
  "totalItems": 150,
  "totalQuantity": 5000,
  "totalValue": 250000,
  "totalWeightedAverageValue": 250000,
  "totalFIFOValue": 248500,
  "totalLIFOValue": 251200,
  "valuationDate": "2026-03-19T10:00:00.000Z",
  "items": [
    {
      "inventoryId": "uuid",
      "productName": "Widget A",
      "sku": "WA-001",
      "costingMethod": "WEIGHTED_AVERAGE",
      "availableQuantity": 100,
      "totalValue": 5000,
      "averageCost": 50,
      "fifoValue": 4950,
      "lifoValue": 5100
    }
  ]
}
```

### Period COGS (`GET /inventory-valuation/cogs/period`)

```json
{
  "totalCOGS": 32000,
  "saleMovementCount": 450,
  "totalUnitsSold": 800,
  "byProduct": [
    {
      "productId": "uuid",
      "productName": "Widget A",
      "variantId": "uuid",
      "sku": "WA-001",
      "unitsSold": 100,
      "cogs": 5000
    }
  ]
}
```

### Gross Profit by Product (`GET /inventory-valuation/gross-profit/by-product`)

```json
{
  "totalRevenue": 50000,
  "totalCOGS": 32000,
  "totalGrossProfit": 18000,
  "overallMarginPercent": 36.0,
  "totalUnitsSold": 800,
  "byProduct": [
    {
      "productName": "Widget A",
      "sku": "WA-001",
      "unitsSold": 100,
      "revenue": 10000,
      "cogs": 5000,
      "grossProfit": 5000,
      "marginPercent": 50.0
    }
  ]
}
```

### Inventory Aging (`GET /inventory-valuation/aging`)

```json
{
  "thresholdDays": 90,
  "totalItems": 150,
  "totalSlowMovers": 12,
  "totalNeverSold": 5,
  "slowMoverValue": 8500,
  "neverSoldValue": 3200,
  "buckets": {
    "0-30": { "itemCount": 80, "totalQuantity": 500, "totalValue": 25000 },
    "31-60": { "itemCount": 30, "totalQuantity": 200, "totalValue": 12000 },
    "61-90": { "itemCount": 23, "totalQuantity": 150, "totalValue": 9000 },
    "91-180": { "itemCount": 8, "totalQuantity": 60, "totalValue": 5000 },
    "181-365": { "itemCount": 3, "totalQuantity": 20, "totalValue": 2500 },
    "365+": { "itemCount": 1, "totalQuantity": 5, "totalValue": 1000 },
    "never": { "itemCount": 5, "totalQuantity": 40, "totalValue": 3200 }
  },
  "items": [
    {
      "productName": "Dead Stock Widget",
      "status": "dead",
      "daysSinceLastSale": null,
      "availableQuantity": 10,
      "stockValue": 640
    }
  ]
}
```

### Stock Count Response (`POST /stock-movements/stock-count`)

```json
{
  "movementId": "uuid",
  "previousQuantity": 50,
  "newQuantity": 47,
  "variance": -3
}
```

### Supplier Return (`GET /supplier-returns/:id`)

```json
{
  "id": "uuid",
  "returnNumber": "SR-20260319-001",
  "status": "COMPLETED",
  "totalAmount": 1500,
  "items": [
    {
      "variantId": "uuid",
      "returnQuantity": 10,
      "unitCost": 150,
      "reason": "Defective batch"
    }
  ],
  "creditNotes": [
    {
      "id": "uuid",
      "creditNoteNumber": "CN-20260319-001",
      "amount": 1500,
      "status": "PENDING"
    }
  ]
}
```

### Bulk Sync Response (`POST /stock-movements/sync`)

```json
{
  "processed": 25,
  "inserted": 23,
  "skipped": 2,
  "errors": [],
  "inventoriesRecalculated": 15
}
```

---

## Frontend Integration Checklist

- [ ] **Procurement pages:** Requisition list/detail/create, PO list/detail/create (+ from-requisition), GRN list/detail/create/post, Invoice list/detail/create/match, Payment list/detail/create
- [ ] **Supplier Returns pages:** Return list/detail/create, status transition buttons (approve/ship/complete/cancel), credit note list + apply dialog
- [ ] **Stock Management pages:** Stock count form, manual adjustment form, damage/expiry forms, inter-branch transfer form, movement history viewer
- [ ] **Valuation Dashboard:** Branch valuation summary with WAC/FIFO/LIFO toggle, single-item valuation drill-down with cost layer table
- [ ] **Reports:** Period COGS chart, gross profit by product table (sortable by margin %), inventory aging bucket visualization (bar chart), slow-mover/dead-stock alert list
- [ ] **Costing Config:** Per-item costing method selector (WAC/FIFO/LIFO), opening balance form for new branches
