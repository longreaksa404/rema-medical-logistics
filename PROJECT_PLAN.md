# REMA — Project Plan
**Build Structure & Progress Tracker**

---

## LIVE URLS

| Service | URL | Status |
|---|---|---|
| Backend API | TBD (Render) | Not deployed yet |
| Frontend | TBD (Vercel) | Not deployed yet |
| Database | Supabase — rema-medical-logistics (Singapore) | ✅ Live |
| API Docs (Swagger) | TBD/api/docs | Not deployed yet |

---

## PROGRESS OVERVIEW

| Chat | Topic | Status |
|---|---|---|
| Chat 1 | Strategy — Sections 0, A, B, C, D, E, F | ✅ Complete |
| Chat 2 | Project Setup | ✅ Complete |
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

## CHAT 1 — Strategy ✅ Complete

**Goal:** All strategy sections written and pushed to GitHub.

**Steps:**
- [x] Step 1 — Section 0: Core System Concept
- [x] Step 2 — Section A: Response Design (3 phases, activation trigger, decision authority)
- [x] Step 3 — Section B: Logistics Model (EMK types, sourcing, transport, contingency, cold chain)
- [x] Step 4 — Section C: Prioritization Framework (20-point scoring, score bands, fairness safeguards)
- [x] Step 5 — Section D: Coordination Model
- [x] Step 6 — Section E: Scalability & Sustainability
- [x] Step 7 — Section F: Financial Plan
- [x] Step 8 — Assumptions Log (48 assumptions documented)

**End state:** All strategy sections complete and pushed to GitHub.

---

## CHAT 2 — Project Setup 🔄 In Progress

**Goal:** Skeleton runs locally, connects to Supabase, schema migrated, Swagger at /api/docs.

**Steps:**
- [x] Step 1 — Monorepo folder structure (backend/, frontend/, docs/, scripts/)
- [x] Step 2 — Docker + docker-compose files
- [x] Step 3 — Supabase PostgreSQL connection + .env configured
- [x] Step 4 — Prisma schema (5 tables) + first migration run
- [x] Step 5 — Update Prisma schema to full 15-table design (PROJECT_SCOPE.md Section 8)
- [x] Step 6 — Run new migration: npx prisma migrate dev --name full-schema
- [x] Step 7 — Express boilerplate (src/index.ts + src/app.ts)
- [x] Step 8 — GET /api/health endpoint
- [x] Step 9 — Swagger setup at /api/docs
- [x] Step 10 — Test: server starts, health check returns 200, Swagger UI loads

**End state:** npm run dev starts server, GET /api/health returns 200, Swagger UI loads at localhost:3000/api/docs.

---

## CHAT 3 — Auth + RBAC ⬜ Not started

**Goal:** Login works. Protected routes reject unauthorized requests.

**Steps:**
- [ ] Step 1 — Seed users table (one test user per role: SUPER_ADMIN, EMERGENCY_COORDINATOR, HUB_MANAGER, VOLUNTEER, VIEWER)
- [ ] Step 2 — POST /api/auth/login (validate email + password, return JWT)
- [ ] Step 3 — POST /api/auth/logout (invalidate token)
- [ ] Step 4 — GET /api/auth/me (return current user from JWT)
- [ ] Step 5 — Auth middleware (verify JWT on protected routes)
- [ ] Step 6 — Role guard middleware (reject requests below required role)
- [ ] Step 7 — Apply auth middleware to a test protected route
- [ ] Step 8 — Test in Swagger: login → get token → call protected route → verify 401 without token → verify 403 with wrong role

**End state:** Can login, receive JWT, call protected endpoint, get 401 without token, get 403 with wrong role.

---

## CHAT 4 — Activation + Scoring Engine ⬜ Not started

**Goal:** 2-of-3 activation logic works. 20-point scoring engine matches Section C exactly.

