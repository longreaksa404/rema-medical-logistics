# REMA — Project Plan
**Build Structure & Progress Tracker**

---

## LIVE URLS

| Service | URL | Status |
|---|---|---|
| Backend API | https://rema-medical-logistics.onrender.com | ✅ Live |
| Swagger Docs | https://rema-medical-logistics.onrender.com/api/docs | ✅ Live |
| Frontend | https://rema-system.vercel.app | ✅ Live |
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
| Chat 11 | Frontend: V4 Prioritization Tool | ✅ Complete (REMOVED) |
| Chat 12 | Frontend: V7 Hub Manager Portal | ✅ Complete |
| Chat 13 | Frontend: V8 Volunteer Mobile View | ✅ Complete |
| Chat 14 | Frontend: V9 User Management (SUPER_ADMIN) | ✅ Complete |
| Chat 15 | V3 Warehouse Layout (draw.io) | ✅ Complete |
| Chat 16 | V5 Stakeholder Flowchart (draw.io) | ✅ Complete |
| Chat 17 | V6 Operating Protocol (PDF) | ✅ Complete |
| Chat 18 | Unit Tests (Jest — backend utility functions) | ✅ Complete |
| Chat 19 | CI/CD Pipeline (GitHub Actions) | ✅ Complete |
| Chat 20 | AI Integration (REMA AI Brief) | ✅ Complete |
| Chat 21 | Final Assembly + Submission Package | ✅ Complete |
| Chat 22 | Post-Submission Improvements | ✅ Complete |

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

---

## CHAT 8 — Frontend: Auth + Dashboard Setup ✅ Complete

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
- [x] Water depth slider per zone (0-120cm)
- [x] Delivery mode per zone (color coded)
- [x] Connect to GET /api/route/recommend
- [x] Connect depth update to POST /api/route/update
- [x] SUSPENDED zone warning above 80cm
- [x] Route change history panel
- [x] Deploy and verify

---

## CHAT 11 — Frontend: V4 Prioritization Tool ✅ Complete (REMOVED)

- [x] Merged into VolunteerPage (assessment) and DashboardPage (priority queue)

---

## CHAT 12 — Frontend: V7 Hub Manager Portal ✅ Complete

- [x] Tabbed layout (Stock / Volunteers / Deliveries / Incidents / Radio)
- [x] Stock tab: EMK levels, resupply form, adjustment form, movements log
- [x] Volunteers tab: roster, add volunteer, assign to zone/team
- [x] Deliveries tab: start run, active runs list, mark complete
- [x] Incidents tab: report form, open incidents list, resolve button
- [x] Radio tab: check-in form (4 time slots), check-in history
- [x] Role-gated to HUB_MANAGER
- [x] Deploy and test all tabs

---

## CHAT 13 — Frontend: V8 Volunteer Mobile View ✅ Complete

- [x] Mobile layout (max-width 480px, large touch targets)
- [x] Bottom navigation bar (Assessment / Delivery / Incident)
- [x] Assessment screen: 5-category form + live score
- [x] Delivery screen: household list + receipt confirmation
- [x] Incident screen: quick report form
- [x] All screens connected to backend
- [x] Deploy and test on mobile browser

---

## CHAT 14 — Frontend: V9 User Management ✅ Complete

- [x] User list table (role, district, active status)
- [x] Create user form (POST /api/users)
- [x] Deactivate / reactivate user (PATCH /api/users/:id)
- [x] Reset password form (POST /api/users/:id/reset-password)
- [x] Role-gated to SUPER_ADMIN only
- [x] Deploy and test

---

## CHAT 15 — V3 Warehouse Layout (draw.io) ✅ Complete

- [x] Central warehouse floor plan (~200-250 sqm)
- [x] Sub-warehouse floor plan (~40-60 sqm)
- [x] Stock zone labels and capacity numbers
- [x] Export as PNG + SVG
- [x] Save to sections/visuals/V3-warehouse-layout.png

---

## CHAT 16 — V5 Stakeholder Flowchart (draw.io) ✅ Complete

