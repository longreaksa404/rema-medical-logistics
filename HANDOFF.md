# REMA Handoff Document
Last updated: Chat 11 complete

## Current Chat Goal
Chat 11 — Frontend V4 Prioritization Tool — COMPLETE

## What Was Completed This Chat

### New files created

**Utility:**
- `frontend/src/utils/scoring.ts` — Client-side scoring engine mirroring backend exactly
  - `scoreHousehold()`, `computeCat2()`, `assignBand()`, `recommendEmk()`
  - All option arrays with labels: `CAT1_OPTIONS`, `CAT2_FLAGS`, `CAT3_OPTIONS`, `CAT4_OPTIONS`
  - Types: `ScoreInput`, `ScoreResult`, `PriorityBand`, `EmkRecommendation`, `Cat2FlagId`

**API:**
- `frontend/src/api/households.ts` — Added `create()` and `scoreOnly()` methods

**New page:**
- `frontend/src/pages/PrioritizePage.tsx`
  - Two-panel layout: form (3/5 width) + live preview (2/5 width)
  - Animated score ring dial (SVG, color changes per band)
  - Cat 1 & 3: radio groups with correct locked values (0/2/5/8 and 0/1/3/4)
  - Cat 2: checkbox flags, sum capped at 5, cap warning shown
  - Cat 4: radio group 0/1/2
  - Cat 5: single checkbox toggle
  - Live score preview updates on every input change (no API call)
  - Submit → POST /api/households → SuccessCard with score/band/EMK
  - Form resets after submit; queue re-renders via key change
  - Section C.8 worked example reference panel
  - Full PriorityQueueTable embedded below

**Updated files:**
- `frontend/src/pages/PlaceholderPages.tsx` — PrioritizePage removed
- `frontend/src/App.tsx` — imports real PrioritizePage

### Key decisions made this chat
- Live scoring is entirely client-side — no `POST /api/score/household` call needed for preview
- Submit still hits `POST /api/households` to persist the record and create audit trail
- Queue refresh triggered by React key change (`queueRefreshKey`) after successful submit
- `assignBand` and `recommendEmk` are exported from scoring.ts but only used internally by `scoreHousehold` — not called directly from the page (clean imports)
- Assumption #51: Cat 2 flag labels are adapted for quick volunteer field use; they match Section C.5 criteria exactly

## Live URLs
| Service | URL |
|----------|-----|
| Backend API | https://rema-medical-logistics.onrender.com |
| Swagger docs | https://rema-medical-logistics.onrender.com/api/docs |
| Frontend | https://rema-frontend-delta.vercel.app |
| Database | Supabase PostgreSQL — rema-medical-logistics (Singapore) |

## Test Accounts (all passwords: rema1234)
| Email | Role | District |
|---|---|---|
| admin@rema.vn | SUPER_ADMIN | — |
| coordinator@rema.vn | EMERGENCY_COORDINATOR | — |
| hub1@rema.vn | HUB_MANAGER | District 1 |
| hub2@rema.vn | HUB_MANAGER | District 2 |
| hub3@rema.vn | HUB_MANAGER | District 3 |
| volunteer1@rema.vn | VOLUNTEER | District 1 |
| viewer@rema.vn | VIEWER | — |

## Next Chat Goal — Chat 12: Frontend V7 Hub Manager Portal

### What Chat 12 builds
**Page:** `frontend/src/pages/HubPage.tsx` (replaces placeholder)

**Tabbed layout — 5 tabs:**

1. **Stock** — EMK levels per sub-warehouse, dispatch form, adjustment form, movements log
2. **Volunteers** — district roster, add volunteer form, assign to zone/team form
3. **Deliveries** — start run form, active runs list (IN_PROGRESS), mark complete button
4. **Incidents** — report form, open/escalated incidents list, resolve button
5. **Radio** — check-in form (T0800/T1200/T1600/T2000 selector), today's compliance grid

**Role gate:** HUB_MANAGER, EMERGENCY_COORDINATOR, SUPER_ADMIN

**APIs used:**
- Stock: `GET /api/stock/:districtId`, `POST /api/stock/dispatch`, `POST /api/stock/adjust`, `GET /api/stock/movements/:districtId`
- Volunteers: `GET /api/volunteers/:districtId/roster`, `POST /api/volunteers`, `POST /api/volunteers/assign`
- Deliveries: `POST /api/delivery/runs`, `GET /api/delivery/runs?districtId=X`, `PATCH /api/delivery/runs/:id/complete`
- Incidents: `POST /api/incidents`, `GET /api/incidents?districtId=X`, `PATCH /api/incidents/:id/resolve`
- Radio: `POST /api/radio/checkin`, `GET /api/radio/checkins?districtId=X&date=today`

**Hub Manager sees only their own district. EC and SUPER_ADMIN get a district selector.**

### First steps for Chat 12
1. Read HANDOFF.md + PROJECT_SCOPE.md
2. Create `frontend/src/api/hub.ts` — typed wrappers for all 5 tab APIs
3. Build `HubPage.tsx` with tab navigation
4. Build each tab as a sub-component
5. Update PlaceholderPages.tsx — remove HubPage
6. Update App.tsx — import real HubPage