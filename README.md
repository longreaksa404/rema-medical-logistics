<div align="center">

<img src="frontend/public/rema_logo_new.svg" alt="REMA logo" width="64" />

# REMA — Rapid Emergency Medical Access

**Medical logistics in a sinking city.** Pre-positioned, vulnerability-scored medical kit delivery for urban flood response in Phnom Penh.

University Track · Cambodian Red Cross

[![CI/CD](https://github.com/longreaksa404/rema-medical-logistics/actions/workflows/ci.yml/badge.svg)](https://github.com/longreaksa404/rema-medical-logistics/actions/workflows/ci.yml)

[**Live app**](https://rema-system.vercel.app) · [API docs (Swagger)](https://rema-medical-logistics.onrender.com/api/docs) · [Strategy documents](#documentation)

</div>

---

## Contents

- [Live demo](#live-demo)
- [What it does](#what-it-does)
- [Who uses it](#who-uses-it)
- [Architecture](#architecture)
- [Run it locally](#run-it-locally)
- [Testing](#testing)
- [Database migrations](#database-migrations)
- [Offline mode](#offline-mode-volunteers)
- [Engineering highlights](#engineering-highlights)
- [Key decisions](#key-decisions)
- [Project structure](#project-structure)
- [Documentation](#documentation)

---

## Live demo

| | URL |
|---|---|
| Frontend | https://rema-system.vercel.app |
| Backend API | https://rema-medical-logistics.onrender.com |
| Swagger | https://rema-medical-logistics.onrender.com/api/docs |

**Test accounts**: all use password `rema1234`.

| Email | Role |
|---|---|
| `admin@rema.kh` | Super Admin |
| `coordinator@rema.kh` | Emergency Coordinator |
| `hub1@rema.kh` | Hub Manager (Dangkao) |
| `volunteer1@rema.kh` | Volunteer (Dangkao) |
| `viewer@rema.kh` | Viewer (read-only) |

> **Before a demo:** log in as `admin@rema.kh` and close the current flood event from the Dashboard to return to Phase 0. Then log in as `coordinator@rema.kh` to submit activation conditions.

---

## What it does

Supplies are staged **before** flooding peaks, households are scored by medical urgency, and the delivery mode adapts to water depth.

| | |
|---|---|
| **3-layer logistics** | Central warehouse → 3 district sub-warehouses (stocked Hours 3–8) → last-mile volunteers |
| **Response phases** | Phase 0 preparedness → Phase 1 pre-positioning (Hours 0–24) → Phase 2 last-mile delivery (Hours 24–48+). Phases only move forward. |
| **Activation** | 2 of 3 objective conditions (warning level 2, >100 mm rain, street flooding). No single person can activate alone. |
| **Kit types** | EMK-1 general · EMK-2 vulnerable household · EMK-3 chronic illness (Ministry of Health cold storage only) |
| **Prioritisation** | 20-point vulnerability score across 5 categories. 15–20 = **Critical**, delivered in the current run. |
| **Delivery tiers** | Motorbike (0–30 cm) · Bicycle/foot (30–60 cm) · Boat (60–80 cm) · **Suspended** (>80 cm) |
| **Coordination** | Fixed radio check-ins at 08:00 / 12:00 / 16:00 / 20:00. Volunteer-safety incidents auto-escalate to the Operations Center. |

The three pilot districts are **Dangkao**, **Mean Chey** and **Pou Senchey**, each split into three zones mapped from real OpenStreetMap boundaries.

---

## Who uses it

| Role | Main screens | Can do |
|---|---|---|
| **Super Admin** | All | Everything, plus user management and closing a flood event |
| **Emergency Coordinator** | Dashboard, Routing, Hub Portal, Event History | Submit activation conditions, advance phases, reallocate stock between districts, AI Brief |
| **Hub Manager** | Hub Portal, Routing, Volunteer | Run one district: dispatch, adjust and reallocate stock, set up teams, start delivery runs, log incidents and radio check-ins |
| **Volunteer** | Volunteer | Assess households, deliver kits, report incidents. Works offline. |
| **Viewer** | Dashboard, Event History | Read only |

Permissions are hierarchical (Viewer < Volunteer < Hub Manager < Emergency Coordinator < Super Admin): each role can also do what the roles below it can, and Hub Managers and Volunteers are limited to their own district. Accounts are deactivated, never deleted, so the audit trail is preserved.

---

## Architecture

```mermaid
flowchart LR
    subgraph Client["Browser / phone"]
        FE["React + Vite SPA<br/>Tailwind · Recharts · Leaflet"]
        SW["Service worker<br/>+ offline outbox"]
    end
    subgraph Server["Render"]
        API["Express API<br/>TypeScript · Zod validation"]
        WS["socket.io<br/>realtime events"]
    end
    DB[("PostgreSQL<br/>Supabase · Prisma")]
    AI["Anthropic Claude API<br/>AI Brief (advisory)"]

    FE -- "REST /api (JWT + refresh cookie)" --> API
    FE <-- "phase changes, scarcity alerts, incidents" --> WS
    SW -. "replays queued actions on reconnect" .-> API
    API --> DB
    API -- "aggregate stats only, no PII" --> AI
```

| Layer | Tech |
|---|---|
| Backend | Node.js 20 · TypeScript · Express · Prisma · PostgreSQL |
| Auth | JWT access token (15 min) · httpOnly refresh token (7 days, rotated, SHA-256 hashed) · bcrypt |
| Realtime | socket.io for phase changes, scarcity alerts and incidents |
| Frontend | React 19 · Vite · TypeScript · Tailwind CSS · TanStack Query · Recharts · Leaflet |
| Hosting | Render (API) · Supabase (Postgres) · Vercel (frontend) |
| Testing | Jest + supertest (backend unit + Postgres integration) · Vitest (frontend) |
| CI/CD | GitHub Actions. Tests and migration checks gate every deploy. |
| AI | Anthropic Claude API, server-side, advisory only |

---

## Run it locally

**Prerequisites:** Node.js 20 and Docker (for a local Postgres). The repo also ships a [dev container](.devcontainer/devcontainer.json) with both preinstalled.

### 1. Start a local database

```bash
docker run -d --name rema-dev-pg -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=rema postgres:16-alpine
```

### 2. Backend (port 3000)

```bash
cd backend
npm ci
cp .env.example .env
```

In `.env`, point both database URLs at the local container:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rema"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/rema"
```

Then apply the schema, load demo data and start the server:

```bash
npm run migrate:deploy   # apply all migrations
npm run seed             # districts, warehouses, stock and the test accounts above
npm run dev              # http://localhost:3000 (Swagger at /api/docs)
```

### 3. Frontend (port 5173)

```bash
cd frontend
npm ci
npm run dev              # http://localhost:5173
```

Leave `VITE_API_URL` **unset** for local development. Vite then proxies `/api` to `localhost:3000`. Set it only when pointing the frontend at a deployed backend (see `frontend/.env.example`).

### Environment variables (backend)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string (Supabase pooler in production) |
| `DIRECT_URL` | yes | Direct connection used by Prisma for migrations |
| `JWT_SECRET` | in production | 32+ random characters. The server refuses to start with the placeholder in production. |
| `PORT` | no | Defaults to `3000` |
| `CORS_ORIGINS` | no | Comma-separated. Defaults to the Vercel app and `http://localhost:5173`. |
| `TRUST_PROXY` | no | Number of reverse proxies (Render = 1). Used for login rate limiting. |
| `ANTHROPIC_API_KEY` | no | Enables the AI Brief. Without it the endpoint returns 503 and the rest of the app works normally. |

---

## Testing

```bash
# backend
cd backend
npm test                      # unit tests, no database needed

# integration tests need a throwaway Postgres (the database name must contain "test")
docker run -d --name rema-test-pg -p 5433:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=rema_test postgres:16-alpine
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/rema_test npm run test:integration

# frontend
cd frontend
npm test                      # offline outbox unit tests
npm run build                 # typecheck + production build
```

Integration tests truncate every table, so they refuse to run against a database whose name doesn't contain `test`.

**CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs on every push:

1. Backend typecheck, build and unit tests
2. All migrations applied to an empty Postgres, a schema-drift check, then integration tests
3. Frontend unit tests, typecheck and build
4. Deploy to Render, only if all of the above pass

---

## Database migrations

Schema changes go through Prisma migrations in [`backend/prisma/migrations`](backend/prisma/migrations).

```bash
cd backend
npx prisma migrate dev --name <change>   # local: create + apply a migration
npm run migrate:deploy                   # apply pending migrations (what Render runs)
```

- Render runs `prisma migrate deploy` as the last build step. If a migration fails, the build fails and the previous version stays live.
- CI applies every migration to an empty Postgres and fails if `schema.prisma` and the migrations disagree.
- **Never edit a migration that has already been applied to production.** Add a new one.

<details>
<summary>First deploy with this pipeline: baselining production</summary>

Check that production is tracked by Prisma:

```bash
DATABASE_URL=<supabase> DIRECT_URL=<supabase-direct> npx prisma migrate status
```

If it reports the database is not managed by Migrate (the schema was created with `db push`), baseline it once with `npx prisma migrate resolve --applied <migration>` for each migration that already matches production.

</details>

---

## Offline mode (volunteers)

Volunteers often lose signal in flooded streets, so the app keeps working without a connection:

- **App opens offline.** A service worker ([`frontend/public/sw.js`](frontend/public/sw.js), production builds only) caches the app shell.
- **Last data stays visible.** The priority queue, active delivery runs and district info are saved on the device (cleared on logout).
- **Field actions queue up.** Deliveries, assessments and incident reports made offline go into an on-device outbox and are sent automatically on reconnect. A banner shows what is waiting.
- **Retries are safe.** Assessments and incidents carry a `clientRef` that the server de-duplicates on, and a household can only be delivered once.
- **Rejections are shown.** If the server refuses a queued item (for example no stock left, or the run was closed), the volunteer sees why.
- **Safety reports made offline** warn the volunteer that nobody has received them yet and to use radio or phone.

---

## Engineering highlights

- **Unit tests** for scoring, stock scarcity, the activation trigger, routing tiers, config and error mapping
- **Integration tests against real Postgres** covering concurrent stock and delivery writes, role and district permissions, auth hardening, request validation and offline replay
- **Database-level safety:** `CHECK` constraints keep stock from going negative even under concurrent writes
- **WebSocket realtime:** phase changes, scarcity alerts and incidents reach all clients instantly
- **Server-side pagination** for stock movements, households, delivery history and resolved incidents (20 per page, counted in one Prisma `$transaction`). Active runs and open incidents are always returned in full, because operational roles need complete in-progress visibility.
- **Refresh token rotation:** SHA-256 hashed, revocable, 7-day httpOnly cookie
- **Forced password change:** accounts created by an admin must change their password on first login
- **Flood event history:** each event is archived on close with after-action stats (households, kits, runs, incidents, radio compliance)
- **AI Brief:** reads aggregate database state server-side with no PII in the prompt. Advisory only, and degrades gracefully to a 503.
- **Per-zone routing map:** 9 zone polygons clipped from real OSM district boundaries, with water-depth controls wired to the API
- **Uptime:** UptimeRobot pings `/api/health` every 5 minutes so Render never cold-starts during a response

---

## Key decisions

| Decision | Why |
|---|---|
| EMK-3 at MoH cold storage only | Community buildings cannot maintain 2–8 °C |
| 2-of-3 activation trigger | Removes single-person authority and prevents false activations |
| Phases move forward only (0 → 1 → 2) | No accidental rollback during an active response |
| Deactivate users, never delete | Audit trail preserved |
| Paper fallback for every digital function | No single tool in the critical path |
| AI output is advisory only | Technology augments human judgment, never replaces it |
| Active runs and incidents unpaginated | Hub Managers need full in-progress visibility without paging |

---

## Project structure

```
rema-medical-logistics/
├── backend/
│   ├── prisma/              # schema.prisma + migrations
│   ├── src/
│   │   ├── routes/          # Express routers (one per domain)
│   │   ├── controllers/     # request/response handling
│   │   ├── services/        # business logic + Prisma queries
│   │   ├── schemas/         # Zod request validation
│   │   ├── middleware/      # auth, district access, rate limit, errors
│   │   ├── utils/           # scoring, routing tiers, stock math (+ unit tests)
│   │   ├── __integration__/ # Postgres integration tests
│   │   └── seed.ts          # demo data + test accounts
│   └── swagger.yaml         # API reference served at /api/docs
├── frontend/
│   ├── public/              # service worker, manifest, reference diagrams
│   └── src/
│       ├── pages/           # Dashboard, Routing, Hub, Volunteer, Users, …
│       ├── components/      # layout, charts, map, modals, live alerts
│       ├── api/             # axios client + TanStack Query hooks
│       ├── offline/         # on-device outbox + replay
│       └── context/         # auth
├── docs/                    # strategy sections 0, A–F + assumptions log
├── sections/                # submission documents and visuals
├── Dockerfile               # backend image (Node 20)
└── docker-compose.yml
```

---

## Documentation

The operational design behind the software lives in [`docs/`](docs):

| Section | Topic |
|---|---|
| [0](docs/section-0-core-concept.md) | Core concept |
| [A](docs/section-A-response-design.md) | Response design: Phases 0, 1 and 2 |
| [B](docs/section-B-logistics-model.md) | Logistics model: warehouses, kits, delivery tiers |
| [C](docs/section-C-prioritization-framework.md) | Prioritisation framework: the 20-point score |
| [D](docs/section-D-coordination-model.md) | Coordination model: roles, radio, escalation |
| [E](docs/section-E-scalability-sustainability.md) | Scalability and sustainability |
| [F](docs/section-F-financial-plan.md) | Financial plan |
| [Assumptions](docs/Assumptions-log.md) | Assumptions log |

Submission material (executive summary, master strategy, demo guide, presentation outline) is in [`sections/submission`](sections/submission).
