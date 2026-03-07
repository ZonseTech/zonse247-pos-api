# Zonse247 POS API - Routes Documentation

This document provides a comprehensive overview of all available API endpoints in the Zonse247 POS API.

## Table of Contents

- [Authentication](#authentication)
- [Onboarding](#onboarding)
- [Account Seeds](#account-seeds)
- [Metadata](#metadata)
- [Plan Features](#plan-features)
- [Settings](#settings)
- [Tenants](#tenants)
- [Branches](#branches)
- [Mailing](#mailing)
- [Export](#export)
- [Sync](#sync)
- [Payment Service Providers](#payment-service-providers)
- [Users](#users)
- [Dashboard](#dashboard)
- [Inventory](#inventory)
- [Customers](#customers)
- [Categories](#categories)
- [Payment Methods](#payment-methods)
- [Migration](#migration)
- [Transactions](#transactions)
- [Hold Orders](#hold-orders)
- [Subscriptions](#subscriptions)
- [Subscription Plans](#subscription-plans)
- [Terminals](#terminals)
- [Roles](#roles)
- [Permissions](#permissions)
- [Role Permissions](#role-permissions)
- [Orders](#orders)
- [**NEW: Inventory Business Flow**](#inventory-business-flow)
  - [Products](#products)
  - [Suppliers](#suppliers)
  - [Purchase Orders](#purchase-orders)
  - [Sales](#sales)
  - [Stock Movements](#stock-movements)

---

## Base URL

All endpoints are prefixed with the API base URL (e.g., `http://localhost:3000/api`).

---

## Authentication

**Base Path:** `/auth`

| Method | Endpoint                    | Description                        | Auth Required |
| ------ | --------------------------- | ---------------------------------- | ------------- |
| POST   | `/auth/live/login`          | Initiate live login for an account | No            |
| POST   | `/auth/login`               | User login                         | No            |
| POST   | `/auth/refresh-token`       | Refresh authentication token       | No            |
| POST   | `/auth/verify-token`        | Verify authentication token        | No            |
| GET    | `/auth/logout/:id`          | User logout                        | No            |
| POST   | `/auth/reset-password/:id`  | Reset user password                | No            |
| PUT    | `/auth/change-password/:id` | Change user password               | Yes           |

---

## Onboarding

**Base Path:** `/on-boarding`

| Method | Endpoint                                       | Description                        | Auth Required |
| ------ | ---------------------------------------------- | ---------------------------------- | ------------- |
| POST   | `/on-boarding/verify-tenant`                   | Verify tenant during onboarding    | No            |
| POST   | `/on-boarding/live/verify-account`             | Verify tenant account (live)       | No            |
| GET    | `/on-boarding/tenant/:tenantId/branches`       | Get tenant branches                | No            |
| GET    | `/on-boarding/live/tenant/:tenantId/branches`  | Get tenant account branches (live) | No            |
| GET    | `/on-boarding/branch/:branchId/terminals`      | Get branch terminals               | No            |
| GET    | `/on-boarding/live/branch/:branchId/terminals` | Get tenant branch terminals (live) | No            |
| GET    | `/on-boarding/status`                          | Get onboarding status              | No            |
| POST   | `/on-boarding/settings/configure`              | Configure settings                 | No            |
| GET    | `/on-boarding/settings`                        | Get settings                       | No            |

---

## Account Seeds

**Base Path:** `/account-seeds`

| Method | Endpoint                                  | Description                          | Auth Required |
| ------ | ----------------------------------------- | ------------------------------------ | ------------- |
| GET    | `/account-seeds/`                         | Account seeds API info               | No            |
| POST   | `/account-seeds/roles`                    | Select all roles                     | No            |
| POST   | `/account-seeds/permissions`              | Select all permissions               | No            |
| POST   | `/account-seeds/role-permissions`         | Select all role permissions          | No            |
| POST   | `/account-seeds/default-user`             | Select all default users             | No            |
| POST   | `/account-seeds/customer`                 | Select all customers                 | No            |
| POST   | `/account-seeds/category`                 | Select all categories                | No            |
| POST   | `/account-seeds/subscription-plans`       | Select all subscription plans        | No            |
| POST   | `/account-seeds/tenant-subscription`      | Select all tenant subscriptions      | No            |
| POST   | `/account-seeds/payment-methods`          | Select all payment methods           | No            |
| POST   | `/account-seeds/payment-service-provider` | Select all payment service providers | No            |
| POST   | `/account-seeds/sync-all`                 | Sync all account data                | No            |

---

## Metadata

**Base Path:** `/metadata`

> **Note:** Requires metadata key validation middleware.

| Method | Endpoint                             | Description                   | Auth Required |
| ------ | ------------------------------------ | ----------------------------- | ------------- |
| GET    | `/metadata/`                         | Metadata Sync API info        | No            |
| POST   | `/metadata/roles`                    | Sync roles                    | No            |
| POST   | `/metadata/permissions`              | Sync permissions              | No            |
| POST   | `/metadata/role-permissions`         | Sync role permissions         | No            |
| POST   | `/metadata/default-user`             | Sync default user             | No            |
| POST   | `/metadata/customer`                 | Sync customer                 | No            |
| POST   | `/metadata/category`                 | Sync category                 | No            |
| POST   | `/metadata/subscription-plans`       | Sync subscription plans       | No            |
| POST   | `/metadata/tenant-subscription`      | Sync tenant subscription      | No            |
| POST   | `/metadata/payment-methods`          | Sync payment methods          | No            |
| POST   | `/metadata/payment-service-provider` | Sync payment service provider | No            |
| POST   | `/metadata/sync-all`                 | Sync all metadata             | No            |
| GET    | `/metadata/status`                   | Get sync status               | No            |

---

## Plan Features

**Base Path:** `/plan-features`

| Method | Endpoint             | Description            | Auth Required |
| ------ | -------------------- | ---------------------- | ------------- |
| GET    | `/plan-features/`    | List plan features     | No            |
| GET    | `/plan-features/all` | Get all plan features  | No            |
| GET    | `/plan-features/:id` | Get plan feature by ID | No            |
| POST   | `/plan-features/`    | Create plan feature    | No            |
| PUT    | `/plan-features/:id` | Update plan feature    | No            |
| DELETE | `/plan-features/:id` | Delete plan feature    | No            |

---

## Settings

**Base Path:** `/settings`

| Method | Endpoint          | Description        | Auth Required |
| ------ | ----------------- | ------------------ | ------------- |
| GET    | `/settings/:key`  | Get setting by key | Yes           |
| PUT    | `/settings/:uuid` | Update setting     | Yes           |
| DELETE | `/settings/:uuid` | Delete setting     | Yes           |

---

## Tenants

**Base Path:** `/tenants`

| Method | Endpoint                               | Description                  | Auth Required |
| ------ | -------------------------------------- | ---------------------------- | ------------- |
| GET    | `/tenants/`                            | Tenant API info              | Yes           |
| GET    | `/tenants/all`                         | List all tenants             | Yes           |
| POST   | `/tenants/post`                        | Create tenant                | Yes           |
| GET    | `/tenants/:tenantId`                   | Get tenant by ID             | Yes           |
| POST   | `/tenants/register-tenant`             | Register new tenant          | Yes           |
| PUT    | `/tenants/update/:id`                  | Update tenant                | Yes           |
| DELETE | `/tenants/tenant/:id`                  | Delete tenant                | Yes           |
| PUT    | `/tenants/update-tenant/:tenantId`     | Update tenant by tenant ID   | Yes           |
| GET    | `/tenants/onboarding-status/:tenantId` | Get tenant onboarding status | Yes           |

---

## Branches

**Base Path:** `/branches`

| Method | Endpoint               | Description       | Auth Required |
| ------ | ---------------------- | ----------------- | ------------- |
| GET    | `/branches/`           | Branch API info   | Yes           |
| GET    | `/branches/all`        | List all branches | Yes           |
| POST   | `/branches/post`       | Create branch     | Yes           |
| PUT    | `/branches/update/:id` | Update branch     | Yes           |
| GET    | `/branches/:id`        | Get branch by ID  | Yes           |
| DELETE | `/branches/:id`        | Delete branch     | Yes           |

---

## Mailing

**Base Path:** `/mailing`

| Method | Endpoint                | Description                | Auth Required |
| ------ | ----------------------- | -------------------------- | ------------- |
| GET    | `/mailing/test-email`   | Send test email            | Yes           |
| GET    | `/mailing/health/email` | Check email service health | Yes           |

---

## Export

**Base Path:** `/export`

| Method | Endpoint                   | Description                     | Auth Required |
| ------ | -------------------------- | ------------------------------- | ------------- |
| GET    | `/export/tables`           | Get available tables for export | Yes           |
| GET    | `/export/stats/:tableName` | Get table statistics            | Yes           |
| POST   | `/export/preview`          | Preview export data             | Yes           |
| POST   | `/export/data`             | Export data                     | Yes           |
| POST   | `/export/download`         | Create download file            | Yes           |
| POST   | `/export/bulk`             | Bulk export                     | Yes           |
| DELETE | `/export/cleanup`          | Cleanup export files            | Yes           |

---

## Sync

**Base Path:** `/sync`

### Bidirectional Sync (Implemented)

The sync system supports bidirectional synchronization between offline terminals and the server.

**Data Flow:**

- **PUSH (Terminal → Server):** Sales, SaleItems, SalePayments, Returns, ReturnItems, StockMovements, Customers, Orders
- **PULL (Server → Terminal):** Products, ProductVariants, Categories, Inventory, PaymentMethods, StockMovements (from other terminals), Customers

### Push Endpoints (Receive data from terminals)

| Method | Endpoint                | Description                         | Auth Required |
| ------ | ----------------------- | ----------------------------------- | ------------- |
| POST   | `/sync/batch`           | Bulk push all tables in one request | Terminal      |
| POST   | `/sync/sales`           | Push sales from terminal            | Terminal      |
| POST   | `/sync/sale-items`      | Push sale items from terminal       | Terminal      |
| POST   | `/sync/sale-payments`   | Push sale payments from terminal    | Terminal      |
| POST   | `/sync/returns`         | Push returns from terminal          | Terminal      |
| POST   | `/sync/return-items`    | Push return items from terminal     | Terminal      |
| POST   | `/sync/stock-movements` | Push stock movements from terminal  | Terminal      |
| POST   | `/sync/customers`       | Push customers from terminal        | Terminal      |
| POST   | `/sync/orders`          | Push orders from terminal           | Terminal      |

### Pull Endpoints (Send data to terminals)

| Method | Endpoint                | Description                       | Auth Required |
| ------ | ----------------------- | --------------------------------- | ------------- |
| POST   | `/sync/pull`            | Pull all changed data from server | Terminal      |
| POST   | `/sync/pull/:tableName` | Pull specific table data          | Terminal      |

**Pull Request Body:**

```json
{
  "tenantId": "tenant-001",
  "branchId": "branch-001",
  "terminalId": "term-001",
  "since": "2026-03-07T00:00:00Z", // Optional: get changes since timestamp
  "tables": ["products", "inventory"], // Optional: specific tables to pull
  "limit": 500 // Optional: max records per table
}
```

### Combined Sync

| Method | Endpoint              | Description                   | Auth Required |
| ------ | --------------------- | ----------------------------- | ------------- |
| POST   | `/sync/bidirectional` | Push then pull in one request | Terminal      |

**Bidirectional Request Body:**

```json
{
  "tenantId": "tenant-001",
  "branchId": "branch-001",
  "terminalId": "term-001",
  "push": {
    "sales": [...],
    "saleItems": [...],
    "stockMovements": [...]
  },
  "pullSince": "2026-03-07T00:00:00Z",
  "pullTables": ["products", "inventory"],
  "pullLimit": 500
}
```

### Status Endpoint

| Method | Endpoint       | Description                  | Auth Required |
| ------ | -------------- | ---------------------------- | ------------- |
| GET    | `/sync/status` | Get sync status for terminal | Terminal      |

---

## Payment Service Providers

**Base Path:** `/payment-service-providers`

| Method | Endpoint                                     | Description        | Auth Required |
| ------ | -------------------------------------------- | ------------------ | ------------- |
| GET    | `/payment-service-providers/`                | PSP API info       | Yes           |
| GET    | `/payment-service-providers/all`             | Get all PSPs       | Yes           |
| GET    | `/payment-service-providers/search`          | Search PSPs        | Yes           |
| GET    | `/payment-service-providers/psp/:pspId`      | Get PSP by ID      | Yes           |
| POST   | `/payment-service-providers/psp`             | Create PSP         | Yes           |
| PUT    | `/payment-service-providers/psp/:pspId`      | Update PSP         | Yes           |
| PUT    | `/payment-service-providers/psp/:pspId/sync` | Mark PSP as synced | Yes           |
| DELETE | `/payment-service-providers/psp/:pspId`      | Delete PSP         | Yes           |

---

## Users

**Base Path:** `/users`

| Method | Endpoint                    | Description                      | Auth Required |
| ------ | --------------------------- | -------------------------------- | ------------- |
| GET    | `/users/`                   | Health check                     | Yes           |
| GET    | `/users/profile/:id`        | Get user profile (owner only)    | Yes           |
| PUT    | `/users/profile/:id`        | Update user profile (owner only) | Yes           |
| DELETE | `/users/profile/:id`        | Delete user profile (owner only) | Yes           |
| GET    | `/users/list`               | List all users                   | Yes           |
| POST   | `/users/`                   | Create user (admin only)         | Yes (Admin)   |
| GET    | `/users/:id`                | Get user by ID (admin only)      | Yes (Admin)   |
| PUT    | `/users/:id`                | Update user (admin only)         | Yes (Admin)   |
| DELETE | `/users/:id`                | Delete user (admin only)         | Yes (Admin)   |
| PUT    | `/users/status/:id`         | Update user status (admin only)  | Yes (Admin)   |
| GET    | `/users/role/:roleId`       | Get users by role (admin only)   | Yes (Admin)   |
| GET    | `/users/branch/:branchUuid` | Get users by branch (admin only) | Yes (Admin)   |

---

## Dashboard

**Base Path:** `/dashboard`

| Method | Endpoint                                           | Description                      | Auth Required |
| ------ | -------------------------------------------------- | -------------------------------- | ------------- |
| GET    | `/dashboard/monthly-sales/:userUuid/:monthYear`    | Get monthly sales data           | Yes           |
| GET    | `/dashboard/transactions/:userUuid/:limit/:offset` | Get transactions with pagination | Yes           |
| GET    | `/dashboard/top-products`                          | Get top products                 | Yes           |
| GET    | `/dashboard/counts/:userUuid`                      | Get dashboard counts             | Yes           |
| GET    | `/dashboard/transaction/:transactionId/items`      | Get transaction items            | Yes           |
| GET    | `/dashboard/transaction/:transactionId/details`    | Get transaction details          | Yes           |

---

## Inventory

**Base Path:** `/inventory`

### Summary & Count

| Method | Endpoint             | Description                                        | Auth Required |
| ------ | -------------------- | -------------------------------------------------- | ------------- |
| GET    | `/inventory/summary` | Get inventory summary (total, new, expiring, etc.) | Yes           |
| GET    | `/inventory/count`   | Get inventory item count                           | Yes           |

**Query Parameters for `/inventory/count`:**

- `includeVoided` (boolean): Include voided items in count (default: false)

### Get Items

| Method | Endpoint                  | Description                         | Auth Required |
| ------ | ------------------------- | ----------------------------------- | ------------- |
| GET    | `/inventory/`             | Get inventory items with pagination | Yes           |
| GET    | `/inventory/all`          | Get all inventory items             | Yes           |
| GET    | `/inventory/items-only`   | Get active inventory items only     | Yes           |
| GET    | `/inventory/item/:itemId` | Get inventory item by ID            | Yes           |

**Query Parameters for `/inventory/`:**

- `page` (number): Page number (default: 1)
- `perPage` (number): Items per page (default: 10)
- `search` (string): Search term for name/barcode
- `filter` (string): Filter type - 'all', 'new', 'expiring', 'expired'
- `categoryId` (number): Filter by category ID

**Query Parameters for `/inventory/all`:**

- `includeVoided` (boolean): Include voided items (default: false)

### Search & Filter

| Method | Endpoint                          | Description                | Auth Required |
| ------ | --------------------------------- | -------------------------- | ------------- |
| GET    | `/inventory/search`               | Search inventory items     | Yes           |
| GET    | `/inventory/barcode/:barcode`     | Find item by barcode       | Yes           |
| GET    | `/inventory/category/:categoryId` | Get items by category      | Yes           |
| GET    | `/inventory/status/:status`       | Get items by status        | Yes           |
| POST   | `/inventory/item/sku`             | Find inventory item by SKU | Yes           |

**Query Parameters for `/inventory/search`:**

- `q` (string, required): Search term

**Request Body for `/inventory/item/sku`:**

```json
{
  "skuCode": "string"
}
```

### Low Stock & Alerts

| Method | Endpoint               | Description         | Auth Required |
| ------ | ---------------------- | ------------------- | ------------- |
| GET    | `/inventory/low-stock` | Get low stock items | Yes           |

**Query Parameters for `/inventory/low-stock`:**

- `threshold` (number): Stock threshold (default: 10)

### Exists Check

| Method | Endpoint                    | Description                    | Auth Required |
| ------ | --------------------------- | ------------------------------ | ------------- |
| GET    | `/inventory/exists/:itemId` | Check if inventory item exists | Yes           |

### Create

| Method | Endpoint          | Description           | Auth Required |
| ------ | ----------------- | --------------------- | ------------- |
| POST   | `/inventory/item` | Create inventory item | Yes           |

**Request Body:**

```json
{
  "barcode": "string (required)",
  "name": "string (required)",
  "categoryId": "string",
  "description": "string",
  "brand": "string",
  "unit": "string",
  "costPrice": "number (required)",
  "sellPrice": "number (required)",
  "promoPrice": "number",
  "promoStart": "date",
  "promoEnd": "date",
  "quantity": "string (required)",
  "minStock": "number",
  "maxStock": "number",
  "reorderLevel": "number",
  "trackInventory": "boolean",
  "allowNegativeStock": "boolean",
  "isTaxable": "boolean",
  "expirationDate": "date",
  "manufactureDate": "date",
  "imageUrls": "array",
  "supplierName": "string",
  "supplierCode": "string",
  "color": "string",
  "size": "string",
  "dimensions": "string",
  "weight": "number",
  "properties": "object"
}
```

### Update

| Method | Endpoint                       | Description           | Auth Required |
| ------ | ------------------------------ | --------------------- | ------------- |
| PUT    | `/inventory/item/:itemId`      | Update inventory item | Yes           |
| PUT    | `/inventory/item-void/:itemId` | Void inventory item   | Yes           |

### Stock Management

| Method | Endpoint                           | Description                     | Auth Required |
| ------ | ---------------------------------- | ------------------------------- | ------------- |
| PATCH  | `/inventory/item/:itemId/quantity` | Update item quantity            | Yes           |
| PATCH  | `/inventory/item/:itemId/adjust`   | Adjust inventory (add/subtract) | Yes           |

**Request Body for `/inventory/item/:itemId/quantity`:**

```json
{
  "quantity": "number (required)"
}
```

**Request Body for `/inventory/item/:itemId/adjust`:**

```json
{
  "adjustment": "number (required, positive to add, negative to subtract)"
}
```

### Bulk Operations

| Method | Endpoint                      | Description                    | Auth Required |
| ------ | ----------------------------- | ------------------------------ | ------------- |
| PUT    | `/inventory/bulk-update`      | Bulk update inventory items    | Yes           |
| PUT    | `/inventory/move-to-category` | Move items to another category | Yes           |

**Request Body for `/inventory/bulk-update`:**

```json
{
  "updates": [
    {
      "productUuid": "string",
      "data": {
        "field": "value"
      }
    }
  ]
}
```

**Request Body for `/inventory/move-to-category`:**

```json
{
  "productUuids": ["string"],
  "categoryId": "string"
}
```

### Category Sync

| Method | Endpoint                          | Description                   | Auth Required |
| ------ | --------------------------------- | ----------------------------- | ------------- |
| POST   | `/inventory/sync-category-counts` | Sync all category item counts | Yes           |

### Delete

| Method | Endpoint                  | Description           | Auth Required |
| ------ | ------------------------- | --------------------- | ------------- |
| DELETE | `/inventory/item/:itemId` | Delete inventory item | Yes           |

---

## Customers

**Base Path:** `/customers`

| Method | Endpoint                               | Description             | Auth Required |
| ------ | -------------------------------------- | ----------------------- | ------------- |
| GET    | `/customers/`                          | Customer API info       | Yes           |
| GET    | `/customers/all`                       | List all customers      | Yes           |
| GET    | `/customers/customer/:customerId`      | Get customer by ID      | Yes           |
| POST   | `/customers/customer`                  | Create customer         | Yes           |
| PUT    | `/customers/customer`                  | Update customer         | Yes           |
| DELETE | `/customers/customer/:customerId`      | Delete customer         | Yes           |
| GET    | `/customers/customers/count`           | Get customer count      | Yes           |
| POST   | `/customers/customers/search`          | Search customers        | Yes           |
| GET    | `/customers/customers/unsynced`        | Get unsynced customers  | Yes           |
| PUT    | `/customers/customer/:customerId/sync` | Mark customer as synced | Yes           |

---

## Categories

**Base Path:** `/categories`

| Method | Endpoint                           | Description        | Auth Required |
| ------ | ---------------------------------- | ------------------ | ------------- |
| GET    | `/categories/`                     | Category API info  | Yes           |
| GET    | `/categories/all`                  | Get all categories | Yes           |
| POST   | `/categories/category`             | Create category    | Yes           |
| PUT    | `/categories/category/:categoryId` | Update category    | Yes           |
| DELETE | `/categories/category/:categoryId` | Delete category    | Yes           |

---

## Payment Methods

**Base Path:** `/payment-methods`

| Method | Endpoint                                 | Description                   | Auth Required |
| ------ | ---------------------------------------- | ----------------------------- | ------------- |
| GET    | `/payment-methods/`                      | Payment methods API info      | Yes           |
| GET    | `/payment-methods/all`                   | List all payment methods      | Yes           |
| POST   | `/payment-methods/`                      | Create payment method         | Yes           |
| GET    | `/payment-methods/count`                 | Get payment methods count     | Yes           |
| GET    | `/payment-methods/unsynced`              | Get unsynced payment methods  | Yes           |
| GET    | `/payment-methods/:paymentMethodId`      | Get payment method by ID      | Yes           |
| PUT    | `/payment-methods/:paymentMethodId`      | Update payment method         | Yes           |
| DELETE | `/payment-methods/:paymentMethodId`      | Delete payment method         | Yes           |
| PATCH  | `/payment-methods/:paymentMethodId/sync` | Mark payment method as synced | Yes           |

---

## Migration

**Base Path:** `/migration`

| Method | Endpoint              | Description            | Auth Required |
| ------ | --------------------- | ---------------------- | ------------- |
| POST   | `/migration/upload`   | Upload migration file  | Yes           |
| POST   | `/migration/migrate`  | Start migration        | Yes           |
| GET    | `/migration/progress` | Get migration progress | Yes           |
| POST   | `/migration/map-data` | Start data mapping     | Yes           |
| GET    | `/migration/reset`    | Reset migration        | Yes           |

> **Note:** File upload supports `.db`, `.json`, and `.csv` files up to 50MB.

---

## Transactions

**Base Path:** `/transactions`

| Method | Endpoint                                           | Description                    | Auth Required |
| ------ | -------------------------------------------------- | ------------------------------ | ------------- |
| GET    | `/transactions/`                                   | Transactions API info          | Yes           |
| GET    | `/transactions/all`                                | List all transactions          | Yes           |
| GET    | `/transactions/by-date`                            | Get transactions by date range | Yes           |
| POST   | `/transactions/post`                               | Create transaction             | Yes           |
| PUT    | `/transactions/update/:transactionId`              | Update transaction             | Yes           |
| GET    | `/transactions/transaction/:transactionId`         | Get transaction by ID          | Yes           |
| GET    | `/transactions/transaction/:transactionId/summary` | Get transaction summary        | Yes           |
| DELETE | `/transactions/transaction/:transactionId`         | Delete transaction             | Yes           |

---

## Returns/Refunds

**Base Path:** `/returns`

| Method | Endpoint                                | Description                        | Auth Required |
| ------ | --------------------------------------- | ---------------------------------- | ------------- |
| GET    | `/returns/`                             | Returns/Refunds API info           | Yes           |
| POST   | `/returns/initiate`                     | Initiate a return/refund           | Yes           |
| GET    | `/returns/transaction/:transactionId`   | Get all returns for a transaction  | Yes           |
| GET    | `/returns/:returnTransactionId`         | Get return details by ID           | Yes           |
| DELETE | `/returns/:returnTransactionId`         | Cancel a return                    | Yes           |
| POST   | `/returns/:returnTransactionId/restock` | Restock returned items             | Yes           |
| GET    | `/returns/statistics/summary`           | Get return statistics (date range) | Yes           |

---

## Hold Orders

**Base Path:** `/hold-orders`

| Method | Endpoint                    | Description          | Auth Required |
| ------ | --------------------------- | -------------------- | ------------- |
| GET    | `/hold-orders/`             | Hold Orders API info | Yes           |
| GET    | `/hold-orders/all`          | List all hold orders | Yes           |
| POST   | `/hold-orders/new`          | Create hold order    | Yes           |
| GET    | `/hold-orders/:holdOrderId` | Get hold order by ID | Yes           |
| DELETE | `/hold-orders/:holdOrderId` | Delete hold order    | Yes           |

---

## Subscriptions

**Base Path:** `/subscriptions`

| Method | Endpoint                               | Description                          | Auth Required |
| ------ | -------------------------------------- | ------------------------------------ | ------------- |
| GET    | `/subscriptions/live/tenant/:tenantId` | Get subscription by tenant ID (live) | No            |
| GET    | `/subscriptions/`                      | List all subscriptions               | Yes           |
| GET    | `/subscriptions/stats`                 | Get subscription statistics          | Yes           |
| GET    | `/subscriptions/expiring`              | Get expiring subscriptions           | Yes           |
| GET    | `/subscriptions/status/:status`        | Get subscriptions by status          | Yes           |
| GET    | `/subscriptions/tenant/:tenantId`      | Get subscription by tenant ID        | Yes           |
| GET    | `/subscriptions/plan/:planId`          | Get subscriptions by plan ID         | Yes           |
| GET    | `/subscriptions/:id`                   | Get subscription by ID               | Yes           |
| POST   | `/subscriptions/`                      | Create subscription                  | Yes           |
| PUT    | `/subscriptions/:id`                   | Update subscription                  | Yes           |
| DELETE | `/subscriptions/:id`                   | Delete subscription                  | Yes           |
| POST   | `/subscriptions/:id/cancel`            | Cancel subscription                  | Yes           |
| POST   | `/subscriptions/:id/reactivate`        | Reactivate subscription              | Yes           |
| POST   | `/subscriptions/:id/process-payment`   | Process subscription payment         | Yes           |
| PATCH  | `/subscriptions/bulk-update`           | Bulk update subscriptions            | Yes           |

---

## Subscription Plans

**Base Path:** `/subscription-plans`

| Method | Endpoint                                | Description                     | Auth Required |
| ------ | --------------------------------------- | ------------------------------- | ------------- |
| GET    | `/subscription-plans/`                  | List subscription plans         | Yes           |
| GET    | `/subscription-plans/active`            | Get active subscription plans   | Yes           |
| GET    | `/subscription-plans/:id`               | Get subscription plan by ID     | Yes           |
| POST   | `/subscription-plans/`                  | Create subscription plan        | Yes           |
| PUT    | `/subscription-plans/:id`               | Update subscription plan        | Yes           |
| DELETE | `/subscription-plans/:id`               | Delete subscription plan        | Yes           |
| PATCH  | `/subscription-plans/:id/toggle-status` | Toggle subscription plan status | Yes           |
| GET    | `/subscription-plans/:id/validate`      | Validate subscription plan      | Yes           |

---

## Terminals

**Base Path:** `/terminals`

| Method | Endpoint                | Description            | Auth Required |
| ------ | ----------------------- | ---------------------- | ------------- |
| GET    | `/terminals/`           | Terminals API info     | Yes           |
| GET    | `/terminals/all`        | Get all terminals      | Yes           |
| POST   | `/terminals/post`       | Create terminal        | Yes           |
| PUT    | `/terminals/update/:id` | Update terminal        | Yes           |
| GET    | `/terminals/:id`        | Get terminal by ID     | Yes           |
| DELETE | `/terminals/:id`        | Delete terminal        | Yes           |
| PUT    | `/terminals/status/:id` | Update terminal status | Yes           |
| POST   | `/terminals/sync/:id`   | Sync terminal          | Yes           |

---

## Roles

**Base Path:** `/roles`

| Method | Endpoint                                    | Description                 | Auth Required |
| ------ | ------------------------------------------- | --------------------------- | ------------- |
| GET    | `/roles/`                                   | List roles                  | Yes           |
| GET    | `/roles/all`                                | List all roles              | Yes           |
| POST   | `/roles/post`                               | Create role                 | Yes           |
| PUT    | `/roles/update/:id`                         | Update role                 | Yes           |
| GET    | `/roles/role/:id`                           | Get role by ID              | Yes           |
| DELETE | `/roles/role/:id`                           | Delete role                 | Yes           |
| GET    | `/roles/system`                             | Get system roles            | Yes           |
| GET    | `/roles/active`                             | Get active roles            | Yes           |
| PUT    | `/roles/activate/:id`                       | Activate role               | Yes           |
| PUT    | `/roles/deactivate/:id`                     | Deactivate role             | Yes           |
| GET    | `/roles/role/:id/permissions`               | Get role permissions        | Yes           |
| POST   | `/roles/role/:id/permissions`               | Assign permissions to role  | Yes           |
| DELETE | `/roles/role/:id/permissions/:permissionId` | Remove permission from role | Yes           |

---

## Permissions

**Base Path:** `/permissions`

| Method | Endpoint                          | Description                 | Auth Required |
| ------ | --------------------------------- | --------------------------- | ------------- |
| GET    | `/permissions/`                   | Permission API info         | Yes           |
| GET    | `/permissions/all`                | List all permissions        | Yes           |
| POST   | `/permissions/post`               | Create permission           | Yes           |
| PUT    | `/permissions/update/:id`         | Update permission           | Yes           |
| GET    | `/permissions/permission/:id`     | Get permission by ID        | Yes           |
| DELETE | `/permissions/permission/:id`     | Delete permission           | Yes           |
| GET    | `/permissions/category/:category` | Get permissions by category | Yes           |
| GET    | `/permissions/scope/:scope`       | Get permissions by scope    | Yes           |
| GET    | `/permissions/system`             | Get system permissions      | Yes           |
| GET    | `/permissions/categories`         | Get permission categories   | Yes           |
| GET    | `/permissions/scopes`             | Get permission scopes       | Yes           |

---

## Role Permissions

**Base Path:** `/role-permissions`

| Method | Endpoint                                                      | Description                      | Auth Required |
| ------ | ------------------------------------------------------------- | -------------------------------- | ------------- |
| GET    | `/role-permissions/`                                          | Role Permission API info         | Yes           |
| GET    | `/role-permissions/all`                                       | List all role permissions        | Yes           |
| POST   | `/role-permissions/post`                                      | Create role permission           | Yes           |
| DELETE | `/role-permissions/delete/:id`                                | Delete role permission           | Yes           |
| POST   | `/role-permissions/bulk/assign`                               | Bulk assign role permissions     | Yes           |
| DELETE | `/role-permissions/bulk/remove`                               | Bulk remove role permissions     | Yes           |
| GET    | `/role-permissions/role/:roleUuid`                            | Get permissions by role UUID     | Yes           |
| GET    | `/role-permissions/permission/:permissionUuid`                | Get roles by permission UUID     | Yes           |
| GET    | `/role-permissions/role/:roleUuid/permission/:permissionUuid` | Check role-permission assignment | Yes           |

---

## Orders

**Base Path:** `/orders`

| Method | Endpoint                           | Description                      | Auth Required |
| ------ | ---------------------------------- | -------------------------------- | ------------- |
| GET    | `/orders/`                         | Orders API info                  | Yes           |
| GET    | `/orders/all`                      | List all orders                  | Yes           |
| GET    | `/orders/ref/:refNumber`           | Get order by reference number    | Yes           |
| GET    | `/orders/product/:productId`       | Get orders by product ID         | Yes           |
| GET    | `/orders/:orderId`                 | Get order by ID                  | Yes           |
| POST   | `/orders/items`                    | Create order items               | Yes           |
| POST   | `/orders/items/batch`              | Create order items in batch      | Yes           |
| PUT    | `/orders/:orderId`                 | Update order                     | Yes           |
| DELETE | `/orders/:orderId`                 | Delete order                     | Yes           |
| DELETE | `/orders/ref/:refNumber`           | Delete order by reference number | Yes           |
| GET    | `/orders/status/unsynced`          | Get unsynced orders              | Yes           |
| PATCH  | `/orders/:orderId/sync`            | Mark order as synced             | Yes           |
| GET    | `/orders/stats/count`              | Get order count                  | Yes           |
| GET    | `/orders/stats/summary/:refNumber` | Get order summary                | Yes           |
| POST   | `/orders/search`                   | Search orders                    | Yes           |

---

## Security Middleware

All routes pass through the following security middleware:

- **Sanitize Input** - Sanitizes all incoming request data
- **Prevent SQL Injection** - Protects against SQL injection attacks
- **Prevent XSS** - Protects against cross-site scripting attacks
- **Rate Limiting** - Authentication routes have specific rate limits

---

## Authentication Flow

1. **Public Routes**: `/on-boarding`, `/account-seeds`, `/metadata`, `/plan-features`, `/auth/live/login`, `/subscriptions/live/tenant/:tenantId`
2. **Auth Routes**: `/auth/*` (with rate limiting)
3. **Protected Routes**: All other routes require valid JWT token

---

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

Common HTTP Status Codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Inventory Business Flow

**See detailed documentation:** [INVENTORY_FLOW_API.md](./INVENTORY_FLOW_API.md)

### Products

**Base Path:** `/products`

| Method | Endpoint                        | Description                        | Auth Required |
| ------ | ------------------------------- | ---------------------------------- | ------------- |
| POST   | `/products`                     | Create a new product               | Yes           |
| GET    | `/products`                     | List all products                  | Yes           |
| GET    | `/products/search/:term`        | Search product by SKU/barcode/name | Yes           |
| GET    | `/products/:productId`          | Get product details                | Yes           |
| PUT    | `/products/:productId`          | Update product                     | Yes           |
| DELETE | `/products/:productId`          | Delete (deactivate) product        | Yes           |
| POST   | `/products/:productId/barcodes` | Add barcode to product             | Yes           |

### Suppliers

**Base Path:** `/suppliers`

| Method | Endpoint                 | Description                  | Auth Required |
| ------ | ------------------------ | ---------------------------- | ------------- |
| POST   | `/suppliers`             | Create a new supplier        | Yes           |
| GET    | `/suppliers`             | List all suppliers           | Yes           |
| GET    | `/suppliers/:supplierId` | Get supplier details         | Yes           |
| PUT    | `/suppliers/:supplierId` | Update supplier              | Yes           |
| DELETE | `/suppliers/:supplierId` | Delete (deactivate) supplier | Yes           |

### Purchase Orders

**Base Path:** `/purchase-orders`

| Method | Endpoint                                    | Description            | Auth Required |
| ------ | ------------------------------------------- | ---------------------- | ------------- |
| POST   | `/purchase-orders`                          | Create purchase order  | Yes           |
| GET    | `/purchase-orders`                          | List purchase orders   | Yes           |
| GET    | `/purchase-orders/:purchaseOrderId`         | Get PO details         | Yes           |
| POST   | `/purchase-orders/:purchaseOrderId/receive` | Receive purchase order | Yes           |
| POST   | `/purchase-orders/:purchaseOrderId/cancel`  | Cancel purchase order  | Yes           |

### Sales

**Base Path:** `/sales`

| Method | Endpoint              | Description                   | Auth Required |
| ------ | --------------------- | ----------------------------- | ------------- |
| POST   | `/sales`              | Create a sale (POS)           | Yes           |
| GET    | `/sales`              | List sales                    | Yes           |
| GET    | `/sales/:saleId`      | Get sale details              | Yes           |
| POST   | `/sales/:saleId/void` | Void sale (reverse inventory) | Yes           |

### Stock Movements

**Base Path:** `/stock-movements`

| Method | Endpoint                              | Description                | Auth Required |
| ------ | ------------------------------------- | -------------------------- | ------------- |
| GET    | `/stock-movements/product/:productId` | Get product stock history  | Yes           |
| GET    | `/stock-movements/branch`             | Get branch stock movements | Yes           |

---

## Rate Limiting

- **Authentication endpoints**: Limited requests per minute
- **User-specific actions**: Limited based on user ID
- **General API**: Standard rate limiting applied

---

_Last Updated: December 2024_
