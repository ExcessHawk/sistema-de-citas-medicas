# Backend migration: Express → Veloce-TS

The legacy `backend/` (Express + raw `pg`) was ported to this `backend-veloce/`
app (Bun + Hono + Drizzle + Zod + Veloce-TS decorators). The old backend is left
untouched for reference until cutover.

## Stack

| Concern        | Legacy                    | New (this app)                         |
| -------------- | ------------------------- | -------------------------------------- |
| Runtime        | Node + Express            | Bun + Hono (via Veloce-TS)             |
| Routing        | `express.Router`          | `@Controller` / `@Get/@Post/...`       |
| Validation     | express-validator         | Zod schemas in `src/dtos/`             |
| DB access      | raw `pg` query strings    | Drizzle ORM (`src/db/schema.ts`)       |
| Auth           | manual JWT middleware     | `AuthPlugin` + `@Roles(...)` (RBAC)    |
| DI             | none                      | Veloce DI container (`@InjectDB`, `@Inject`) |

## Layout

```
src/
  index.ts                 # bootstrap: plugins, DI, controllers
  db/{schema,client}.ts    # Drizzle schema + pg pool
  auth/{user-provider,current-user}.ts
  dtos/*.dto.ts            # Zod request schemas
  services/{auth,email}.service.ts
  controllers/*.controller.ts
drizzle/                   # generated SQL migrations
```

## Auth model

`AuthPlugin` verifies the `Authorization: Bearer <jwt>` on every request and
populates `auth.user` with the token payload. Routes are gated declaratively:

- **public** — no decorator (e.g. `GET /api/doctors`)
- **any authenticated** — `@Roles(['patient','doctor','admin'])`
- **clinician** — `@Roles(['doctor','admin'])`
- **admin** — `@Roles(['admin'])`

`@Roles([...])` is **OR** semantics (passes if the user has any listed role).
Ownership checks (patient sees only their own data, doctor edits only their own
entries) are enforced in-handler via `requireUser(c)`.

Tokens are signed by `AuthService` using the same `JWTProvider` instance the
`AuthPlugin` uses to verify — payload carries `{ sub, id, email, role, roles }`.

## API changes vs legacy

- Base paths unchanged: `/api/auth`, `/api/doctors`, `/api/appointments`,
  `/api/patients`, `/api/admin`. Patients sub-routes unchanged
  (`/api/patients/patient/:id`, `/follow-ups/...`, `/conditions/...`, `/documents/...`).
- **Request/response fields are now camelCase** (`doctorId`, `appointmentDate`,
  `consultationFee`, `doctorInfo`, …) instead of snake_case. Regenerate the
  frontend client with `bun run generate:client` or adjust the frontend at
  cutover.
- Validation errors return Veloce's problem/violations shape (422) instead of
  express-validator's `errors[]`.
- `/api/admin/stats` and `/api/admin/users` now return real aggregates (were
  stubs).
- The legacy `POST /api/appointments` `requireOwnershipOrAdmin('appointments')`
  middleware was effectively broken (queried a non-existent `user_id` column);
  the new handler simply books for the authenticated patient.

## Run

```bash
cp .env.example .env          # set DATABASE_URL, JWT_SECRET, EMAIL_* if used
bun install

# Start a Postgres for THIS app. Use the dedicated compose here (no legacy SQL
# init mounts — schema is owned by Drizzle). The root docker-compose.yml belongs
# to the legacy backend; both map host port 5433, so run only ONE at a time.
docker compose up -d          # backend-veloce/docker-compose.yml
bun run db:migrate            # apply drizzle/ migrations (enum-based schema)

bun run dev                   # http://localhost:5000  (docs at /docs)
```

Email is optional: without `EMAIL_USER`/`EMAIL_PASS` all sends are no-ops.
