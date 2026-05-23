# Test Flows — 2-mongoose-and-mongodb

Status: AUTHORED (4 flows). E2E verification pending sandbox unblock.

## Flow 1 — Create cat document (`POST /cats`)

- Request body:

```json
{"name":"Luna","age":3,"breed":"Persian","hobbies":["sleeping","eating"],"metadata":{"color":"white"}}
```

- Expected (HTTP 201): document with `_id` ObjectId, `createdAt`, `updatedAt`, `likes: 0` (default).

## Flow 2 — Search and update (`GET /cats/search?name=` + `PUT /cats/:id`)

- `GET /cats/search?name=Luna` returns Luna's document.
- `PUT /cats/<id>` body `{"age":4}` returns the document with `age: 4` and refreshed `updatedAt`.

## Flow 3 — Array query (`GET /cats?hobby=fishing`)

- Pre-step: create Whiskers with `hobbies: ["fishing","napping"]`.
- Request: `GET /cats?hobby=fishing`
- Expected (HTTP 200): `[ { _id, name: "Whiskers", hobbies: [...], ... } ]` -- only docs whose `hobbies` array contains "fishing".
- Validation: Luna (without "fishing") MUST NOT appear.

## Flow 4 — Atomic `$inc` increment (`POST /cats/:id/like`)

- Request: `POST /cats/<lunaId>/like`
- Expected (HTTP 201): Luna's document with `likes: 1`.
- Validation: calling again returns `likes: 2`; concurrent callers never lose increments thanks to server-side `$inc`.