**Steps:**
- [ ] Step 1 — POST /api/alert/trigger (accept one condition, auto-activate when 2-of-3 met)
- [ ] Step 2 — GET /api/alert/status (current phase + which conditions are met)
- [ ] Step 3 — PATCH /api/alert/phase (advance phase 0→1→2, EC only)
- [ ] Step 4 — POST /api/score/household (20-point engine: 5 categories, exact weights from Section C)
- [ ] Step 5 — Score band assignment logic (CRITICAL/HIGH/MEDIUM/STANDARD)
- [ ] Step 6 — EMK type recommendation logic from score
- [ ] Step 7 — POST /api/households (create household with score)
- [ ] Step 8 — GET /api/households (list, filter by district and band)
- [ ] Step 9 — GET /api/households/:id (single household detail)
- [ ] Step 10 — PATCH /api/households/:id (update + re-score)
- [ ] Step 11 — GET /api/households/priority-queue (sorted by score band then score)
- [ ] Step 12 — Test scoring against Section C worked example (must match exactly)

**End state:** All endpoints tested in Swagger. Scoring output matches Section C worked example exactly.

---

## CHAT 5 — Stock Management ⬜ Not started

**Goal:** Full stock lifecycle works with complete audit trail.

**Steps:**
- [ ] Step 1 — Seed districts + sub-warehouses + initial stock records
- [ ] Step 2 — GET /api/stock/status (all sub-warehouses, all EMK types)
- [ ] Step 3 — GET /api/stock/:districtId (single district stock)
- [ ] Step 4 — POST /api/stock/dispatch (central warehouse → sub-warehouse, creates stock_movement)
- [ ] Step 5 — POST /api/stock/reallocate (cross-district transfer, EC only, creates stock_movement)
- [ ] Step 6 — POST /api/stock/adjust (manual adjustment with reason, Hub Manager, creates stock_movement)
- [ ] Step 7 — GET /api/stock/movements (full audit log, all districts)
- [ ] Step 8 — GET /api/stock/movements/:districtId (audit log for one district)
- [ ] Step 9 — Scarcity mode check (flag when stock falls below 30% of original allocation)
- [ ] Step 10 — Test full stock lifecycle in Swagger (dispatch → deliver → reallocate → check audit log)

**End state:** Every stock change creates a stock_movements record. Scarcity mode triggers correctly. Full audit trail verified.

---

## CHAT 6 — Delivery + Routing ⬜ Not started

**Goal:** Delivery runs logged with receipts. Routing logic recommends correct mode by water depth.

**Steps:**
- [ ] Step 1 — POST /api/delivery/runs (start a run: assign team, zone, sub-warehouse)
- [ ] Step 2 — GET /api/delivery/runs (list all runs, filter by district/status)
- [ ] Step 3 — GET /api/delivery/runs/:id (single run with all receipts)
- [ ] Step 4 — POST /api/delivery/receipts (record per-household delivery confirmation)
- [ ] Step 5 — PATCH /api/delivery/runs/:id/complete (mark run complete, record return time)
- [ ] Step 6 — GET /api/route/recommend (water depth → delivery mode, exact Section A.4 tiers)
- [ ] Step 7 — POST /api/route/update (update water depth for a zone, creates route_log)
- [ ] Step 8 — GET /api/route/logs (route status change history)
- [ ] Step 9 — Suspend logic: delivery mode returns SUSPENDED above 80cm
- [ ] Step 10 — Test full delivery lifecycle in Swagger (start run → add receipts → complete run)

**End state:** Delivery lifecycle and routing logic tested. SUSPENDED returned correctly above 80cm.

---

## CHAT 7 — Volunteers + Incidents + Radio + Dashboard ⬜ Not started

**Goal:** All remaining endpoints complete. Full API deployed on Render.

