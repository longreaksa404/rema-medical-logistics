# REMA Handoff Document
Last updated: Chat 9 complete

## Current Chat Goal
Chat 9 — Frontend V1 Dashboard Data + Charts — COMPLETE

## What Was Completed This Chat

### New files created (frontend/src/)

**API layer:**
- `api/households.ts` — `getPriorityQueue(districtId)`, `list(filters)`
- `api/radio.ts` — `getCompliance()`

**New components:**
- `components/StockChart.tsx` — Recharts `BarChart`, EMK-1/2/3 % per district
  - Normal bars: blue/green/yellow; scarce bars (<30%): red
  - Raw number grid below chart
  - Custom dark-themed tooltip
  - Scarcity threshold visual indicator
- `components/PriorityQueueTable.tsx` — Connected to `GET /api/households/priority-queue`
  - District selector tabs (D1/D2/D3)
  - Band filter tabs (ALL / CRITICAL / HIGH / MEDIUM / STANDARD) with live counts
  - Score progress bar, Cat.1 urgency column, EMK type, delivered status
  - Skeleton loading rows
  - Section C tiebreaker sort order documented in footer
- `components/RadioCompliancePanel.tsx` — Today's 4-slot check-in compliance
  - Per-district slot grid (T0800/T1200/T1600/T2000)
  - Issues reported badge
  - Overall slots filled counter
- `components/DeliveryRunsPanel.tsx` — Delivery progress per district
  - Active runs badge (pulsing green if >0)
  - Overall progress bar
  - Per-district progress bars

**Updated page:**
- `pages/DashboardPage.tsx` — Full rebuild integrating all new components
  - Section order: Phase Banner → Stats → Priority Bands → Stock Chart →
    Delivery+Radio row → District Cards → Priority Queue → Incidents
  - Stat cards now show sub-labels (e.g. "47% complete")
  - Incidents panel only renders when incidents exist
  - DistrictCard kept inline (no separate file needed)

### Key decisions made this chat
- RadioCompliancePanel fetches independently — compliance is small, frequently
  changing, and needs to be always fresh (not cached with dashboard data)
- PriorityQueueTable always fetches fresh — stale delivery queue in a flood
  emergency is dangerous; no caching applied
- StockChart shows % remaining in bars (not raw units) for cross-district
  comparison; raw numbers in grid below
- EMK-3 showing 0% until MoH transfer is correct per Section B.10

### Install step required
```bash
cd frontend && npm install recharts
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

## Next Chat Goal — Chat 10: Frontend V2 Routing Map

### What Chat 10 builds
- Install `react-leaflet` + `leaflet`
- OpenStreetMap base layer (free, no API key)
- 3 district zone polygon overlays (color-coded by water depth)
- Water depth input per zone (slider or number input)
- Delivery mode badge per zone (MOTORBIKE / BICYCLE_OR_FOOT / BOAT / SUSPENDED)
- SUSPENDED warning overlay when depth > 80cm
- Connect depth update to `POST /api/route/update`
- Connect mode recommendation to `GET /api/route/recommend`
- Route change history panel (recent logs from `GET /api/route/logs`)
- Role guard: visible to all, editable by HUB_MANAGER+

### First steps for Chat 10
1. `cd frontend && npm install react-leaflet leaflet`
2. `npm install --save-dev @types/leaflet`
3. Read HANDOFF.md + PROJECT_SCOPE.md + PROJECT_PLAN.md
4. Create `api/routes.ts` (recommend, update, getLogs, getDistrictRoutes)
5. Create `pages/RoutingPage.tsx` replacing current placeholder
6. Build `components/RoutingMap.tsx` with Leaflet
7. Build `components/ZoneControl.tsx` for depth input + mode display

### Leaflet setup notes for Chat 10
- Must import Leaflet CSS: `import 'leaflet/dist/leaflet.css'` in the page file
- Default marker icons need fixing in Vite — use custom icons or CDN
- Ho Chi Minh City center coords: lat 10.7769, lng 106.7009
- 3 mock district polygons needed (approximate HCMC district boundaries)
- Use `react-leaflet` v4 which works with React 18+