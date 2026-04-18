# REMA — Project Plan
**Build Structure & Progress Tracker**

---

## LIVE URLS

| Service | URL | Status |
|---|---|---|
| Backend API | TBD (Render) | Not deployed yet |
| Frontend | TBD (Vercel) | Not deployed yet |
| Database | Supabase — rema-medical-logistics | ✅ Live |
| API Docs (Swagger) | TBD/api/docs | Not deployed yet |

---

## PROGRESS OVERVIEW

| Chat | Topic | Status |
|---|---|---|
| Chat 1 | Strategy — Sections 0, A, B, C, D, E, F | ✅ Complete |
| Chat 2 | Project Setup | 🔄 In Progress |
| Chat 3 | Auth + RBAC | ⬜ Not started |
| Chat 4 | Activation + Scoring Engine | ⬜ Not started |
| Chat 5 | Stock Management | ⬜ Not started |
| Chat 6 | Delivery + Routing | ⬜ Not started |
| Chat 7 | Volunteers + Incidents + Radio + Dashboard | ⬜ Not started |
| Chat 8 | Frontend: Auth + Dashboard Setup | ⬜ Not started |
| Chat 9 | Frontend: V1 Dashboard Data + Charts | ⬜ Not started |
| Chat 10 | Frontend: V2 Routing Map | ⬜ Not started |
| Chat 11 | Frontend: V4 Prioritization Tool | ⬜ Not started |
| Chat 12 | Frontend: V7 Hub Manager Portal | ⬜ Not started |
| Chat 13 | Frontend: V8 Volunteer Mobile View | ⬜ Not started |
| Chat 14 | V3 Warehouse Layout (draw.io) | ⬜ Not started |
| Chat 15 | V5 Stakeholder Flowchart (draw.io) | ⬜ Not started |
| Chat 16 | V6 Operating Protocol (PDF) | ⬜ Not started |
| Chat 17 | Final Assembly + Submission Package | ⬜ Not started |

---

## CHAT 1 — Strategy (COMPLETE ✅)

**Output:** All strategy sections written and pushed to GitHub.

Completed sections:
- Section 0 — Core System Concept
- Section A — Response Design (3 phases, activation trigger, decision authority)
- Section B — Logistics Model (EMK types, sourcing, transport, contingency, cold chain)
- Section C — Prioritization Framework (20-point scoring, score bands, fairness safeguards)
- Section D — Coordination Model
- Section E — Scalability & Sustainability
- Section F — Financial Plan
- Assumptions Log (48 assumptions)

---

## CHAT 2 — Project Setup (IN PROGRESS 🔄)

**Goal:** Skeleton runs locally, connects to Supabase, schema migrated, Swagger at /api/docs.

Steps:
- [x] Step 1 — Monorepo folder structure
- [x] Step 2 — Docker + docker-compose
- [x] Step 3 — Supabase PostgreSQL connection + .env
- [x] Step 4 — Prisma schema (full 15-table schema) + first migration
- [ ] Step 5 — Express boilerplate (index.ts, app.ts, health check endpoint)
- [ ] Step 6 — Swagger setup (/api/docs)

**End state:** `npm run dev` starts server, `GET /api/health` returns 200, Swagger UI loads.

---

## CHAT 3 — Auth + RBAC

**Goal:** Login works. Protected routes reject unauthorized requests.

Jobs:
- User model seeding (one user per role for testing)
- POST /api/auth/login — returns JWT
- Auth middleware — protects routes by role
- GET /api/auth/me — returns current user
- Role guard middleware (SUPER_ADMIN, EMERGENCY_COORDINATOR, HUB_MANAGER, VOLUNTEER, VIEWER)

**End state:** Can login, get JWT, call protected endpoint, get 401 without token.

---

## CHAT 4 — Activation + Scoring Engine

**Goal:** 2-of-3 activation logic works. 20-point scoring engine matches Section C exactly.

