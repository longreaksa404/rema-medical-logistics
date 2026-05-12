# REMA — Rapid Emergency Medical Access

**Challenge:** Medical Logistics in a Sinking City
**Track:** University Track
**Organiser:** Viet Nam Red Cross (supported by BSSC, RMIT, Innoex, HELP Logistics)

---

## Live Deployment

| Service | URL |
|---|---|
| Frontend Application | https://rema-system.vercel.app |
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

> **Demo tip:** Log in as `admin@rema.vn` to reset the system to Phase 0 before a demo run. Log in as `coordinator@rema.vn` to trigger activation and advance phases.

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

**Prioritisation:** 20-point vulnerability score across 5 categories. Critical households (15–20 points) delivered in current run. Every score is documented on paper and auditable.

**Activation trigger:** 2 of 3 objective conditions (locked — no single-person override).

---

## System Scope

| Dimension | Value |
|---|---|
| Districts | 3 |
| Sub-warehouses | 3 (one per district) |
| Volunteer minimum | 36 (12 per sub-warehouse) |
| EMK types | 3 (General / Vulnerable / Chronic Illness) |
| Response window | 24–48 hours (critical phase) |
| Water depth range | 30–80cm operational; suspended above 80cm |
| API endpoints | 51+ |
| Database tables | 15 |
| Frontend views | 9 |
| User roles | 5 |
| Documented assumptions | 57 |
| Unit tests | 113 |
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
Testing:    Jest + ts-jest (113 unit tests — backend utility functions)
CI/CD:      GitHub Actions (tests gate every deployment)
AI:         Anthropic Claude API — server-side AI Brief for Emergency Coordinator
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

### Running Tests

```bash
cd backend
npm test
```

Expected output: **113 tests passing** across 4 test files:

| File | Tests | What it verifies |
|---|---|---|
| `scoring.test.ts` | 59 | All 20-point scoring rules + Section C worked examples |
| `stock.utils.test.ts` | 18 | Scarcity threshold logic (30% boundary) |
| `alert.test.ts` | 13 | All 8 activation trigger combinations |
| `route.test.ts` | 23 | All 4 delivery mode tiers and depth boundaries |

These tests verify that the implementation matches the strategy documents exactly. No database connection required — pure utility functions only.

---

## CI/CD Pipeline

Every push to `main` and every pull request runs the full test suite via GitHub Actions before deploying.

```
Pull request:
  1. Install dependencies
  2. Run 113 unit tests
  → If tests fail: PR is blocked. No deploy.

Push to main (after PR merge):
  1. Install dependencies
  2. Run 113 unit tests
  3. Trigger Render deploy hook
  → Render rebuilds backend. Vercel autodeploys frontend.
```

**Setup required (one-time, manual):**
1. Go to GitHub repo → Settings → Secrets → Actions
2. Add secret `RENDER_DEPLOY_HOOK_URL` (get from Render dashboard → your service → Settings → Deploy Hook)
3. Confirm Vercel project is connected to the GitHub repo

---

## Key Design Decisions

| Decision | Choice | Why |
|---|---|---|
| Pre-positioning strategy | Stock staged Hours 3–8 before flooding peaks | Reactive logistics fails when roads are gone |
| EMK-3 cold chain | MoH cold storage only; never at sub-warehouses | Community buildings cannot maintain 2–8°C |
| Activation trigger | 2 of 3 conditions (locked, not manual) | Prevents false activations; removes single-person authority |
| Phase direction | Forward only (0→1→2) via frontend | Prevents accidental rollback during active flood response |
| System reset | POST /api/alert/reset — SUPER_ADMIN only | Clean demo reset without touching the database directly |
| Paper fallback | Every digital function has a paper equivalent | No single tool is in the critical path |
| Asset model | Borrow trucks and boats via MOUs; pay per activation | Red Cross cannot afford year-round fleet ownership |
| SUPER_ADMIN creation | Seed script only; never via API | Deliberate security decision for real deployment |
| User deactivation | Deactivate, never delete | Audit trail preserved for accountability |
| Scoring engine | Identical TypeScript in frontend and backend | Live preview without an API call; server validates on submit |
| AI Brief | Advisory only; reads aggregate data; no PII in prompt | Technology augments human judgment — never replaces it |

---

## AI Brief Feature

The Emergency Coordinator dashboard includes an AI-powered operational brief. When triggered:

1. Backend reads current dashboard state from the database (aggregate data only — no PII)
2. Generates a 3-part brief: Situation Summary, Priority Alert, Recommended Next Step
3. Returns the brief with a data snapshot showing exactly what data was used

**Hard constraints:**
- Advisory only — cannot trigger any database write or system action
- No household names, addresses, or personal information in the prompt
- Graceful degradation to HTTP 503 if unavailable
- "Advisory only — human decision required" banner is always visible in the modal

The AI Brief is built as a mock service (no API key required for the live demo). It reads real database state and generates contextually accurate text. Replacing it with a live Anthropic API call requires changing only `backend/src/services/ai.service.ts`.

---

## Demo Reset

To reset the system back to Phase 0 for a fresh demo run:

**Via Frontend:** Log in as `admin@rema.vn` → Dashboard → Reset System button (SUPER_ADMIN only)

**Via Swagger:**
1. POST `/api/auth/login` as `admin@rema.vn`
2. Authorize with the JWT token
3. POST `/api/alert/reset` — no request body needed
4. System returns to Phase 0 with all trigger conditions cleared

---

## Submission Documents

The full submission package is in `docs/submission/`:

| Document | Description |
|---|---|
| `REMA-Executive-Summary.md` | 1-page overview for judges |
| `REMA-Master-Strategy.md` | Complete strategy across all 6 sections (A–F) |
| `REMA-Demo-Guide.md` | Step-by-step walkthrough for judges (9 steps, ~15 min) |
| `REMA-Presentation-Outline.md` | 10-slide presentation structure with speaker notes |

Strategy section source files are in `docs/`:
`section-0-core-concept.md`, `section-A-response-design.md`, `section-B-logistics-model.md`, `section-C-prioritization-framework.md`, `section-D-coordination-model.md`, `section-E-scalability-sustainability.md`, `section-F-financial-plan.md`, `Assumptions-log.md`

---

## Visuals Included

| Visual | File | Tool |
|---|---|---|
| V3 Central Warehouse Floor Plan | `sections/visuals/central-warehouse.drawio.png` | draw.io |
| V3 Sub-Warehouse Floor Plan | `sections/visuals/sub-warehouse.drawio.png` | draw.io |
| V5 Stakeholder Coordination Flowchart | `sections/visuals/REMA-stakeholder-flowchart.drawio.png` | draw.io |
| V6 Operating Protocol | `sections/visuals/operating-protocol.pdf` | ReportLab PDF |

All visuals are also served via the frontend at `/visuals/`.