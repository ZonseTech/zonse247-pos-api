# Marketplace / E-Commerce Design

> **For Backend + Storefront (Next.js) Developers**
> Status: Draft — Phase 1 scope
> Last Updated: 2026-09-07

## Table of Contents

1. [Overview](#overview)
2. [Key Decisions](#key-decisions)
3. [Domain Model Changes](#domain-model-changes)
4. [Order Lifecycle](#order-lifecycle)
5. [API Surface](#api-surface)
6. [Delivery & Branch Assignment](#delivery--branch-assignment)
7. [Customer Auth](#customer-auth)
8. [Sale-of-the-Day Integration](#sale-of-the-day-integration)
9. [Sync / Offline Considerations](#sync--offline-considerations)
10. [Naming Collisions to Avoid](#naming-collisions-to-avoid)
11. [Phased Rollout](#phased-rollout)
12. [Open Questions for Later Phases](#open-questions-for-later-phases)

---

## Overview

Today `zonse247` is an offline-first POS system: tenants run branches, each branch sells `ProductVariant`s through in-person `Sale`s recorded by staff on POS terminals. There is no customer-facing surface at all — no storefront, no customer accounts, no online orders.

This doc designs a **marketplace website** (built in `web/`, the new Next.js app) on top of the existing `api`:

- Tenants opt their **account** into the marketplace, and opt individual **products** into being advertised.
- Customers browse a single storefront that aggregates advertised products across all opted-in tenants, and place orders.
- Orders are fulfilled by the tenant's own branch (using the branch's address as the delivery/pickup origin), and payment is collected on delivery/pickup by staff — which is recorded as a normal `Sale`, so it shows up in existing "sale of the day" reporting with no new reporting logic.

This is a **greenfield addition**: nothing here removes or breaks the existing POS flow. New tables, new columns (all optional/defaulted), and a handful of new routes.

---

## Key Decisions

These were confirmed up front because they change the shape of the schema:

| Decision | Choice |
|---|---|
| Marketplace shape | **Single unified catalog** — one storefront aggregating advertised products from every opted-in tenant (like a mini-marketplace, not per-tenant branded shops). |
| Phase 1 payment | **Cash / mobile money collected on delivery or pickup**, by branch staff, through the existing POS flow. No payment gateway integration yet. |
| Delivery fulfillment | **Tenant's own branch staff**, using the branch's own address/location. No third-party courier integration yet. |

Both non-chosen options (per-tenant storefronts, online payment gateway, courier integration) are pushed to [Open Questions for Later Phases](#open-questions-for-later-phases) so the schema doesn't need to be redesigned when we get there — see the extension points called out inline below.

---

## Domain Model Changes

All additions are backward-compatible (new optional/defaulted columns, new tables). Field/model names below follow the existing schema's conventions (`api/src/databases/prisma/schema.prisma`).

### 1. `Tenant` — storefront opt-in

```prisma
model Tenant {
  // ...existing fields...
  storefrontEnabled   Boolean   @default(false)
  storefrontSlug      String?   @unique   // reserved for phase 2 (tenant-branded page)
  storefrontEnabledAt DateTime?
}
```

`storefrontEnabled` is the master switch: if false, **none** of the tenant's products appear on the marketplace regardless of per-product flags.

### 2. `Branch` — location + delivery settings

Branch already has `addressLine1/2/3`, `districtId`, `city`, `location` — but **no coordinates**, which are needed to pick the closest branch and to show delivery estimates.

```prisma
model Branch {
  // ...existing fields...
  latitude             Decimal? @db.Decimal(9,6)
  longitude            Decimal? @db.Decimal(9,6)
  deliveryEnabled      Boolean  @default(false)
  pickupEnabled        Boolean  @default(true)
  deliveryRadiusKm     Decimal? @db.Decimal(5,2)
  deliveryFee          Decimal? @db.Decimal(10,2) @default(0)
  deliveryInstructions String?
}
```

Phase 1 can use a flat `deliveryFee` per branch and manual lat/lng entry (tenant pins their branch on a map once during setup). Distance-based fee/ETA is a phase 2 refinement (see [Open Questions](#open-questions-for-later-phases)).

### 3. Product visibility — two-level toggle

Visibility is split across `Product` (parent) and `ProductVariant` (sellable SKU), matching the existing two-tier catalog:

```prisma
model Product {
  // ...existing fields...
  storefrontEnabled Boolean @default(false)   // tenant's per-product kill switch
}

model ProductVariant {
  // ...existing fields...
  isAdvertised   Boolean   @default(false)    // per-SKU "advertise this" toggle
  advertisedAt   DateTime?
}
```

Why both levels: a tenant may want to advertise a product but only one of its variants (e.g. the 1kg retail pack, not the 50kg wholesale pack). Effective storefront visibility for a variant is:

```
tenant.storefrontEnabled
  AND branch reachable (delivery OR pickup enabled)
  AND product.storefrontEnabled
  AND variant.isAdvertised
  AND variant.isActive
  AND (available inventory > 0, if out-of-stock hiding is desired)
```

This check belongs in one place — a `StorefrontVisibilityService` or equivalent query helper — not duplicated across endpoints.

### 4. `MarketplaceCustomer` — new customer identity (new table)

The existing `Customer` model is a **per-tenant CRM record** created by staff (no password, no login) — it cannot represent a self-service shopper who orders across multiple tenants. This needs a genuinely new, tenant-independent identity:

```prisma
model MarketplaceCustomer {
  id                     String    @id @default(uuid())
  email                  String    @unique
  phone                  String?   @unique
  passwordHash           String
  fullName               String
  defaultDeliveryAddress String?
  defaultLatitude        Decimal?  @db.Decimal(9,6)
  defaultLongitude       Decimal?  @db.Decimal(9,6)
  isActive               Boolean   @default(true)
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt

  orders WebOrder[]
}
```

To keep the existing tenant-side CRM/reporting working unchanged, link the two models instead of replacing one with the other:

```prisma
model Customer {
  // ...existing fields...
  marketplaceCustomerId String?   // set the first time this shopper orders from this tenant
}
```

When a `MarketplaceCustomer` places an order with a tenant for the first time, the API upserts a normal per-tenant `Customer` row (as if staff had created it) and stamps `marketplaceCustomerId` on it. `Sale.customerId` keeps pointing at `Customer.customerId` exactly as today — the marketplace layer is additive, not a fork of the sales model.

### 5. `WebOrder` / `WebOrderItem` — new tables

The existing `Order` model (schema line ~1220) is a legacy line-item table tied to the old `Transaction` model — it has no tenant/branch/customer/status fields and must **not** be reused or confused with marketplace orders (see [Naming Collisions](#naming-collisions-to-avoid)).

```prisma
enum WebOrderStatus {
  PENDING_CONFIRMATION
  CONFIRMED
  PREPARING
  READY_FOR_PICKUP
  OUT_FOR_DELIVERY
  COMPLETED
  CANCELLED
  REJECTED
}

enum FulfillmentType {
  DELIVERY
  PICKUP
}

model WebOrder {
  id                     String          @id @default(uuid())
  orderNumber            String          @unique          // e.g. "WEB-000123"
  tenantId               String
  branchId               String                            // fulfilling branch
  marketplaceCustomerId  String
  customerId             String?                           // linked tenant Customer, set on confirm

  fulfillmentType        FulfillmentType
  deliveryAddress        String?
  deliveryLatitude       Decimal?        @db.Decimal(9,6)
  deliveryLongitude      Decimal?        @db.Decimal(9,6)
  deliveryFee            Decimal         @default(0)

  subtotal               Decimal
  taxAmount              Decimal         @default(0)
  totalAmount            Decimal

  status                 WebOrderStatus  @default(PENDING_CONFIRMATION)
  cancelReason           String?
  notes                  String?

  saleId                 String?         @unique  // set once staff collects payment -> Sale created

  createdAt              DateTime        @default(now())
  updatedAt              DateTime        @updatedAt

  items WebOrderItem[]
}

model WebOrderItem {
  id          String  @id @default(uuid())
  webOrderId  String
  variantId   String
  quantity    Int
  unitPrice   Decimal   // snapshot at order time, not live-linked to variant pricing
  subtotal    Decimal
}
```

**Important — cart may span multiple tenants.** Since the catalog is unified but each `WebOrder` belongs to exactly one tenant (one branch fulfills it, one stock pool, one payment collected by one staff member), a customer's cart that contains products from two different tenants must be split into **multiple `WebOrder` rows at checkout** — one per tenant — the same way marketplaces like Amazon split a cart into per-seller sub-orders. `POST /storefront/orders` therefore returns an array of created orders, not a single order, whenever the cart spans tenants.

### 6. `Sale` — traceability back to the web order

No structural change needed to `SaleService.createSale` itself — the flow described below reuses it as-is — but add two nullable/optional fields so a completed sale can be traced back to its originating web order and reported separately from walk-in sales if desired:

```prisma
enum SaleChannel {
  POS
  ONLINE
}

model Sale {
  // ...existing fields...
  channel           SaleChannel @default(POS)
  sourceWebOrderId  String?     @unique
}
```

`userId` on `Sale` does **not** need to become nullable: the staff member who collects payment on delivery/pickup and marks the order fulfilled is the `userId` on the resulting sale, exactly like any other POS sale.

---

## Order Lifecycle

```
Customer checkout (web/)
        │  POST /storefront/orders
        ▼
WebOrder created (status: PENDING_CONFIRMATION), split per tenant
        │
        │  tenant branch staff reviews queue
        ▼
CONFIRMED ──► PREPARING ──► READY_FOR_PICKUP / OUT_FOR_DELIVERY
        │                              │
        │                              ▼
        │                    staff collects payment
        │                    POST /web-orders/:id/fulfill
        │                              │
        │                              ▼
        │                    SaleService.createSale(...)
        │                    (channel=ONLINE, sourceWebOrderId=...)
        │                              │
        ▼                              ▼
   CANCELLED / REJECTED           COMPLETED  ──► picked up automatically by
   (customer or staff,                          existing "today" dashboard
    before fulfillment)                          (see below)
```

`POST /web-orders/:id/fulfill` is the only new business logic required for payment: it maps `WebOrderItem[]` into the same shape `SaleService.createSale` already expects, calls it with the acting staff user's `userId`/`tenantId`/`branchId`, tags `channel: 'ONLINE'` and `sourceWebOrderId`, then stamps `WebOrder.saleId` and `status = COMPLETED`. All totals, tax, stock deduction (via `Inventory`/`StockMovement`), and receipt logic are inherited for free from the existing sale path — nothing is duplicated.

---

## API Surface

### Public / customer-facing (new, unauthenticated except where noted) — namespace `/storefront`

| Method & Path | Purpose |
|---|---|
| `GET /storefront/products` | Paginated/filterable catalog across all opted-in tenants (search, category, price range) |
| `GET /storefront/products/:variantId` | Product/variant detail, incl. which tenant/branch(es) can fulfill it |
| `GET /storefront/categories` | Category facets for browsing (phase 1: raw tenant categories; see [Open Questions](#open-questions-for-later-phases) for a unified taxonomy) |
| `POST /storefront/auth/register` | Create a `MarketplaceCustomer` |
| `POST /storefront/auth/login` | Returns a marketplace-customer JWT (separate token type/claims from staff JWTs) |
| `POST /storefront/auth/refresh` | Refresh token |
| `GET /storefront/auth/me` | *(auth)* current marketplace customer profile |
| `POST /storefront/orders` | *(auth)* Checkout — creates one `WebOrder` per tenant represented in the cart |
| `GET /storefront/orders` | *(auth)* Customer's own order history |
| `GET /storefront/orders/:id` | *(auth)* Order detail/status |
| `POST /storefront/orders/:id/cancel` | *(auth)* Cancel while still `PENDING_CONFIRMATION` |
| `GET /storefront/branches/nearest` | Resolve candidate fulfilling branch(es) for a given lat/lng (see [Delivery](#delivery--branch-assignment)) |

### Tenant-admin (extends existing authenticated, tenant/branch-scoped API)

| Method & Path | Purpose |
|---|---|
| `PATCH /tenants/:tenantId/storefront` | Toggle `storefrontEnabled` (and later `storefrontSlug`) |
| `PATCH /branches/:branchId/delivery-settings` | Set `latitude/longitude`, `deliveryEnabled`, `pickupEnabled`, `deliveryRadiusKm`, `deliveryFee` |
| `PATCH /products/:productId/storefront` | Toggle `Product.storefrontEnabled` |
| `PATCH /product-variants/:variantId/advertise` | Toggle `ProductVariant.isAdvertised` |
| `POST /products/bulk-advertise` | Bulk-toggle advertise flag across variants (e.g. "advertise everything in this category") |
| `GET /web-orders` | Incoming online-order queue, filterable by branch/status |
| `GET /web-orders/:id` | Order detail |
| `PATCH /web-orders/:id/status` | Confirm / reject / move through `PREPARING` → `READY_FOR_PICKUP`/`OUT_FOR_DELIVERY` |
| `POST /web-orders/:id/fulfill` | Record payment collected → creates the `Sale` (see [Order Lifecycle](#order-lifecycle)) |
| `POST /web-orders/:id/cancel` | Staff-side cancellation |

All admin endpoints sit behind the existing `verifyToken` + `tenantStatus` + branch-scoping middleware stack (`api/src/middlewares/auth.middleware.ts`, `tenant.middleware.ts`, `branch.middleware.ts`) exactly like every other tenant-scoped route today — no new auth pattern needed on this side.

---

## Delivery & Branch Assignment

Phase 1 keeps this simple, consistent with "tenant's own branch staff, no courier integration":

1. At order placement, the customer picks **pickup** (choose one of the tenant's branches with `pickupEnabled`) or **delivery** (enter an address; geocode client-side in `web/` to lat/lng).
2. For delivery, the API resolves candidate branches: tenant's branches with `deliveryEnabled = true`, ranked by straight-line (haversine) distance from `deliveryLatitude/deliveryLongitude` to `Branch.latitude/longitude`, filtered to `distance <= deliveryRadiusKm` when set.
3. If exactly one tenant is involved in that line of the cart, auto-assign the nearest matching branch; surface the candidate list to the customer if ambiguous (e.g. two branches within radius) — exact UX is a `web/` decision, not an API one.
4. `deliveryFee` is the flat fee on the assigned `Branch` for phase 1. Distance-tiered or live-calculated fees are a phase 2 refinement — the schema already supports swapping the flat fee for a computed one without a migration (same column, different write path).

---

## Customer Auth

- New, separate JWT type for `MarketplaceCustomer` (distinct claims: `marketplaceCustomerId`, no `tenantId`/`roleId`/`permissions` — a marketplace customer has no tenant affiliation, unlike every existing `User` token).
- Do **not** reuse `verifyToken`/`req.auth` as-is, since downstream tenant/branch middleware assumes staff-shaped claims. Add a small parallel `verifyCustomerToken` middleware mounted only under `/storefront/*` authenticated routes.
- Password hashing/JWT signing should reuse the same libraries already in `api/package.json` (`jsonwebtoken`, whatever hashing lib `auth.service.ts` uses for `User.password`) for consistency — just a new, smaller service (`marketplace-customer.service.ts` / `marketplace-auth.service.ts`), not a new pattern.

---

## Sale-of-the-Day Integration

This is the reason the fulfillment step reuses `SaleService.createSale` instead of inventing a parallel ledger: `DashboardService.getSummary()` / `getDaySnapshot()` / `getPaymentMethodsBreakdown()` (`api/src/services/dashboard.service.ts`) already compute "today's revenue/sales count" purely by filtering `Sale.saleDate` (and related `SalePayment` rows) to the current day, scoped by tenant/branch. As soon as `POST /web-orders/:id/fulfill` writes a `Sale` dated today, it is **automatically** included in existing dashboard/reporting — no new "web sale of the day" concept needs to be built. If tenants want to see online vs. walk-in split, that's a one-line addition to the dashboard query grouping by the new `Sale.channel` field — not a new reporting pipeline.

---

## Sync / Offline Considerations

`MarketplaceCustomer` and `WebOrder`/`WebOrderItem` are **server-only (MySQL) concepts** — customers hit the API directly over the internet, they never go through a POS terminal's local SQLite replica. Do **not** add them to the `/sync` push/pull table lists (`TerminalSyncState`, `ChangeLog`) — terminals only ever need to see the `Sale`/`SaleItem`/`SalePayment` rows that result once a web order is fulfilled, and those already flow through the existing sync tables untouched.

---

## Naming Collisions to Avoid

- The existing `Order` model/`/orders` route is a **legacy** table (line-items tied to the old `Transaction` model, no tenant/branch/customer/status fields). The new marketplace order concept must use different names end-to-end: model `WebOrder`, admin route `/web-orders`, customer route `/storefront/orders`. Do not extend or repurpose the legacy `Order` model.
- `Customer` (existing, tenant-scoped CRM record) vs. `MarketplaceCustomer` (new, cross-tenant shopper identity) are intentionally two different models, linked by `Customer.marketplaceCustomerId` — see [Domain Model Changes §4](#4-marketplacecustomer--new-customer-identity-new-table).

---

## Phased Rollout

**Phase 1 (this doc's scope)**
- Schema additions above (all additive/nullable-safe migrations).
- Tenant-admin toggles: storefront enable, per-product/variant advertise, branch delivery settings (manual lat/lng entry).
- Public browse/search API + `MarketplaceCustomer` auth.
- Checkout → `WebOrder` (split per tenant), staff-side order queue, `fulfill` → `Sale` creation.
- Delivery: flat fee per branch, pickup-or-delivery choice, nearest-branch-by-radius assignment only (no live ETA).

**Phase 2 (candidates, not designed here)**
- Per-tenant branded storefront pages (`storefrontSlug` is already reserved for this).
- Unified marketplace category taxonomy (mapping table from tenant `Category` → a marketplace-wide category, instead of raw per-tenant categories as filter facets).
- Distance-tiered/live-calculated delivery fees and ETAs.
- Order status push notifications / SMS to customers.

**Phase 3 (candidates)**
- Online payment at checkout: reuse the existing `PaymentMethod`/`PaymentServiceProvider` global-catalog design (`category` field decoupling) and extend `SalePayment` with webhook-confirmed provider references — the `SalePayment.paymentEntity`/`providerId`/`providerRef` fields already anticipate this.
- Third-party courier integration for delivery dispatch/tracking.
- Ratings/reviews.

---

## Open Questions for Later Phases

These don't block Phase 1 but will shape Phase 2/3 schema work — worth deciding before building them, not after:

1. **Per-tenant storefronts**: if ever added alongside the unified catalog (not instead of it), does a tenant's branded page reuse the same `WebOrder`/checkout flow, or is it a fully separate storefront experience?
2. **Category taxonomy**: is a marketplace-wide category list curated centrally (small fixed set tenants map into), or purely derived from tenant categories via search/text matching?
3. **Out-of-stock handling**: hide variants with zero available inventory from the storefront entirely, or show them as "out of stock"? Affects the visibility query in [Domain Model Changes §3](#3-product-visibility--two-level-toggle).
4. **Payment gateway choice** (when Phase 3 is scheduled): which mobile-money/card provider(s) to integrate first — determines the shape of the webhook confirmation flow.