- [x] Swimlane layout (6 lanes)
- [x] Phase 1 flow (Hours 0-24)
- [x] Phase 2 flow (Hours 24-48)
- [x] Information flow arrows
- [x] Decision diamonds
- [x] Export as PNG + SVG
- [x] Save to sections/visuals/V5-stakeholder-flowchart.png

---

## CHAT 17 — V6 Operating Protocol (PDF) ✅ Complete

- [x] Phase 1 + 2 activation checklists
- [x] Radio check-in script (4 time slots)
- [x] Delivery runsheet template
- [x] Incident log template
- [x] Volunteer assessment form (Vietnamese labels)
- [x] Export as PDF
- [x] Save to sections/visuals/V6-operating-protocol.pdf

---

## CHAT 18 — Unit Tests (Jest — Backend Utility Functions) ✅ Complete

- [x] Install Jest + ts-jest + @types/jest in `backend/`
- [x] 59 scoring tests — all 20-point rules + Section C worked examples
- [x] 18 stock utils tests — scarcity threshold (30% boundary)
- [x] 13 alert tests — all 8 activation trigger combinations
- [x] 23 route tests — all 4 delivery tiers and depth boundaries
- [x] 113 tests total passing, no Prisma or HTTP calls

---

## CHAT 19 — CI/CD Pipeline (GitHub Actions) ✅ Complete

- [x] `.github/workflows/ci.yml` — test on PR, deploy to Render on main
- [x] Node.js 20, npm ci, npm test, Render deploy hook
- [x] Vercel autodeploy connected to GitHub main
- [x] RENDER_DEPLOY_HOOK_URL secret configured

---

## CHAT 20 — AI Integration (REMA AI Brief) ✅ Complete

- [x] `backend/src/services/ai.service.ts` — mock service, reads real DB
- [x] `backend/src/controllers/ai.controller.ts` — POST /api/ai/brief
- [x] `backend/src/routes/ai.routes.ts` — EC + SUPER_ADMIN only
- [x] `frontend/src/components/AiBriefModal.tsx` — 3-section modal
- [x] "Advisory only" banner always visible
- [x] Graceful 503 degradation

---

## CHAT 21 — Final Assembly + Submission Package ✅ Complete

- [x] All live URLs verified
- [x] Strategy sections compiled into master document
- [x] Executive summary, demo guide, presentation outline
- [x] Git tag v1.0.0
- [x] POST /api/alert/reset (SUPER_ADMIN only)
- [x] PhaseControls component on DashboardPage
- [x] frontend/src/api/alert.ts created

---

## CHAT 22 — Post-Submission Improvements ✅ Complete

### Fix 1 — Per-zone route recommend endpoint
- [x] `route.service.ts` — added `recommendByDistrict()` returning per-zone array
- [x] `route.controller.ts` — GET /api/route/recommend now accepts `districtId` param
- [x] `frontend/src/api/routes.ts` — added `getRecommendByDistrict()`, `DistrictRecommendation` type
- [x] `frontend/src/pages/RoutingPage.tsx` — reads real zone depths from API, no hardcoded fallbacks
- [x] Swagger updated for new response shape

### Fix 2 — Notification triggers
- [x] `alert.service.ts` — notifies HUB_MANAGER + EC + SUPER_ADMIN on activation and phase advance; emits `phase_changed` socket event
- [x] `stock.service.ts` — notifies EC + SUPER_ADMIN when stock falls below 30%; emits `scarcity_triggered` socket event
- [x] `incident.service.ts` — notifies district HUB_MANAGER on incident report; notifies EC + SUPER_ADMIN for VOLUNTEER_SAFETY and BUILDING_FLOODED; emits `incident_reported` socket event

### Fix 3 — mustChangePassword enforcement
- [x] `schema.prisma` — added `mustChangePassword Boolean @default(false)` to User model
- [x] Migration: `add_must_change_password`
- [x] `user.service.ts` — `createUser` sets `mustChangePassword: true`; `changeOwnPassword` clears it; `resetUserPassword` sets it back to true
- [x] `auth.service.ts` — `mustChangePassword` included in login response and `getCurrentUser` select
- [x] `AuthContext.tsx` — stores flag, `login()` returns `boolean` (mustChangePassword value)
- [x] `LoginPage.tsx` — redirects to `/change-password` when login returns true
- [x] `ChangePasswordPage.tsx` — forced change banner; Cancel button hidden when mustChangePassword is true
- [x] `frontend/src/api/auth.ts` — `mustChangePassword?` added to `UserProfile`

