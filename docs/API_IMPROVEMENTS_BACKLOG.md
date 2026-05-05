# API Improvements Backlog

A prioritized list of improvements for the zonse247 POS API, captured for
later implementation. Each item includes context, file references, and a
suggested approach.

> Status legend: `[ ]` not started · `[~]` in progress · `[x]` done

---

## High impact — correctness & reliability

### [ ] 1. Resolve Prisma generator output mismatch permanently

**Context.** `schema.sqlite.prisma` outputs to `./generated/prisma`,
`schema.mysql.prisma` outputs to `./generated/mysql`, and code imports
from `./generated/mysql/client`. This drift caused the
`Unknown argument serviceOrderId` outage on 2026-05-05.

**Files.**
- [src/databases/prisma/schema.mysql.prisma](src/databases/prisma/schema.mysql.prisma)
- [src/databases/prisma/schema.sqlite.prisma](src/databases/prisma/schema.sqlite.prisma)
- [src/databases/prisma/client.mysql.ts](src/databases/prisma/client.mysql.ts)
- [src/databases/prisma/client.sqlite.ts](src/databases/prisma/client.sqlite.ts)
- [src/databases/prisma/seeds/](src/databases/prisma/seeds/)

**Suggested approach.** Either:
- Standardise on per-DB output folders (`./generated/mysql`, `./generated/sqlite`)
  and make `client.ts` a thin re-export selected by `db.sh switch_schema`, **or**
- Standardise on a single shared `./generated/prisma` folder (overwritten
  per active schema) and update all imports.

Add a startup check that asserts the generated client has the expected
fields (see item 22).

---

### [ ] 2. Wrap parent-child sync inserts in a transaction

