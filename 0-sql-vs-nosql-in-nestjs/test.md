# Test Flows — 0-sql-vs-nosql-in-nestjs

Status: AUTHORED (5 flows). E2E verification pending sandbox unblock.

## Flow 1 — Write sample data (`POST /compare/write`)

- Request: `POST http://localhost:3000/compare/write` body `{"title":"Order #1","amount":100}`
- Expected (HTTP 200):

```json
{
  "message": "Saved to both SQL and NoSQL stores.",
  "sql": {
    "id": "<uuid>",
    "title": "Order #1",
    "amount": 100,
    "createdAt": "<ISO datetime>"
  },
  "noSql": {
    "id": "<mongo object id>",
    "title": "Order #1",
    "amount": 100,
    "createdAt": "<ISO datetime>"
  }
}
```

## Flow 2 — Read both engines in parallel (`GET /compare/read`)

- Request: `GET http://localhost:3000/compare/read`
- Expected (HTTP 200): `{ "sqlCount": 1, "noSqlCount": 1, "sqlItems": [...], "noSqlItems": [...] }`
- Validation: both `sqlItems` and `noSqlItems` arrays are non-empty, proving the controller's `Promise.all([sql, noSql])` fan-out reached both stores.

## Flow 3 — Side-by-side comparison (counts + titles match)

- Re-uses the `GET /compare/read` payload from Flow 2.
- Assertion: `sqlCount === noSqlCount` AND `sqlItems[0].title === noSqlItems[0].title`.
- PowerShell:
  ```powershell
  $r = Invoke-RestMethod -Uri http://localhost:3000/compare/read
  if ($r.sqlCount -eq $r.noSqlCount -and $r.sqlItems[0].title -eq $r.noSqlItems[0].title) { "MATCH" } else { "MISMATCH" }
  ```
- curl + jq:
  ```bash
  curl -s http://localhost:3000/compare/read | jq '.sqlCount == .noSqlCount and .sqlItems[0].title == .noSqlItems[0].title'
  ```
- Pass criteria: PowerShell prints `MATCH`; jq prints `true`. Proves both engines hold the same logical record even though the identifier shapes differ.

## Flow 4 — Parallel latency (`GET /compare/timings`)

- Request: `GET http://localhost:3000/compare/timings`
- Expected (HTTP 200):

```json
{
  "sqlMs": 12.435,
  "noSqlMs": 7.812,
  "deltaMs": 4.623
}
```

- Validation: `sqlMs > 0`, `noSqlMs > 0`, `deltaMs = sqlMs - noSqlMs` (tolerance ±0.001).

## Flow 5 — Polyglot cleanup (`DELETE /compare/all`)

- Request: `DELETE http://localhost:3000/compare/all`
- Expected (HTTP 200): `{ "pgDeleted": 2, "mongoDeleted": 2 }`
- Validation: subsequent `GET /compare/read` returns `{ "sqlCount": 0, "noSqlCount": 0, ... }`.
