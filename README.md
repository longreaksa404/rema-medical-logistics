![CI](https://github.com/longreaksa404/rema-medical-logistics/actions/workflows/ci.yml/badge.svg)

# REMA — Rapid Emergency Medical Access

**Challenge:** Medical Logistics in a Sinking City
**Track:** University Track
**Organizer:** Viet Nam Red Cross (supported by BSSC, RMIT, Innoex, HELP Logistics)

---

## Live Deployment

| Service | URL |
|---|---|
| Frontend Application | https://rema-frontend-delta.vercel.app |
| Backend API | https://rema-medical-logistics.onrender.com |
| API Documentation (Swagger) | https://rema-medical-logistics.onrender.com/api/docs |


### Test Accounts

All passwords: `rema1234`

| Email | Role | District |
|---|---|---|
| admin@rema.vn | SUPER_ADMIN | — |
| coordinator@rema.vn | EMERGENCY_COORDINATOR | — |
| hub1@rema.vn | HUB_MANAGER | District 1 |
| hub2@rema.vn | HUB_MANAGER | District 2 |
| hub3@rema.vn | HUB_MANAGER | District 3 |
| volunteer1@rema.vn | VOLUNTEER | District 1 |
| viewer@rema.vn | VIEWER | — |

---

## What REMA Does

REMA is a pre-positioned, vulnerability-scored medical logistics system designed to deliver Emergency Medical Kits to the right households within 24–48 hours of a flood event — through any water depth up to 80cm.

**The core insight:** Reactive logistics fails in urban flooding because by the time demand is confirmed, roads are already gone. REMA pre-positions supplies before peaks, scores households by medical vulnerability, and adapts delivery mode to water depth.

**Three-layer architecture:**
- Layer 1: Central Warehouse — master stock, 30% reserve after dispatch
- Layer 2: Sub-Warehouses ×3 — stocked Hours 3–8 in existing community buildings
- Layer 3: Last-mile volunteers — motorbike (0–30cm) / bicycle or foot (30–60cm) / boat (60–80cm) / suspended above 80cm

**Three EMK types:**
- EMK-1 General: ORS, wound care, paracetamol, hygiene
- EMK-2 Vulnerable: all EMK-1 + infant formula, prenatal vitamins, thermometer
- EMK-3 Chronic Illness: 3-day medication supply — MoH cold storage only, never pre-stored at sub-warehouses

**Prioritization:** 20-point vulnerability score across 5 categories. Critical households (15–20 points) delivered in current run. Every score is documented and auditable.

---

## System Scope

| Dimension | Value |
|---|---|
| Districts | 3 |
| Sub-warehouses | 3 (one per district) |
| Volunteer minimum | 36 (12 per sub-warehouse) |
| EMK types | 3 (General / Vulnerable / Chronic Illness) |
| Response window | 24–48 hours (critical phase) |
| Water depth range | 30–80cm (operational); suspended above 80cm |
| API endpoints | 50+ |
| Database tables | 15 |
| Frontend views | 9 |
| User roles | 5 |
| Documented assumptions | 53 |
| Annual system cost | ~$69,500 USD |
| Cost per beneficiary | ~$0.95/person/year |

---

## Technical Stack

```
Backend:    Node.js + TypeScript + Express + Prisma + PostgreSQL
Auth:       JWT (jsonwebtoken) + bcrypt (cost factor 12 in production)
Frontend:   React (Vite) + TypeScript + Tailwind CSS + Recharts + Leaflet.js
Hosting:    Render (backend) + Supabase (PostgreSQL) + Vercel (frontend)
API Docs:   Swagger (swagger-ui-express)
Diagrams:   draw.io (V3 Warehouse Layout, V5 Stakeholder Flowchart)
Protocol:   ReportLab PDF (V6 Operating Protocol — 8 pages, print-ready A4)
```

---

## Running Locally

### Prerequisites
- Node.js 20+
- PostgreSQL (or a Supabase project)

### Backend

```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL and DIRECT_URL from your Supabase project
npm install
npm run migrate        # applies all Prisma migrations
npx ts-node src/seed.ts  # seeds districts, sub-warehouses, test accounts
npm run dev            # starts on http://localhost:3000
```

API documentation: http://localhost:3000/api/docs

### Frontend

```bash
cd frontend
cp .env.example .env.local
# Set: VITE_API_URL=http://localhost:3000
npm install
npm run dev            # starts on http://localhost:5173
```

---

## Key Design Decisions

| Decision | Choice | Why |
|---|---|---|
| Pre-positioning strategy | Stock staged Hours 3–8 before flooding peaks | Reactive logistics fails when roads are gone |
| EMK-3 cold chain | MoH cold storage only; never at sub-warehouses | Community buildings cannot maintain 2–8°C |
| Activation trigger | 2 of 3 conditions (locked, not manual) | Prevents false activations; removes single-person authority |
| Paper fallback | Every digital function has a paper equivalent | No single tool is in the critical path |
| Asset model | Borrow trucks and boats via MOUs; pay per activation | Red Cross cannot afford year-round fleet ownership |
| SUPER_ADMIN creation | Seed script only; never via API | Deliberate security decision for real deployment |
| User deactivation | Deactivate, never delete | Audit trail preserved for accountability |
| Scoring engine | Identical TypeScript in frontend and backend | Live preview without an API call; server validates on submit |

---

## Demo

See `docs/demo-guide.md` for a full 9-step walkthrough:
- Flood alert activation
- Operations dashboard navigation
- Routing map with water depth controls
- Household assessment and live scoring
- Hub Manager portal (stock, volunteers, deliveries, incidents, radio)
- Volunteer mobile view
- User management (SUPER_ADMIN)
- Static documents (warehouse layout, stakeholder flowchart, operating protocol)

---

## Visuals Included

| Visual | File | Tool |
|---|---|---|
| V3 Central Warehouse Floor Plan | `sections/visuals/central-warehouse.drawio.png` | draw.io |
| V3 Sub-Warehouse Floor Plan | `sections/visuals/sub-warehouse.drawio.png` | draw.io |
| V5 Stakeholder Coordination Flowchart | `sections/visuals/REMA-stakeholder-flowchart.drawio.png` | draw.io |
| V6 Operating Protocol | `sections/visuals/operating-protocol.pdf` | ReportLab PDF |

All visuals are also served via the frontend at `/visuals/`.

--- 

# REMA — README additions for Chat 19
# Add these sections to your existing README.md

---

## CI/CD Status

![CI](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml/badge.svg)

---

## CI/CD Pipeline

REMA uses GitHub Actions for continuous integration and deployment.

### What the pipeline does

**On every pull request to `main`:**
1. Checks out the code
2. Sets up Node.js 20
3. Installs backend dependencies (`npm ci` — clean install from lockfile)
4. Runs all backend unit tests (`npm test`)
5. If tests fail → PR is blocked. No deploy happens.

**On every push to `main` (after a PR is merged):**
1. All steps above run first
2. If tests pass → triggers Render to redeploy the backend automatically
3. Vercel autodeploys the frontend from GitHub — no extra step needed

### Why no database secrets in CI?

The unit tests cover pure utility functions only — no Prisma client, no database
connection, no HTTP calls. The scoring engine, activation trigger, scarcity check,
and routing logic are all tested without any infrastructure. This is a deliberate
design choice: if the business logic is correct, the rest is integration-tested
via the live Swagger UI.

### Manual setup steps (one-time, done by repo owner)

**Step 1 — Render deploy hook**
1. Go to Render dashboard → your backend service → Settings → Deploy Hook
2. Click "Generate Deploy Hook" and copy the URL
   (format: `https://api.render.com/deploy/srv-xxxxx?key=yyyy`)
3. Go to your GitHub repo → Settings → Secrets and variables → Actions
4. Click "New repository secret"
5. Name: `RENDER_DEPLOY_HOOK_URL`
6. Value: paste the Render URL
7. Save

**Step 2 — Vercel GitHub connection**
1. Go to Vercel dashboard → your frontend project → Settings → Git
2. Confirm the project is connected to your GitHub repository
3. Vercel will autodeploy the `main` branch on every push — no extra config needed

### Secrets required

| Secret Name | Purpose | Where to get it |
|---|---|---|
| `RENDER_DEPLOY_HOOK_URL` | Triggers backend redeploy after tests pass | Render dashboard → your service → Settings → Deploy Hook |

No `DATABASE_URL` or `JWT_SECRET` required in GitHub — unit tests are pure functions.

---