### Fix 4 — Zone geographic data from API
- [x] `RoutingPage.tsx` — replaced hardcoded zone depths with API fetch via `getRecommendByDistrict`
- [x] Falls back to sensible defaults only when no route records exist yet

### Fix 5 — WebSocket for real-time alerts
- [x] `backend/src/app.ts` — wrapped Express with `http.Server`, added `socket.io` Server, exported `httpServer` and `io`
- [x] `backend/src/index.ts` — switched from `app.listen` to `httpServer.listen`
- [x] `alert.service.ts` — emits `phase_changed` on activation and phase advance
- [x] `stock.service.ts` — emits `scarcity_triggered` inside `notifyScarcityIfNeeded`
- [x] `incident.service.ts` — emits `incident_reported` on new incident
- [x] `AuthContext.tsx` — connects `socket.io-client` on login, disconnects on logout, exposes `onSocketEvent()`
- [x] `DashboardPage.tsx` — subscribes to all 3 socket events, triggers silent refetch instantly
- [x] `app.ts` — added `cookie-parser` middleware

### Fix 6 — Refresh tokens
- [x] `schema.prisma` — added `RefreshToken` model (tokenHash, userId, expiresAt, revoked); added `refreshTokens` relation to User
- [x] Migration: `add_refresh_tokens`
- [x] `auth.service.ts` — access token 15m, refresh token 7 days; hash stored in DB; `loginUser`, `refreshAccessToken`, `logoutUser` functions
- [x] `auth.controller.ts` — refresh token in httpOnly cookie; `POST /api/auth/refresh` handler; cookie cleared on logout
- [x] `auth.routes.ts` — added `POST /api/auth/refresh`
- [x] `frontend/src/api/client.ts` — `withCredentials: true`; refresh interceptor with queue for parallel requests; auto-retry on 401
- [x] `frontend/src/api/auth.ts` — added `refresh()` function

### User Profile Page (new feature)
- [x] `frontend/src/pages/ProfilePage.tsx` — NEW: account info + avatar upload + change password form
- [x] `frontend/src/components/Avatar.tsx` — NEW: reusable avatar component (image or initial fallback, 3 sizes)
- [x] `schema.prisma` — added `avatarBase64 String?` to User model
- [x] Migration: `add_user_avatar`
- [x] `user.service.ts` — added `updateOwnAvatar()` with 50kb size limit and data URL validation
- [x] `user.controller.ts` — added `updateAvatar` handler
- [x] `user.routes.ts` — added `PATCH /api/users/me/avatar` (any authenticated user)
- [x] `auth.service.ts` — `avatarBase64` included in login response and `getCurrentUser` select
- [x] `AuthContext.tsx` — added `updateAvatar()` function, updates user state + localStorage
- [x] `frontend/src/api/auth.ts` — added `updateAvatar()` API call, `avatarBase64?` on `UserProfile`
- [x] `frontend/src/App.tsx` — added `/profile` route inside AppShell
- [x] `frontend/src/components/Sidebar.tsx` — replaced bottom footer with clickable user card navigating to `/profile`; uses `Avatar` component in both collapsed and expanded states; removed separate change password button

---

## Full FILE STRUCTURE