**Steps:**
- [ ] Step 1 — GET /api/volunteers (list, filter by district)
- [ ] Step 2 — POST /api/volunteers (add to roster)
- [ ] Step 3 — PATCH /api/volunteers/:id (update info or status)
- [ ] Step 4 — POST /api/volunteers/assign (assign to zone + team)
- [ ] Step 5 — GET /api/volunteers/:districtId/roster (full roster for one district)
- [ ] Step 6 — POST /api/incidents (report incident)
- [ ] Step 7 — GET /api/incidents (list, filter by district/type/status)
- [ ] Step 8 — PATCH /api/incidents/:id/resolve (mark resolved)
- [ ] Step 9 — POST /api/radio/checkin (submit scheduled check-in: 08:00/12:00/16:00/20:00)
- [ ] Step 10 — GET /api/radio/checkins (list, filter by district + date)
- [ ] Step 11 — GET /api/notifications (for current user)
- [ ] Step 12 — PATCH /api/notifications/:id/read (mark as read)
- [ ] Step 13 — GET /api/dashboard/summary (phase + stock + households + alerts aggregated)
- [ ] Step 14 — GET /api/dashboard/district/:id (per-district summary card)
- [ ] Step 15 — Deploy to Render
- [ ] Step 16 — Verify all endpoints live at Render URL + Swagger accessible

**End state:** All 30+ endpoints live on Render. Swagger docs accessible at Render URL.

---

## CHAT 8 — Frontend: Auth + Dashboard Setup ⬜ Not started

**Goal:** Login works. Dashboard shell running on Vercel, connected to Render backend.

**Steps:**
- [ ] Step 1 — React project setup (Vite + TypeScript + Tailwind CSS)
- [ ] Step 2 — Environment config (.env with Render backend URL)
- [ ] Step 3 — API service layer (axios instance + JWT interceptor)
- [ ] Step 4 — Auth context (store JWT, current user, logout)
- [ ] Step 5 — Login page (V0) with form + error handling
- [ ] Step 6 — Role-based redirect after login
- [ ] Step 7 — Protected route wrapper component
- [ ] Step 8 — Navigation sidebar (links by role)
- [ ] Step 9 — Dashboard shell layout (header + sidebar + content area)
- [ ] Step 10 — Phase status banner component (Phase 0/1/2)
- [ ] Step 11 — Deploy to Vercel
- [ ] Step 12 — Test: login → redirect → see dashboard shell

**End state:** Login works, dashboard shell live on Vercel, connected to Render backend.

---

## CHAT 9 — Frontend: V1 Dashboard Data + Charts ⬜ Not started

**Goal:** V1 Operations Dashboard fully complete and live with real data.

**Steps:**
- [ ] Step 1 — Connect phase status banner to GET /api/alert/status
- [ ] Step 2 — District summary cards (3 cards: stock %, households assessed, delivery progress)
- [ ] Step 3 — Connect district cards to GET /api/dashboard/summary
- [ ] Step 4 — Stock levels bar chart (EMK-1/2/3 per district, Recharts BarChart)
- [ ] Step 5 — Priority queue table (4 bands, sortable, color coded)
- [ ] Step 6 — Connect priority table to GET /api/households/priority-queue
- [ ] Step 7 — Active incidents panel
- [ ] Step 8 — Connect incidents to GET /api/incidents
- [ ] Step 9 — Recent notifications feed
- [ ] Step 10 — Connect notifications to GET /api/notifications
- [ ] Step 11 — Auto-refresh every 60 seconds
- [ ] Step 12 — Deploy to Vercel + verify live data

**End state:** V1 fully live on Vercel with real data from Render backend.

---

## CHAT 10 — Frontend: V2 Routing Map ⬜ Not started

**Goal:** V2 Routing Map complete and live.

**Steps:**
- [ ] Step 1 — Leaflet.js setup in React (react-leaflet)
- [ ] Step 2 — OpenStreetMap base layer
- [ ] Step 3 — 3 district zone polygon overlays
- [ ] Step 4 — Water depth slider per zone (0–120cm)
- [ ] Step 5 — Delivery mode display per zone (color coded: green/yellow/orange/red)
- [ ] Step 6 — Connect to GET /api/route/recommend
- [ ] Step 7 — Connect water depth update to POST /api/route/update
- [ ] Step 8 — SUSPENDED zone warning display (above 80cm)
- [ ] Step 9 — Route change history panel (GET /api/route/logs)
- [ ] Step 10 — Deploy to Vercel + verify map loads and updates

