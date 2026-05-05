# Force Data Sync — Frontend Implementation Guide

Audience: Frontend / Electron desktop developers integrating with the
zonse247 POS API sync module.

This document describes how to implement a **force resync** flow on the
Electron desktop app that is safe at scale (thousands of records),
non-blocking for the UI, and resilient to network/server failures.

---

## 1. Background

- The desktop app stores data locally in **SQLite** (offline-first).
- The server stores data in **MySQL** and exposes a sync module under
  `POST /v1/sync/*`.
- Normal sync only pushes records flagged as "changed since
  `lastPushedAt`". A **force resync** ignores that watermark and pushes
  (or re-pulls) everything within a chosen scope.

You should treat force resync as a **maintenance / recovery** operation,
not a default behavior. Trigger it only when the user explicitly asks
("Resync now" button, troubleshooting flow, or after a server outage).

---

## 2. Server-side limits you MUST respect

Defined in `sync-validation.middleware.ts`:

| Constraint              | Limit  |
| ----------------------- | -----: |
| Max records per table   | 2,000  |
| Max total batch size    | 5,000  |
| Request timeout (typical) | 30s   |

Violating these returns `400 Bad Request`. Do not raise the limits
client-side; instead chunk the work (see §5).

---

## 3. Endpoints reference

| Purpose                | Endpoint                          | Notes                                              |
| ---------------------- | --------------------------------- | -------------------------------------------------- |
| Push one table         | `POST /v1/sync/<table>`           | Body: `{ records: [...] }`                         |
| Push batch of tables   | `POST /v1/sync/batch`             | Body: `{ sales, saleItems, salePayments, ... }`    |
| Pull all changed       | `POST /v1/sync/pull`              | Body: `{ since?, tables?, limit? }`                |
| Pull one table         | `POST /v1/sync/pull/:tableName`   | Body: `{ since?, limit? }`                         |
| Bidirectional          | `POST /v1/sync/bidirectional`     | Body: `{ push, pullSince?, pullTables?, pullLimit? }` |
| Status                 | `GET  /v1/sync/status`            | Returns terminal sync state                        |

**Required headers on every request**

```
Authorization: Bearer <jwt>
x-terminal-id: <uuid>
x-tenant-id: <uuid>      // also derived from auth, but include for clarity
x-branch-id: <uuid>
Content-Type: application/json
```

Servers respond:

- `200` — full success
- `207` — partial success (some records rejected; inspect `results.errors`)
- `400` — validation error (bad payload, oversize batch)
- `401` — missing/invalid auth
- `5xx` — server error → retry with backoff

The payload is **idempotent** on the server: it uses `createMany({
skipDuplicates: true })`, so retrying the same records is safe.

---

## 4. UX rules for a force resync

1. **Explicit user action.** Never auto-trigger. Use a button labelled
   "Force Resync" with a confirmation modal.
2. **Single-flight.** Disable the button while a sync is in progress.
   Persist this flag so a window reload cannot start a second run.
3. **Show progress.** Render a determinate progress bar with:
   - Table being processed
   - Records sent / total
   - Time elapsed / ETA
   - Cancel button (must be honoured between chunks)
4. **Non-blocking UI.** Run the sync in a worker / background process
   (see §6). The renderer must stay responsive.
5. **Resumable.** On crash, restart, or cancellation, the next attempt
   should resume from where the previous one stopped. Track per-table
   cursors locally.
6. **Never crash on bad data.** A single bad record should be logged
   and skipped, not abort the whole run.

---

## 5. Chunking strategy

Push tables in **dependency order** so child rows always find their
parent on the server:

```
1. customers
2. sales
3. saleItems        (depends on sales)
4. salePayments     (depends on sales)
5. returns
6. returnItems      (depends on returns)
7. stockMovements
8. orders
9. users
```

Within each table, page rows in chunks. Recommended defaults:

```ts
const PER_TABLE_CHUNK = 500;     // well under the 2,000 cap
const PARALLEL_REQUESTS = 1;     // keep at 1 for force resync
```

Pseudocode:

```ts
for (const table of TABLE_ORDER) {
  let cursor = await db.getResumeCursor(table);
  while (true) {
    if (cancelRequested) return;
    const rows = await db.fetchPendingRows(table, {
      afterId: cursor,
      limit: PER_TABLE_CHUNK,
      forceAll: forceMode,        // ignore last_synced_at when true
    });
    if (rows.length === 0) break;

    await pushWithRetry(`/v1/sync/${endpointFor(table)}`, { records: rows });

    cursor = rows[rows.length - 1].id;
    await db.setResumeCursor(table, cursor);
    progress.update(table, rows.length);

    // yield to the event loop so the UI can repaint
    await sleep(0);
  }
}
```

Keep chunk size adaptive: if a request takes more than ~10 s, halve
`PER_TABLE_CHUNK` for the next call. If it takes < 1 s, you may double
it (capped at 1,500).

---

## 6. Run the sync off the main thread

In Electron:

- **Renderer process must NOT do the work.** Use either
  - the **main process** with `ipcRenderer` events for progress, or
  - a **utilityProcess / Web Worker** with `MessageChannel`.
- All SQLite reads/writes happen in the worker. Never load thousands of
  rows into the renderer.
- Stream from SQLite using paged queries (`LIMIT/OFFSET` or keyset
  pagination on `id`/`updated_at`). **Never** `SELECT *` an entire
  table into memory.

```ts
// main.ts — utility process pattern
import { utilityProcess } from 'electron';

const child = utilityProcess.fork(path.join(__dirname, 'sync.worker.js'));
child.on('message', (msg) => mainWindow.webContents.send('sync:event', msg));
child.postMessage({ type: 'start', mode: 'force' });
```

---

## 7. Retry & backoff

Every HTTP call must wrap in retry-with-backoff. Suggested policy:

```
attempts:    1   2   3   4   5
delay (ms):  0   500 2k  8k  30k     (cap at 30s; jitter ±25%)
```

Retry on:
- network failure (`ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND`)
- HTTP `5xx`
- HTTP `429`

Do **not** retry on:
- `4xx` other than `429` — log and surface to the user; the data is bad
  or the auth has expired.

After the last failed attempt, mark the chunk as "deferred" in the
local resume cursor and continue with the next chunk. Surface the
deferred chunks at the end so the user can view / re-run them.

---

## 8. Memory & resource control

- **Stream, don't bulk-load.** Use SQLite cursors with keyset pagination
  on a primary key.
- **Release references** between chunks (`rows = null`).
- **Avoid JSON.stringify of huge arrays.** Stringify per chunk only.
- **gzip the request.** axios: `decompress: true` and the server already
  handles gzipped responses via `compression` middleware.
- **Throttle concurrency.** One in-flight request at a time during a
  forced resync; this is a CPU + DB heavy operation server-side too.
- **Heap target.** Keep peak RSS under ~250 MB on the worker — chunk
  size of 500 rows times typical row width keeps you safe.
- **Disable animations / heavy UI** while the bar is shown. Render
  progress with a simple `<progress>` element, not a charting library.

---

## 9. Cancellation

Honor cancel between chunks, not mid-request. Hold an `AbortController`:

```ts
const ctrl = new AbortController();
ipcMain.on('sync:cancel', () => ctrl.abort());
await axios.post(url, body, { signal: ctrl.signal });
```

On cancel:
- finish or roll back the in-flight request
- persist the resume cursor
- emit `sync:cancelled` to the UI

---

## 10. Force vs incremental — local data fetch

Add a `forceAll` flag to the local query that selects pending rows.

```sql
-- Incremental
SELECT * FROM sales
WHERE last_synced_at IS NULL OR last_synced_at < updated_at
ORDER BY id
LIMIT 500;

-- Force resync
SELECT * FROM sales
WHERE id > :cursor
ORDER BY id
LIMIT 500;
```

After a successful push, mark the rows on the local DB:

```sql
UPDATE sales
SET last_synced_at = CURRENT_TIMESTAMP
WHERE id IN (...);
```

When the user triggers force resync, also clear the
`TerminalSyncState.lastPushedAt` watermark so any future incremental
sync will not skip rows that the server might have rejected previously.

---

## 11. Pull side (server → desktop)

