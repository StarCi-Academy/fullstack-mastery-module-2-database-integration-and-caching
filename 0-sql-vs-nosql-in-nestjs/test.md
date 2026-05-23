# Test Flows — 0-sql-vs-nosql-in-nestjs

Status: AUTHORED (4 flows). E2E verification pending sandbox unblock.

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

## Flow 2 — Read comparison (`GET /compare/read`)

- Request: `GET http://localhost:3000/compare/read`
- Expected (HTTP 200): `{ "sqlCount": 1, "noSqlCount": 1, "sqlItems": [...], "noSqlItems": [...] }`

## Flow 3 — Parallel latency (`GET /compare/timings`)

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

## Flow 4 — Polyglot cleanup (`DELETE /compare/all`)

- Request: `DELETE http://localhost:3000/compare/all`
- Expected (HTTP 200): `{ "pgDeleted": 2, "mongoDeleted": 2 }`
- Validation: subsequent `GET /compare/read` returns `{ "sqlCount": 0, "noSqlCount": 0, ... }`.