```
rema-medical-logistics/
├── .github/
├── backend/
│   ├── src/
│   │   ├── app.ts
│   │   ├── index.ts
│   │   ├── seed.ts
│   │   ├── controllers/
│   │   │   ├── ai.controller.ts
│   │   │   ├── alert.controller.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── dashboard.controller.ts
│   │   │   ├── delivery.controller.ts
│   │   │   ├── district.controller.ts
│   │   │   ├── household.controller.ts
│   │   │   ├── incident.controller.ts
│   │   │   ├── notification.controller.ts
│   │   │   ├── radio.controller.ts
│   │   │   ├── route.controller.ts
│   │   │   ├── stock.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   └── volunteer.controller.ts
│   │   ├── services/
│   │   │   ├── ai.service.ts
│   │   │   ├── alert.service.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── dashboard.service.ts
│   │   │   ├── delivery.service.ts
│   │   │   ├── district.service.ts
│   │   │   ├── household.service.ts
│   │   │   ├── incident.service.ts
│   │   │   ├── notification.service.ts
│   │   │   ├── radio.service.ts
│   │   │   ├── route.service.ts
│   │   │   ├── stock.service.ts
│   │   │   ├── user.service.ts
│   │   │   └── volunteer.service.ts
│   │   ├── routes/
│   │   │   ├── ai.routes.ts
│   │   │   ├── alert.routes.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── dashboard.routes.ts
│   │   │   ├── delivery.routes.ts
│   │   │   ├── district.routes.ts
│   │   │   ├── household.routes.ts
│   │   │   ├── incident.routes.ts
│   │   │   ├── notification.routes.ts
│   │   │   ├── radio.routes.ts
│   │   │   ├── route.routes.ts
│   │   │   ├── stock.routes.ts
│   │   │   ├── test.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   └── volunteer.routes.ts
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   ├── types/
│   │   │   └── auth.ts
│   │   ├── utils/
│   │   │   ├── __tests__/
│   │   │   ├── cache.ts
│   │   │   ├── route.utils.ts
│   │   │   ├── scoring.ts
│   │   │   └── stock.utils.ts
│   │   └── lib/
│   │       ├── prisma.ts
│   │       └── socket.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── supabase/
│   ├── .env.example
│   ├── .gitignore
│   ├── jest.config.ts
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── swagger.yaml
│   └── render.yaml
├── frontend/
│   ├── src/
│   │   ├── App.css
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css
│   │   ├── vite-env.d.ts
│   │   ├── components/
│   │   │   ├── AiBriefModal.tsx
│   │   │   ├── AppShell.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── ConfirmModal.tsx
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── DeliveryRunsPanel.tsx
│   │   │   ├── LeafletMap.tsx
│   │   │   ├── PhaseBanner.tsx
│   │   │   ├── PriorityQueueTable.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── RadioCompliancePanel.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── StockChart.tsx
│   │   ├── pages/
│   │   │   ├── ChangePasswordPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── HubPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── PlaceholderPages.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── RoutingPage.tsx
│   │   │   ├── StakeholderPage.tsx
│   │   │   ├── UsersPage.tsx
│   │   │   └── VolunteerPage.tsx
│   │   ├── api/
│   │   │   ├── ai.ts
│   │   │   ├── alert.ts
│   │   │   ├── auth.ts
│   │   │   ├── cache.ts
│   │   │   ├── client.ts
│   │   │   ├── dashboard.ts
│   │   │   ├── dashboard.types.ts
│   │   │   ├── households.ts
│   │   │   ├── hub.ts
│   │   │   ├── queryKeys.ts
│   │   │   ├── radio.ts
│   │   │   └── routes.ts
│   │   ├── utils/
│   │   │   └── scoring.ts
│   │   ├── hooks/
│   │   │   └── usePageTitle.ts
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   └── assets/
│   ├── public/
│   ├── .env.example
│   ├── .gitignore
│   ├── README.md
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── tsconfig.node.tsbuildinfo
│   ├── tsconfig.tsbuildinfo
│   ├── vite.config.d.ts
│   ├── vite.config.js
│   ├── vite.config.ts
│   └── vercel.json
├── docs/
│   ├── Assumptions-log.md
│   ├── section-0-core-concept.md
│   ├── section-A-response-design.md
│   ├── section-B-logistics-model.md
│   ├── section-C-prioritization-framework.md
│   ├── section-D-coordination-model.md
│   ├── section-E-scalability-sustainability.md
│   └── section-F-financial-plan.md
├── sections/
│   ├── documents/
│   ├── submission/
│   └── visuals/
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── HANDOFF.md
├── PROJECT_PLAN.md
├── PROJECT_SCOPE.md
├── README.md
└── package.json
```

---

## GIT COMMIT PATTERN

```bash
git add .
git commit -m "Chat 22 complete: per-zone routes, notifications, mustChangePassword, websocket, refresh tokens, profile page with avatar"
```