For force resync of pulls, send `since` as `null` or omit it; the server
will return up to `limit` rows per table. Loop until `lastSequence`
stops advancing or a returned page is empty.

```ts
let since: string | null = forceMode ? null : await db.getLastPullAt();
while (true) {
  if (cancelRequested) return;
  const { data } = await api.post('/v1/sync/pull', {
    since,
    tables: ['products', 'customers', 'sales'],   // narrow if possible
    limit: 500,
  });

  const total = sumLengths(data);
  if (total === 0) break;

  await db.applyPulledRecords(data);             // upsert in a tx
  since = data.serverTime ?? new Date().toISOString();
  progress.updatePull(total);
  await sleep(0);
}
```

Apply pulled rows inside a SQLite transaction per chunk so a crash
mid-write leaves the DB consistent.

---

## 12. UI checklist

- [ ] Disable Force Resync while a sync is running
- [ ] Show table being processed, count, and ETA
- [ ] Cancel button working between chunks
- [ ] Network status indicator (online/offline)
- [ ] Final summary: accepted / skipped / rejected per table
- [ ] Persist `last_force_resync_at` and show it on the screen
- [ ] Surface server `errors[]` with a "Copy details" button for support

---

## 13. Verification steps after a force resync

1. `GET /v1/sync/status` and confirm
   `lastPushedAt` and `lastPulledAt` are recent.
2. Open the diagnostics screen and verify counts match between
   local SQLite and server (sales, saleItems, salePayments).
3. If counts mismatch, run the server-side `find-orphan-sales`
   script and report the output.

---

## 14. What NOT to do

- Do not load all rows into a single array in memory.
- Do not send more than 2,000 rows per table or 5,000 rows per batch.
- Do not retry `400` errors — fix the data.
- Do not run sync on the renderer process.
- Do not block the user while syncing — the app must remain usable.
- Do not silently swallow rejections; show them in the summary.

---

## 15. Minimal example

```ts
// sync.worker.ts (Electron utility process)
import axios from 'axios';
import { openDb } from './db';

const TABLE_ORDER = [
  'customers', 'sales', 'saleItems', 'salePayments',
  'returns', 'returnItems', 'stockMovements', 'orders', 'users',
];
const ENDPOINT: Record<string, string> = {
  customers: 'customers',
  sales: 'sales',
  saleItems: 'sale-items',
  salePayments: 'sale-payments',
  returns: 'returns',
  returnItems: 'return-items',
  stockMovements: 'stock-movements',
  orders: 'orders',
  users: 'users',
};

export async function forceResync(headers: Record<string, string>) {
  const db = await openDb();
  const api = axios.create({
    baseURL: process.env.API_BASE_URL,
    headers,
    timeout: 30_000,
  });

  for (const table of TABLE_ORDER) {
    let cursor: string | null = await db.getCursor(table);
    while (true) {
      const rows = await db.fetchChunk(table, cursor, 500);
      if (!rows.length) break;

      await pushWithRetry(api, `/v1/sync/${ENDPOINT[table]}`, { records: rows });

      cursor = rows[rows.length - 1].id;
      await db.setCursor(table, cursor);
      await db.markSynced(table, rows.map((r) => r.id));
      postProgress({ table, sent: rows.length });
      await new Promise((r) => setImmediate(r));
    }
  }
}

async function pushWithRetry(api: any, url: string, body: any, attempt = 1): Promise<void> {
  try {
    await api.post(url, body);
  } catch (err: any) {
    const status = err?.response?.status;
    const retriable = !status || status >= 500 || status === 429;
    if (!retriable || attempt >= 5) throw err;
    const delay = Math.min(30_000, 500 * 2 ** (attempt - 1)) * (0.75 + Math.random() * 0.5);
    await new Promise((r) => setTimeout(r, delay));
    return pushWithRetry(api, url, body, attempt + 1);
  }
}
```

---

## 16. Support data when reporting an issue

When a user reports a stuck sync, collect:

- Output of `GET /v1/sync/status`
- Latest 200 lines of the worker log
- Counts per table (local vs server)
- Terminal ID, tenant ID, branch ID
- Time window of the issue
