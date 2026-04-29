# REMA — Project Plan
**Build Structure & Progress Tracker**

---

## LIVE URLS

| Service | URL | Status |
|---|---|---|
| Backend API | https://rema-medical-logistics.onrender.com | ✅ Live |
| Swagger Docs | https://rema-medical-logistics.onrender.com/api/docs | ✅ Live |
| Frontend | https://rema-frontend-delta.vercel.app | ✅ Live |
| Database | Supabase — rema-medical-logistics (Singapore, ref: vkrtqhiymbbdgmtybjrm) |

---

## PROGRESS OVERVIEW

| Chat | Topic | Status |
|---|---|---|
| Chat 1 | Strategy — Sections 0, A, B, C, D, E, F | ✅ Complete |
| Chat 2 | Project Setup | ✅ Complete |
| Chat 3 | Auth + RBAC | ✅ Complete |
| Chat 4 | Activation + Scoring Engine | ✅ Complete |
| Chat 5 | Stock Management | ✅ Complete |
| Chat 6 | Delivery + Routing | ✅ Complete |
| Chat 7 | Volunteers + Incidents + Radio + Dashboard | ✅ Complete |
| Chat 7.5 | Cache + Polling Architecture | ✅ Complete |
| Chat 7.6 | User Management + Public Status (real deployment prep) | ✅ Complete |
| Chat 8 | Frontend: Auth + Dashboard Setup | ✅ Complete |
| Chat 9 | Frontend: V1 Dashboard Data + Charts | ✅ Complete |
| Chat 10 | Frontend: V2 Routing Map | ✅ Complete |
| Chat 11 | Frontend: V4 Prioritization Tool | ⬜ Not started |
| Chat 12 | Frontend: V7 Hub Manager Portal | ⬜ Not started |
| Chat 13 | Frontend: V8 Volunteer Mobile View | ⬜ Not started |
| Chat 14 | Frontend: V9 User Management (SUPER_ADMIN) | ⬜ Not started |
| Chat 15 | V3 Warehouse Layout (draw.io) | ⬜ Not started |
| Chat 16 | V5 Stakeholder Flowchart (draw.io) | ⬜ Not started |
| Chat 17 | V6 Operating Protocol (PDF) | ⬜ Not started |
| Chat 18 | Final Assembly + Submission Package | ⬜ Not started |

---

## CHAT 1 — Strategy ✅ Complete

- [x] Section 0: Core System Concept
- [x] Section A: Response Design
- [x] Section B: Logistics Model
- [x] Section C: Prioritization Framework
- [x] Section D: Coordination Model
- [x] Section E: Scalability & Sustainability
- [x] Section F: Financial Plan
- [x] Assumptions Log (49 assumptions documented)

---

## CHAT 2 — Project Setup ✅ Complete

- [x] Monorepo folder structure
- [x] Docker + docker-compose
- [x] Supabase PostgreSQL connection + .env
- [x] Prisma schema + migrations
- [x] Express boilerplate
- [x] GET /api/health
- [x] Swagger at /api/docs

---

## CHAT 3 — Auth + RBAC ✅ Complete

- [x] Seed users (one per role)
- [x] POST /api/auth/login
- [x] POST /api/auth/logout
- [x] GET /api/auth/me
- [x] Auth middleware (JWT verify)
- [x] Role guard middleware
- [x] Test routes verified

---

## CHAT 4 — Activation + Scoring Engine ✅ Complete

- [x] POST /api/alert/trigger (2-of-3 auto-activate)
- [x] GET /api/alert/status
- [x] PATCH /api/alert/phase
- [x] POST /api/score/household (20-point engine)
- [x] Score band assignment
- [x] EMK recommendation logic
- [x] POST /api/households
- [x] GET /api/households
- [x] GET /api/households/:id
- [x] PATCH /api/households/:id
- [x] GET /api/households/priority-queue
- [x] Scoring verified against Section C worked example

---

## CHAT 5 — Stock Management ✅ Complete

- [x] Seed districts + sub-warehouses + stock records
- [x] GET /api/stock/status
- [x] GET /api/stock/:districtId
- [x] POST /api/stock/dispatch
- [x] POST /api/stock/reallocate (EC only)
- [x] POST /api/stock/adjust (HUB_MANAGER+)
- [x] GET /api/stock/movements
- [x] GET /api/stock/movements/:districtId
- [x] Scarcity mode check (below 30%)
- [x] Full stock lifecycle tested in Swagger

---

