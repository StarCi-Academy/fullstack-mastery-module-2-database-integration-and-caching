# Test Flows — 2-mongoose-and-mongodb

Status: AUTHORED (5 flows). E2E verification pending sandbox unblock.

## Flow 1 — Create cat document (`POST /cats`)

- Request body:

```json
{"name":"Luna","age":3,"breed":"Persian","hobbies":["sleeping","eating"],"metadata":{"color":"white"}}
```

- Expected (HTTP 201): document with `_id` ObjectId, `createdAt`, `updatedAt`, `likes: 0` (default).

## Flow 2 — Search by name (`GET /cats/search?name=Luna`)

- Request: `GET http://localhost:3000/cats/search?name=Luna`
- Expected (HTTP 200): Luna's document with `name: "Luna"` and an `_id` ObjectId.
- Pass criteria: response is a single document (not an array), proving `findOne({ name })` was used and the index on `name` was hit.

## Flow 3 — `findByIdAndUpdate` with `returnDocument=after` (`PUT /cats/:id`)

- Request: `PUT http://localhost:3000/cats/<lunaId>` body `{"age":4}` (re-use the `_id` returned by Flow 2).
- Expected (HTTP 200): the post-update document with `age: 4`, a refreshed `updatedAt`, and other fields (`name`, `breed`, `hobbies`) preserved.
- Pass criteria: returned `age === 4` (proves `returnDocument: "after"` is in effect — otherwise the response would still show `age: 3` from the pre-update snapshot).

## Flow 4 — Array query (`GET /cats?hobby=fishing`)

- Pre-step: create Whiskers with `hobbies: ["fishing","napping"]`.
- Request: `GET /cats?hobby=fishing`
- Expected (HTTP 200): `[ { _id, name: "Whiskers", hobbies: [...], ... } ]` -- only docs whose `hobbies` array contains "fishing".
- Validation: Luna (without "fishing") MUST NOT appear.

## Flow 5 — Atomic `$inc` increment (`POST /cats/:id/like`)

- Request: `POST /cats/<lunaId>/like`
- Expected (HTTP 201): Luna's document with `likes: 1`.
- Validation: calling again returns `likes: 2`; concurrent callers never lose increments thanks to server-side `$inc`.
