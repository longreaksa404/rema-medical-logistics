# REMA - Rapid Emergency Medical Access

**Medical Logistics in a Sinking City** · University Track · Viet Nam Red Cross

---

## Live

| | URL |
|---|---|
| Frontend | https://rema-system.vercel.app |
| Backend API | https://rema-medical-logistics.onrender.com |
| Swagger | https://rema-medical-logistics.onrender.com/api/docs |

**Test accounts** (password: `rema1234`)

| Email | Role |
|---|---|
| admin@rema.kh | SUPER_ADMIN |
| coordinator@rema.kh | EMERGENCY_COORDINATOR |
| hub1@rema.kh | HUB_MANAGER (Dangkao) |
| volunteer1@rema.kh | VOLUNTEER (Dangkao) |
| viewer@rema.kh | VIEWER |

> Log in as `admin@rema.kh` to reset to Phase 0 before a demo. Use `coordinator@rema.kh` to trigger activation.

---

## What It Does

Pre-positioned, vulnerability-scored medical kit delivery for urban flood response. Supplies are staged *before* flooding peaks. Households are scored by medical urgency. Delivery mode adapts to water depth.

**3-layer logistics:** Central warehouse → 3 sub-warehouses (stocked Hours 3-8) → last-mile volunteers

**Delivery tiers:** Motorbike (0-30cm) · Bicycle/foot (30-60cm) · Boat (60-80cm) · Suspended (>80cm)

**3 EMK types:** General (EMK-1) · Vulnerable household (EMK-2) · Chronic illness (EMK-3, MoH cold storage only)

**Scoring:** 20-point vulnerability score across 5 categories. 15-20 = CRITICAL, deliver in current run.

**Activation:** 2 of 3 objective conditions met - no single-person override.

---

## Stack

```
Backend:    Node.js + TypeScript + Express + Prisma + PostgreSQL
Auth:       JWT (15m) + httpOnly refresh token (7d) + bcrypt
Realtime:   socket.io - phase changes, scarcity alerts, incidents
Frontend:   React (Vite) + TypeScript + Tailwind CSS + Recharts + Leaflet.js
Hosting:    Render + Supabase + Vercel
Testing:    Jest + ts-jest - unit tests + Postgres integration tests (supertest)
CI/CD:      GitHub Actions - tests gate every deploy
AI:         Anthropic Claude API - server-side AI Brief (advisory only, no PII)
```

---

## Engineering Highlights

- **Unit tests** - scoring, stock scarcity, activation trigger, routing tiers, config, error mapping
- **Integration tests** against real Postgres - concurrent stock/delivery writes, role + district permissions, auth hardening, request validation
- **CI/CD** - GitHub Actions runs typecheck, unit + integration tests, migration checks and the frontend build before any deploy
- **WebSocket realtime** - phase changes, scarcity alerts, and incidents push instantly to all clients
- **Server-side pagination** - stock movements, households, delivery history, resolved incidents (20/page, Prisma `$transaction` count). Active runs and open incidents always returned in full - operational roles need complete in-progress visibility.
- **Refresh tokens** - SHA-256 hashed, revocable, 7-day httpOnly cookie
- **AI Brief** - reads aggregate DB state server-side, no PII in prompt, advisory only, graceful 503 degradation
- **mustChangePassword** - admin-created accounts forced to change password on first login
- **Per-zone routing map** - 9 real zone polygons clipped from OSM district boundaries, depth sliders wired to API
- **UptimeRobot monitoring** - pings `/api/health` every 5 minutes to prevent Render cold starts; backend has maintained 100% uptime since deployment

---

## Running Tests

```bash
cd backend
npm test                      # unit tests, no database needed

# integration tests need a throwaway Postgres (the database name must contain "test")
docker run -d --name rema-test-pg -p 5433:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=rema_test postgres:16-alpine
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/rema_test npm run test:integration
```

---

## Database Migrations

Schema changes go through Prisma migrations in `backend/prisma/migrations`.

```bash
cd backend
npx prisma migrate dev --name <change>   # local: create + apply a migration
npm run migrate:deploy                   # apply pending migrations (what Render runs)
```

- Render runs `prisma migrate deploy` as the last build step. If a migration fails, the build fails and the previous version stays live.
- CI applies every migration to an empty Postgres and fails if `schema.prisma` and the migrations disagree.
- Never edit a migration that has already been applied to production — add a new one.

**Before the first deploy with this pipeline**, check production is tracked by Prisma:

```bash
DATABASE_URL=<supabase> DIRECT_URL=<supabase-direct> npx prisma migrate status
```

If it reports the database is not managed by Migrate (schema created with `db push`), baseline it once with `npx prisma migrate resolve --applied <migration>` for each migration that already matches production.

---

## Key Decisions

| Decision | Why |
|---|---|
| EMK-3 at MoH cold storage only | Community buildings cannot maintain 2-8°C |
| 2-of-3 activation trigger | Removes single-person authority; prevents false activations |
| Phase forward only (0→1→2) | No accidental rollback during active response |
| Deactivate users, never delete | Audit trail preserved |
| Paper fallback for every digital function | No single tool in the critical path |
| AI output is advisory only | Technology augments human judgment, never replaces it |
| Active runs/incidents unpaginated | Hub Managers need full in-progress visibility without navigation |