## CHAT 6 — Delivery + Routing ✅ Complete

- [x] POST /api/delivery/runs
- [x] GET /api/delivery/runs
- [x] GET /api/delivery/runs/:id
- [x] POST /api/delivery/receipts
- [x] PATCH /api/delivery/runs/:id/complete
- [x] PATCH /api/delivery/runs/:id/abort
- [x] GET /api/route/recommend
- [x] POST /api/route/update
- [x] GET /api/route/logs
- [x] GET /api/route/district/:districtId
- [x] SUSPENDED returned correctly above 80cm

---

## CHAT 7 — Volunteers + Incidents + Radio + Dashboard ✅ Complete

- [x] GET /api/volunteers
- [x] POST /api/volunteers
- [x] PATCH /api/volunteers/:id
- [x] POST /api/volunteers/assign
- [x] GET /api/volunteers/:districtId/roster
- [x] POST /api/incidents
- [x] GET /api/incidents
- [x] PATCH /api/incidents/:id/resolve
- [x] POST /api/radio/checkin
- [x] GET /api/radio/checkins
- [x] GET /api/radio/compliance
- [x] GET /api/notifications
- [x] PATCH /api/notifications/read-all
- [x] PATCH /api/notifications/:id/read
- [x] GET /api/dashboard/summary
- [x] GET /api/dashboard/district/:id
- [x] Deployed to Render
- [x] All endpoints verified live

---

## CHAT 7.5 — Cache + Polling Architecture ✅ Complete

- [x] In-memory cache utility (getCached, setCached, invalidateCache)
- [x] getDashboardSummary — 15s TTL cache
- [x] getDistrictDashboard — 10s TTL cache
- [x] invalidateCache() on phase advance (alert.service)
- [x] Targeted cache invalidation on dispatch/reallocate (stock.service)
- [x] isInScarcity moved to utils/stock.utils.ts (circular dep resolved)
- [x] Deployed and verified

---

## CHAT 7.6 — User Management + Public Status ✅ Complete

- [x] GET /api/status (public, no auth — aggregate data only)
- [x] POST /api/users (SUPER_ADMIN only — create user with temporary password)
- [x] GET /api/users (SUPER_ADMIN only)
- [x] GET /api/users/:id (SUPER_ADMIN only)
- [x] PATCH /api/users/:id (SUPER_ADMIN only — update, deactivate)
- [x] PATCH /api/users/me/password (any auth user — change own password)
- [x] POST /api/users/:id/reset-password (SUPER_ADMIN only)
- [x] app.ts updated with user routes + public status route
- [x] Swagger updated with new schemas and paths
- [x] Architecture decision locked: Option A (single unified frontend app)

**Key decisions:**
- SUPER_ADMIN created via seed only — never via API
- No public registration — closed user base
- Deactivate, never delete — audit trail preserved
- VIEWER role keeps auth required — dashboard shows PII

---

## CHAT 8 — Frontend: Auth + Dashboard Setup ✅ Complete

**Goal:** Login works. Single unified React app (Option A) running on Vercel, connected to Render backend.

**Architecture decision (locked):** Single app, role-based rendering. One Vercel deployment. React Router v6. Auth state in React Context.

- [x] React project setup (Vite + TypeScript + Tailwind CSS) inside `frontend/`
- [x] Environment config (.env with Render backend URL)
- [x] API service layer (axios instance + JWT interceptor)
- [x] Auth context (JWT, current user, role, logout)
- [x] Login page (V0) — form + error handling
- [x] Role-based redirect after login
- [x] Protected route wrapper component
- [x] Role-based navigation sidebar
- [x] Dashboard shell layout (header + sidebar + content area)
- [x] Phase status banner component (Phase 0/1/2 with color)
- [x] Change password page (any auth user — needed for first login)
- [x] Deploy to Vercel
- [x] 30-second polling interval (useEffect + setInterval)
- [x] Manual refresh button for Operations Center users
- [x] "Last updated" timestamp on dashboard

---

## CHAT 9 — Frontend: V1 Dashboard Data + Charts ✅ Complete

- [x] Phase status banner connected to GET /api/alert/status
- [x] District summary cards (3 cards) connected to GET /api/dashboard/summary
- [x] Stock levels bar chart (EMK-1/2/3 per district, Recharts)
- [x] Priority queue table (4 bands, color coded)
- [x] Priority table connected to GET /api/households/priority-queue
- [x] Active incidents panel connected to GET /api/incidents
- [x] Notifications feed connected to GET /api/notifications
- [x] Auto-refresh every 60 seconds
- [x] Deploy and verify live data