**End state:** V2 live on Vercel. Changing water depth updates delivery mode in real time.

---

## CHAT 11 — Frontend: V4 Prioritization Tool ⬜ Not started

**Goal:** V4 Prioritization Tool complete and live. Scoring matches Section C exactly.

**Steps:**
- [ ] Step 1 — Assessment form layout (5 category sections)
- [ ] Step 2 — Category 1 input: Medical urgency (0/2/5/8 points)
- [ ] Step 3 — Category 2 input: Vulnerability checkboxes (infant/pregnant/elderly/disabled, cap at 5)
- [ ] Step 4 — Category 3 input: Flood exposure (0/1/3/4 points)
- [ ] Step 5 — Category 4 input: Self-sufficiency (0/1/2 points)
- [ ] Step 6 — Category 5 input: Isolation (0/1 points)
- [ ] Step 7 — Live score calculation as form is filled
- [ ] Step 8 — Score band result display (CRITICAL/HIGH/MEDIUM/STANDARD with color)
- [ ] Step 9 — EMK type recommendation display
- [ ] Step 10 — Connect form submit to POST /api/score/household
- [ ] Step 11 — Sortable household priority table
- [ ] Step 12 — Connect table to GET /api/households/priority-queue
- [ ] Step 13 — Scarcity mode indicator (shows when stock below 30%)
- [ ] Step 14 — Deploy to Vercel + test scoring against Section C worked example

**End state:** V4 live on Vercel. Scoring matches Section C worked example exactly.

---

## CHAT 12 — Frontend: V7 Hub Manager Portal ⬜ Not started

**Goal:** V7 Hub Manager Portal complete and live. Role-gated to HUB_MANAGER.

**Steps:**
- [ ] Step 1 — Portal layout (tabbed: Stock / Volunteers / Deliveries / Incidents / Radio)
- [ ] Step 2 — Stock tab: view EMK levels for own district
- [ ] Step 3 — Stock tab: request resupply form (POST /api/stock/dispatch)
- [ ] Step 4 — Stock tab: manual adjustment form (POST /api/stock/adjust)
- [ ] Step 5 — Stock tab: stock movements log (GET /api/stock/movements/:districtId)
- [ ] Step 6 — Volunteers tab: roster list (GET /api/volunteers/:districtId/roster)
- [ ] Step 7 — Volunteers tab: add volunteer form (POST /api/volunteers)
- [ ] Step 8 — Volunteers tab: assign volunteer to zone/team (POST /api/volunteers/assign)
- [ ] Step 9 — Deliveries tab: start delivery run form (POST /api/delivery/runs)
- [ ] Step 10 — Deliveries tab: active runs list with mark complete button
- [ ] Step 11 — Incidents tab: report incident form (POST /api/incidents)
- [ ] Step 12 — Incidents tab: open incidents list with resolve button
- [ ] Step 13 — Radio tab: check-in form (POST /api/radio/checkin, 4 time slots)
- [ ] Step 14 — Radio tab: check-in history (GET /api/radio/checkins)
- [ ] Step 15 — Deploy to Vercel + test all tabs with HUB_MANAGER role

**End state:** V7 live on Vercel. Hub Manager can manage full district operations.

---

## CHAT 13 — Frontend: V8 Volunteer Mobile View ⬜ Not started

**Goal:** V8 Volunteer mobile view complete and live. Usable on a phone browser.

