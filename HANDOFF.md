# REMA Handoff Document
Last updated: Chat 10 complete

## Current Chat Goal
Chat 10 — Frontend V2 Routing Map — COMPLETE

## What Was Completed This Chat

### New files created

**API layer:**
- `frontend/src/api/routes.ts` — `recommend()`, `update()`, `getLogs()`, `getDistrictRoutes()`
  - Full TypeScript types: `DeliveryMode`, `Route`, `RouteLog`, `RouteRecommendation`, `UpdateRouteResponse`

**New page (replaces placeholder):**
- `frontend/src/pages/RoutingPage.tsx` — Full routing map implementation
  - Leaflet loaded dynamically from CDN (no npm install needed — avoids Vite/SSR issues)
  - OpenStreetMap base layer (free, no API key)
  - 3 district polygon overlays with approximate HCMC coordinates
  - Color-coded by current delivery mode (green/yellow/blue/red)
  - Click-to-select district interaction
  - Zone water depth sliders (0–120cm, step 5cm) for Zone A/B/C per district
  - Real-time mode display as slider moves (no backend call needed for preview)
  - "Update Backend" button → `POST /api/route/update` → creates route_log
  - Save status feedback: idle → saving → saved/error with timeout reset
  - Section A.4 locked tier reference panel
  - Route change log panel (last 30 entries from `GET /api/route/logs`)
  - SUSPENDED global warning banner when any zone exceeds 80cm
  - District quick-view cards showing per-zone depths
  - Loads existing routes from backend on mount via `GET /api/route/district/:id`
  - `lastUpdated` timestamp in header refreshes after each backend save

**Updated files:**
- `frontend/src/pages/PlaceholderPages.tsx` — `RoutingPage` placeholder removed
- `frontend/src/App.tsx` — RoutingPage import switched to real component

### Key decisions made this chat
- Used CDN Leaflet (not npm) — avoids react-leaflet compatibility issues with Vite/React 19
- Zone model: 3 zones per district (Zone A, Zone B, Zone C) — matches backend zone field
- District polygons are approximations of HCMC flood-prone districts (Binh Thanh, Go Vap, District 8 areas)
- No `react-leaflet` install required — pure vanilla Leaflet via CDN script injection
- Depths initialized at 0 on load, then overwritten with live backend data
- "Update Backend" is explicit (not auto-save) — avoids flooding the API on every slider move
- Assumption #50: Each district has exactly 3 delivery zones (Zone A, Zone B, Zone C) for the purposes of this routing view. The backend zone field is a string so this assumption is compatible.

### Install step required
```bash
# NO npm install needed — Leaflet loads from CDN
# If you want types for development (optional):
cd frontend && npm install --save-dev @types/leaflet
```

## Live URLs
| Service  | URL |
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

## Next Chat Goal — Chat 11: Frontend V4 Prioritization Tool

### What Chat 11 builds
**Page:** `frontend/src/pages/PrioritizePage.tsx` (replaces placeholder)

**Two panels:**
1. **Assessment Form** — 5 categories, correct valid values per Section C
   - Cat 1: radio buttons → 0, 2, 5, 8 (with labels for each value)
   - Cat 2: 0–5 slider (sum of flags, capped)
   - Cat 3: radio buttons → 0, 1, 3, 4 (with labels)
   - Cat 4: radio buttons → 0, 1, 2
   - Cat 5: toggle → 0 or 1
   - Live score preview as form fills (no API needed — compute locally using scoring logic)
   - Score band badge (CRITICAL/HIGH/MEDIUM/STANDARD) updates in real time
   - EMK recommendation badge updates in real time
   - District selector + address field
   - Submit → `POST /api/households` → creates household record
   - Success: show score result, clear form

2. **Priority Queue Table** (already built as component — embed here with full-page width)
   - District tab selector
   - Band filter tabs with counts
   - Full household rows

**API additions needed:**
- `POST /api/score/household` — already in api layer as `householdsApi`
- `POST /api/households` — need to add to `householdsApi`

### First steps for Chat 11
1. Read HANDOFF.md + PROJECT_SCOPE.md
2. Add `create()` to `frontend/src/api/households.ts`
3. Create scoring utility `frontend/src/utils/scoring.ts` (mirrors backend logic, no API call)
4. Build `PrioritizePage.tsx` with two-panel layout
5. Update `PlaceholderPages.tsx` — remove `PrioritizePage`
6. Update `App.tsx` — import real `PrioritizePage`

### Scoring logic to replicate client-side (from backend/src/utils/scoring.ts)
```
cat1: 8=medication run out, 5=low 1-2 days, 2=adequate, 0=none
cat2: 0-5 (sum of flags: +2 infant, +2 pregnant, +2 elderly alone, +2 disabled — cap at 5)
cat3: 4=water inside/unsafe, 3=doorstep, 1=street but not household, 0=dry
cat4: 2=no clean water/food/sanitation, 1=partial, 0=adequate
cat5: 1=completely isolated, 0=some contact

Band: 15-20=CRITICAL, 10-14=HIGH, 5-9=MEDIUM, 0-4=STANDARD
EMK: cat1>=5 → EMK3, cat2>=1 → EMK2, else → EMK1
```