---

## CHAT 10 — Frontend: V2 Routing Map ✅ Complete

- [x] Leaflet.js + react-leaflet setup
- [x] OpenStreetMap base layer
- [x] 3 district zone polygon overlays
- [x] Water depth slider per zone (0–120cm)
- [x] Delivery mode per zone (color coded)
- [x] Connect to GET /api/route/recommend
- [x] Connect depth update to POST /api/route/update
- [x] SUSPENDED zone warning above 80cm
- [x] Route change history panel
- [x] Deploy and verify

---

## CHAT 11 — Frontend: V4 Prioritization Tool ⬜ Not started

- [ ] Assessment form (5 category sections)
- [ ] Cat 1–5 inputs with correct valid values
- [ ] Live score calculation as form fills
- [ ] Score band result display with color
- [ ] EMK type recommendation display
- [ ] Connect to POST /api/score/household
- [ ] Sortable household priority table
- [ ] Connect to GET /api/households/priority-queue
- [ ] Scarcity mode indicator
- [ ] Deploy and verify scoring matches Section C

---

## CHAT 12 — Frontend: V7 Hub Manager Portal ⬜ Not started

- [ ] Tabbed layout (Stock / Volunteers / Deliveries / Incidents / Radio)
- [ ] Stock tab: EMK levels, resupply form, adjustment form, movements log
- [ ] Volunteers tab: roster, add volunteer, assign to zone/team
- [ ] Deliveries tab: start run, active runs list, mark complete
- [ ] Incidents tab: report form, open incidents list, resolve button
- [ ] Radio tab: check-in form (4 time slots), check-in history
- [ ] Role-gated to HUB_MANAGER
- [ ] Deploy and test all tabs

---

## CHAT 13 — Frontend: V8 Volunteer Mobile View ⬜ Not started

- [ ] Mobile layout (max-width 480px, large touch targets)
- [ ] Bottom navigation bar (Assessment / Delivery / Incident)
- [ ] Assessment screen: 5-category form + live score
- [ ] Delivery screen: household list + receipt confirmation
- [ ] Incident screen: quick report form
- [ ] All screens connected to backend
- [ ] Deploy and test on mobile browser

---

## CHAT 14 — Frontend: V9 User Management ⬜ Not started

- [ ] User list table (role, district, active status)
- [ ] Create user form (POST /api/users)
- [ ] Deactivate / reactivate user (PATCH /api/users/:id)
- [ ] Reset password form (POST /api/users/:id/reset-password)
- [ ] Role-gated to SUPER_ADMIN only
- [ ] Deploy and test

---

## CHAT 15 — V3 Warehouse Layout (draw.io) ⬜ Not started

- [ ] Central warehouse floor plan (~200–250 sqm)
- [ ] Sub-warehouse floor plan (~40–60 sqm)
- [ ] Stock zone labels and capacity numbers
- [ ] Export as PNG + SVG
- [ ] Save to sections/visuals/V3-warehouse-layout.png

---

## CHAT 16 — V5 Stakeholder Flowchart (draw.io) ⬜ Not started

- [ ] Swimlane layout (5 lanes)
- [ ] Phase 1 flow (Hours 0–24)
- [ ] Phase 2 flow (Hours 24–48)
- [ ] Information flow arrows
- [ ] Decision diamonds
- [ ] Export as PNG + SVG
- [ ] Save to sections/visuals/V5-stakeholder-flowchart.png

---

## CHAT 17 — V6 Operating Protocol (PDF) ⬜ Not started

- [ ] Phase 1 + 2 activation checklists
- [ ] Radio check-in script (4 time slots)
- [ ] Delivery runsheet template
- [ ] Incident log template
- [ ] Volunteer assessment form (Vietnamese labels)
- [ ] Export as PDF
- [ ] Save to sections/visuals/V6-operating-protocol.pdf

---

## CHAT 18 — Final Assembly + Submission Package ⬜ Not started

- [ ] Verify all live URLs (Render + Vercel + Swagger)
- [ ] Compile all strategy sections into master document
- [ ] Compile all visuals into submission folder
- [ ] Write executive summary (1 page)
- [ ] Write system demo guide
- [ ] Final assumptions log review
- [ ] Build presentation slide outline
- [ ] Final git tag: v1.0.0
- [ ] Package everything into submission folder

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
│   ├── swagger.yaml
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
git add . 
git commit -m "Chat [N] complete: [brief description]"
```