**Steps:**
- [ ] Step 1 — Mobile layout setup (max-width 480px, large touch targets)
- [ ] Step 2 — Bottom navigation bar (Assessment / Delivery / Incident)
- [ ] Step 3 — Assessment screen: household assessment form (5 categories)
- [ ] Step 4 — Assessment screen: live score display
- [ ] Step 5 — Assessment screen: connect to POST /api/score/household
- [ ] Step 6 — Delivery screen: household list for volunteer's zone
- [ ] Step 7 — Delivery screen: delivery receipt confirmation form
- [ ] Step 8 — Delivery screen: connect to POST /api/delivery/receipts
- [ ] Step 9 — Incident screen: quick incident report form
- [ ] Step 10 — Incident screen: connect to POST /api/incidents
- [ ] Step 11 — Deploy to Vercel + test on mobile browser

**End state:** V8 live on Vercel. All 3 screens work on a phone browser.

---

## CHAT 14 — V3 Warehouse Layout (draw.io) ⬜ Not started

**Goal:** Warehouse layout diagrams complete and exported.

**Steps:**
- [ ] Step 1 — Central warehouse floor plan (~200–250 sqm)
- [ ] Step 2 — Sub-warehouse floor plan (~40–60 sqm)
- [ ] Step 3 — Add stock zone labels and capacity numbers
- [ ] Step 4 — Export central warehouse as PNG + SVG
- [ ] Step 5 — Export sub-warehouse as PNG + SVG
- [ ] Step 6 — Save to sections/visuals/V3-warehouse-layout.png

**End state:** V3 diagrams exported and saved in repo.

---

## CHAT 15 — V5 Stakeholder Flowchart (draw.io) ⬜ Not started

**Goal:** Stakeholder flowchart complete and exported.

**Steps:**
- [ ] Step 1 — Swimlane layout (5 lanes: Volunteer / Team Leader / Hub Manager / Operations Center / Emergency Coordinator)
- [ ] Step 2 — Phase 1 flow (Hours 0–24)
- [ ] Step 3 — Phase 2 flow (Hours 24–48)
- [ ] Step 4 — Information flow arrows (paper / SMS / radio / dashboard)
- [ ] Step 5 — Decision diamonds at key points
- [ ] Step 6 — Export as PNG + SVG
- [ ] Step 7 — Save to sections/visuals/V5-stakeholder-flowchart.png

**End state:** V5 diagram exported and saved in repo.

---

## CHAT 16 — V6 Operating Protocol Document ⬜ Not started

**Goal:** Operating protocol PDF complete and ready to use in the field.

**Steps:**
- [ ] Step 1 — Phase 1 activation checklist (hour-by-hour)
- [ ] Step 2 — Phase 2 activation checklist
- [ ] Step 3 — Radio check-in script (08:00/12:00/16:00/20:00)
- [ ] Step 4 — Delivery runsheet template
- [ ] Step 5 — Incident log template
- [ ] Step 6 — Volunteer assessment form template (Vietnamese labels)
- [ ] Step 7 — Format as clean printable document
- [ ] Step 8 — Export as PDF
- [ ] Step 9 — Save to sections/visuals/V6-operating-protocol.pdf

**End state:** V6 PDF ready to print and use in the field.

---

## CHAT 17 — Final Assembly + Submission Package ⬜ Not started

**Goal:** Complete submission package ready for Viet Nam Red Cross.

**Steps:**
- [ ] Step 1 — Verify all live URLs work (Render + Vercel + Swagger)
- [ ] Step 2 — Compile all strategy sections into one master document
- [ ] Step 3 — Compile all visuals into submission folder
- [ ] Step 4 — Write executive summary (1 page)
- [ ] Step 5 — Write system demo guide
- [ ] Step 6 — Final assumptions log review
- [ ] Step 7 — Build presentation slide outline
- [ ] Step 8 — Final git tag: v1.0.0
- [ ] Step 9 — Package everything into submission folder

**End state:** Full submission package ready. System live. Repository clean and tagged.

---

## FILE STRUCTURE

```
rema-medical-logistics/
├── PROJECT_SCOPE.md
├── PROJECT_PLAN.md
├── HANDOFF.md
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
- `git add . && git commit -m "Chat 7 complete: all endpoints live on Render"`