Jobs:
- POST /api/alert/trigger (2-of-3 logic, auto-activate)
- GET /api/alert/status
- PATCH /api/alert/phase (EC only)
- POST /api/score/household (exact 20-point system)
- GET /api/households/priority-queue (sorted by score band)
- POST /api/households
- GET /api/households

**End state:** All endpoints tested in Swagger. Scoring matches Section C worked example.

---

## CHAT 5 — Stock Management

**Goal:** Full stock lifecycle works with audit trail.

Jobs:
- GET /api/stock/status (all sub-warehouses)
- GET /api/stock/:districtId
- POST /api/stock/dispatch (central warehouse → sub-warehouse)
- POST /api/stock/reallocate (cross-district, EC only)
- POST /api/stock/adjust (manual, Hub Manager)
- GET /api/stock/movements (full audit log)
- GET /api/stock/movements/:districtId

**End state:** Every stock change creates a stock_movements record. Tested in Swagger.

---

## CHAT 6 — Delivery + Routing

**Goal:** Delivery runs logged with receipts. Routing logic recommends correct mode by water depth.

Jobs:
- POST /api/delivery/runs (start a run)
- GET /api/delivery/runs
- GET /api/delivery/runs/:id (with receipts)
- POST /api/delivery/receipts (per-household confirmation)
- PATCH /api/delivery/runs/:id/complete
- GET /api/route/recommend (water depth → delivery mode)
- POST /api/route/update (update zone water depth)
- GET /api/route/logs

**End state:** Delivery lifecycle and routing logic tested in Swagger.

---

## CHAT 7 — Volunteers + Incidents + Radio + Dashboard

**Goal:** All remaining endpoints complete. Full API deployed on Render.

Jobs:
- GET/POST /api/volunteers
- PATCH /api/volunteers/:id
- POST /api/volunteers/assign
- GET /api/volunteers/:districtId/roster
- POST /api/incidents
- GET /api/incidents
- PATCH /api/incidents/:id/resolve
- POST /api/radio/checkin
- GET /api/radio/checkins
- GET /api/notifications
- PATCH /api/notifications/:id/read
- GET /api/dashboard/summary
- GET /api/dashboard/district/:id
- Deploy to Render

**End state:** All 30+ endpoints live on Render. Swagger docs accessible at Render URL.

---

## CHAT 8 — Frontend: Auth + Dashboard Setup

**Goal:** Login works. Dashboard shell running on Vercel, connected to Render backend.

Jobs:
- React project setup (Vite + TypeScript + Tailwind)
- API service layer (axios + JWT interceptor)
- Login page (V0)
- Role-based redirect after login
- Dashboard shell + navigation sidebar
- Phase status banner component

**End state:** Can login, see dashboard shell, navigation works.

---

## CHAT 9 — Frontend: V1 Dashboard Data + Charts

**Goal:** V1 Operations Dashboard complete and live.

Jobs:
- District summary cards (connected to /api/dashboard/summary)
- Stock levels bar chart per district (Recharts)
- Priority queue table (Critical/High/Medium/Standard bands)
- Active incidents panel
- Recent notifications feed
- Connect all components to API

**End state:** V1 fully live on Vercel with real data from backend.

---

## CHAT 10 — Frontend: V2 Routing Map

**Goal:** V2 Routing Map complete and live.

Jobs:
- Leaflet map setup with OpenStreetMap
- 3 district zone overlays
- Water depth input per zone (slider)
- Delivery mode recommendation display per zone (color coded)
- Connect to GET /api/route/recommend and POST /api/route/update

**End state:** V2 live on Vercel. Changing water depth updates delivery mode in real time.

---

## CHAT 11 — Frontend: V4 Prioritization Tool

**Goal:** V4 Prioritization Tool complete and live.

Jobs:
- Household assessment form (all 5 categories, 20-point input)
- Live score calculation as form is filled
- Score band result + EMK type recommendation display
- Sortable household priority table
- Scarcity mode indicator (triggers at 30% stock)
- Connect to POST /api/score/household and GET /api/households/priority-queue

**End state:** V4 live on Vercel. Scoring matches Section C exactly.

---

## CHAT 12 — Frontend: V7 Hub Manager Portal