**Context.** [sync-receiver.service.ts:88-129](src/services/sync/sync-receiver.service.ts#L88)
runs `receiveSales → receiveSaleItems → receiveSalePayments` sequentially.
If `receiveSalePayments` fails, sales and saleItems remain committed
without their payments. This is exactly how the recent orphan-data state
occurred.

**Suggested approach.**
```ts
await prisma.$transaction(async (tx) => {
    await receiveSales(sales, terminalId, tx);
    await receiveSaleItems(items, terminalId, tx);
    await receiveSalePayments(payments, tx);
});
```
Threading `tx` requires either passing it down or using async-local
storage. Choose per-batch atomicity (simplest) or per-sale atomicity
(stronger isolation).

---

### [ ] 3. Don't advance `lastPushedAt` on partial failure

**Context.** [sync-receiver.service.ts:169](src/services/sync/sync-receiver.service.ts#L169)
advances the watermark whenever any table accepts ≥ 1 record. A
terminal then thinks rejected records were synced. This caused the
silent loss of sales/payments in the 2026-05-05 incident.

**Suggested approach.**
- Track per-table `lastPushedAt` in `TerminalSyncState`.
- Or only advance the watermark when `summary.rejected === 0`.
- Add a daily reconciliation job that compares row counts.

---

### [ ] 4. Use correct HTTP status codes for sync responses

**Context.** Table sync endpoints return `200 OK` even when zero records
were accepted. Frontends commonly treat 200 = success.

**Suggested approach.**
- `200` — all accepted/skipped, no errors.
- `207 Multi-Status` — partial success.
- `422 Unprocessable Entity` — zero accepted.
- `400` — payload validation failed.

Update [src/controllers/sync.controller.ts](src/controllers/sync.controller.ts)
`createSyncResponse` and the `handleSyncEndpoint` helper.

---

### [ ] 5. Audit handlers for Prisma 7 mixed `connect:` + spread bug

**Context.** Prisma 7's `prisma-client` generator rejects mixed forms
(`tenant: { connect: ... }` plus spread of scalar fields like
`terminalId`). [customers.handler.ts](src/services/sync/handlers/customers.handler.ts)
was fixed; other handlers may have the same pattern.

**Suggested approach.** Search:
```bash
grep -rn "connect: {" src/services/sync/handlers/ src/services/
```
Convert to scalar FK form (`tenantId: '...'`) consistently.

---

## Medium impact — security

### [ ] 6. Trust only `req.auth.tenantId` for sync endpoints

**Context.** [sync.controller.ts](src/controllers/sync.controller.ts)
`getTenantId` falls back to `x-tenant-id` header / body. After auth is
verified, the body/header tenantId is never the source of truth.

**Suggested approach.** Drop the fallback for authenticated routes;
return `401` if `req.auth?.tenantId` is missing.

---

### [ ] 7. Per-record tenant/branch boundary checks

**Context.** A compromised terminal can push records carrying any
`tenantId`/`branchId`. Server-side handlers don't reject mismatches.

**Suggested approach.** In each handler, before insert, drop or reject
any record where `record.tenantId !== auth.tenantId` (or branchId not in
the user's allowed branches). Log rejections.

---

### [ ] 8. Rate-limit `/sync/*` endpoints

**Context.** Only `/auth` has a rate limiter
([rate-limit.middleware.ts](src/middlewares/rate-limit.middleware.ts)).
A misbehaving terminal can saturate the sync pipeline.

**Suggested approach.** Apply a per-terminal limiter (e.g. 60 requests/
minute) keyed by `x-terminal-id`. Use a separate, higher quota for
`/sync/batch`.

---

### [ ] 9. Schema-validate sync payloads (not just sizes)

**Context.** [sync-validation.middleware.ts](src/services/sync/sync-validation.middleware.ts)
validates array length only. Malformed payloads reach Prisma before
being rejected.

**Suggested approach.** Add Joi/Zod schemas per table; reject early
with a clear field error.

---

### [ ] 10. Review compression / helmet on sync routes

**Context.** Compression of small payloads adds latency. Helmet may be
missing on some streamed responses.

**Suggested approach.** Configure `compression({ threshold: 1024 })`.
Confirm helmet is applied globally and not bypassed by sync routes.

---

## Medium impact — performance

### [ ] 11. Reduce noise in `receiveSaleItems` when parent is missing

**Context.** [sales.handler.ts](src/services/sync/handlers/sales.handler.ts)
emits one error per item when the parent sale is missing. A 500-item
batch yields 500 identical errors.

**Suggested approach.** Group errors by `saleId` and emit one
`Parent sale not found` per missing parent. Include the affected item
count.

---

### [ ] 12. Make change-log writes durable

**Context.** [change-log.service.ts](src/services/sync/change-log.service.ts)
`recordChangesAsync` swallows errors with `.catch(() => {})`. If the
insert fails, downstream terminals never see the change.

**Suggested approach.**
- Outbox table written in the same transaction as the record.
- Background worker drains the outbox into `change_log`.
- Or at minimum: retry with backoff and log on persistent failure.

---

### [ ] 13. Verify all sync indexes

**Context.** Migration `20260302_05` added sync indexes. New tables
(loyalty, services, etc.) may have been added without matching indexes.

**Suggested approach.** Audit each syncable table for
`(tenant_id, branch_id, updated_at)` and `(tenant_id, branch_id, deleted_at)`.
Add missing ones in a new migration.

---

### [ ] 14. Transactional consistency between record + change-log

**Context.** Records and change-log entries are written separately.
A pulling terminal may see a record before its change-log entry, or
vice versa.

**Suggested approach.** Write change-log inside the same `$transaction`
as the record insert (requires item 2 first).

---

### [ ] 15. Cache `getOrCreateSyncState` per request

**Context.** Called for every pull; performs an upsert each time.

**Suggested approach.** Cache by `(terminalId, tenantId, branchId)` for
the request lifetime; only persist updates at the end.

---

## Low/medium impact — code quality

### [ ] 16. Remove `as any` casts in sync handlers

**Context.** Casts in [customers.handler.ts](src/services/sync/handlers/customers.handler.ts),
[sales.handler.ts](src/services/sync/handlers/sales.handler.ts) and
others mask the kind of schema drift that caused the recent outage.

**Suggested approach.** Use generated Prisma input types; let the
compiler catch field-name mismatches.

---

### [ ] 17. Fix bare-module imports in `AuthRequest`

**Context.** [express.type.ts](src/lib/express.type.ts) imports
`Tenant`, `User`, `Branch` from bare module names. Works only because
of `tsconfig` paths.

**Suggested approach.** Use explicit relative paths
(`../types/tenant`, `../types/users`, `../types/branch`).

---

### [ ] 18. Single source of truth for syncable table names

**Context.** Table names listed in:
- [sync-validation.middleware.ts](src/services/sync/sync-validation.middleware.ts)
- [sync-receiver.service.ts](src/services/sync/sync-receiver.service.ts)
- change-log builder
- [sync.routes.ts](src/routes/sync.routes.ts)

**Suggested approach.** Define a `SYNCABLE_TABLES` const with metadata
(name, idField, dependencies) and import everywhere.

---

### [ ] 19. Bound parallelism in batch sync

**Context.** [sync-receiver.service.ts](src/services/sync/sync-receiver.service.ts)
runs independent tables in parallel via `Promise.all`. Under load this
saturates the DB pool.

**Suggested approach.** Use `p-limit` (or a small in-house limiter) with
concurrency 4 for parallel tables.

---

### [ ] 20. Standardise on `BaseController` response helpers

**Context.** Some controllers build response shapes manually. The
helper exists in [base.controller.ts](src/controllers/base.controller.ts).

**Suggested approach.** Migrate all controllers to
`BaseController.sendSuccess` / `sendBadRequest` / `sendServerError`.

---

## Operational

### [ ] 21. Improve `deploy.sh`

**Context.** [scripts/deploy.sh](scripts/deploy.sh) currently runs
`db:generate:mysql` after build, and uses `pm2 reload`/`start` which
can drop traffic.

**Suggested approach.**
- Run `task gen:mysql` after `git pull`, **before** `tsc`.
- Add `pm2 reload` (zero-downtime) instead of `restart`.
- After reload, `curl localhost:PORT/v1/health` and abort/rollback if
  not 200 within 10 s.
- Snapshot the previous `dist/` folder for fast rollback.

---

### [ ] 22. Startup self-check for client/schema sync

**Context.** A stale generated client was the root cause of the
2026-05-05 outage.

**Suggested approach.** On boot, query a known column added in a recent
migration (e.g. `sale_payments.service_order_id`) via Prisma. If the
client doesn't expose it, log a fatal warning and exit. Prevents the
class of bug that took down sync.

---

### [ ] 23. Structured logging

**Context.** Sync handlers use ad-hoc `console.log`/`console.error`
with `LOG_PREFIX` strings. Hard to grep, no correlation IDs.

**Suggested approach.** Adopt `pino` with child loggers tagged by
`terminalId`, `tenantId`, `requestId`. Forward to PM2 logs.

---

### [ ] 24. Deeper `/v1/health` checks

**Context.** Current health endpoint likely returns 200 unconditionally.

**Suggested approach.** Return JSON with:
- DB ping latency
- Current migration version vs `CURRENT_DB_VERSION`
- Time skew between server and DB
- Memory & event-loop lag

Use 200 for healthy, 503 otherwise.

---

### [ ] 25. Test coverage for sync handlers

**Context.** Only [src/__tests__/app.test.ts](src/__tests__/app.test.ts)
exists. The recent customer / sale-payment regressions would have been
caught by table-level unit tests.

**Suggested approach.**
- One test file per handler under `src/__tests__/sync/`.
- Use a Prisma mock or sqlite in-memory.
- Cover: accepted, skipped, rejected, missing parent, invalid tenant.

---

## Implementation order (suggested)

1. **22 — startup self-check** (5-line guard, prevents recurrence)
2. **2 — transactional sync** (correctness)
3. **3 — watermark guard** (correctness)
4. **6 — auth-only tenantId** (security)
5. **7 — per-record boundary checks** (security)
6. **21 — deploy.sh `gen:mysql` ordering** (operational)
7. **25 — handler tests** (regression prevention)
8. Then the rest as time permits.