**Goal:** V7 Hub Manager Portal complete and live.

Jobs:
- District stock panel (view levels, request resupply, log adjustments)
- Volunteer roster panel (list, add, assign to zones/teams)
- Delivery run panel (start run, assign team, mark complete)
- Incident reporting form
- Radio check-in submission form (08:00/12:00/16:00/20:00)
- All actions role-gated to HUB_MANAGER

**End state:** V7 live on Vercel. Hub Manager can manage full district operations.

---

## CHAT 13 — Frontend: V8 Volunteer Mobile View

**Goal:** V8 Volunteer mobile view complete and live.

Jobs:
- Mobile-optimized layout (320–480px)
- Household assessment form
- Delivery receipt confirmation form
- Incident report form
- All actions role-gated to VOLUNTEER

**End state:** V8 live on Vercel. Usable on a phone browser.

---

## CHAT 14 — V3 Warehouse Layout (draw.io)

**Goal:** Warehouse layout diagrams exported as PNG/SVG.

Jobs:
- Central warehouse floor plan (pallet zones, 30% reserve zone, dispatch area, ~200–250 sqm)
- Sub-warehouse floor plan (EMK-1/2/3 zones, volunteer check-in table, district map wall, ~40–60 sqm)
- Stock zone labeling
- Export as PNG and SVG

**End state:** V3 diagrams in /sections/visuals/ folder.

---

## CHAT 15 — V5 Stakeholder Flowchart (draw.io)

**Goal:** Stakeholder flowchart exported as PNG/SVG.

Jobs:
- Swimlane diagram with all actors:
  Volunteer → Volunteer Team Leader → Hub Manager → Operations Center → Emergency Coordinator
- Shows decision flow for Phase 1 and Phase 2
- Shows information flow (paper forms, SMS, radio, dashboard)
- Export as PNG and SVG

**End state:** V5 diagram in /sections/visuals/ folder.

---

## CHAT 16 — V6 Operating Protocol Document

**Goal:** PDF-ready operating protocol document complete.

Jobs:
- Phase 1 activation checklist (hour-by-hour)
- Radio check-in script (08:00/12:00/16:00/20:00)
- Delivery runsheet template (team, zone, households, signatures)
- Incident log template
- Export as PDF

**End state:** V6 PDF in /sections/visuals/ folder.

---

## CHAT 17 — Final Assembly + Submission Package

**Goal:** Everything ready to submit to Viet Nam Red Cross.

Jobs:
- Compile all strategy sections (0, A, B, C, D, E, F) into one document
- Compile all visuals (V1–V8, V3, V5, V6)
- Write executive summary
- Build presentation structure
- Verify all live URLs work
- Final submission package

**End state:** Submission package ready.

---

## FILE STRUCTURE

```
rema-medical-logistics/
├── PROJECT_SCOPE.md          ← system definition (stable)
├── PROJECT_PLAN.md           ← build progress (updated each chat)
├── HANDOFF.md                ← per-chat state (updated each chat)
├── README.md
├── Dockerfile
├── docker-compose.yml
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── index.ts
│   │   ├── app.ts
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── types/
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   └── src/
├── docs/
│   ├── section-0-core-concept.md
│   ├── section-A-response-design.md
│   ├── section-B-logistics-model.md
│   ├── section-C-prioritization-framework.md
│   ├── section-D-coordination-model.md
│   ├── section-E-scalability-sustainability.md
│   ├── section-F-financial-plan.md
│   └── Assumptions-log.md
└── sections/
    └── visuals/
        ├── V3-warehouse-layout.png
        ├── V5-stakeholder-flowchart.png
        └── V6-operating-protocol.pdf
```

---

## GIT COMMIT PATTERN

```bash
git add . && git commit -m "Chat [N] complete: [brief description]"
```

Examples:
- `git add . && git commit -m "Chat 2 complete: project setup, schema migrated, Express + Swagger running"`
- `git add . && git commit -m "Chat 3 complete: auth + RBAC, JWT login, role middleware"`
