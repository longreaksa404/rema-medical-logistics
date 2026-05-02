# REMA Handoff Document
Last updated: Chat 12 complete

## Current Chat Goal
Chat 12 — Frontend V7 Hub Manager Portal — COMPLETE

## What Was Completed This Chat

### New files created

**API:**
- `frontend/src/api/hub.ts` — typed wrappers for all 5 hub tab APIs
  - Types: `StockLevel`, `StockMovement`, `Volunteer`, `DistrictRoster`, `DeliveryRun`, `Incident`, `RadioCheckin`
  - Methods: `getDistrictStock`, `dispatch`, `adjust`, `getMovements`, `getRoster`, `createVolunteer`, `updateVolunteer`, `assignVolunteer`, `getDeliveryRuns`, `startRun`, `completeRun`, `abortRun`, `getIncidents`, `reportIncident`, `resolveIncident`, `getCheckins`, `submitCheckin`

**New page:**
- `frontend/src/pages/HubPage.tsx` — Full Hub Manager Portal
  - Tab navigation: Stock | Volunteers | Deliveries | Incidents | Radio
  - **Stock tab**: Live EMK1/2/3 levels with scarcity badges, dispatch form, manual adjustment form, audit log (last 50 movements)
  - **Volunteers tab**: Roster summary cards, add volunteer form, assign to zone+team form (requires REMA activated), full roster table with status toggle
  - **Deliveries tab**: Start delivery run form, active runs panel with complete/abort actions (abort requires reason), run history
  - **Incidents tab**: Report form with all 5 incident types (VOLUNTEER_SAFETY auto-escalation noted), active incidents list with resolve button, resolved history
  - **Radio tab**: Today's 4-slot compliance grid, submit check-in form (slot + status + notes), today's submission history
  - District selector for EC/SUPER_ADMIN; HUB_MANAGER locked to own district
  - Alert phase indicator in top bar
  - Sub-warehouse warning if none found

**Updated files:**
- `frontend/src/pages/PlaceholderPages.tsx` — HubPage removed; only VolunteerPage and UsersPage remain
- `frontend/src/App.tsx` — imports real HubPage from `./pages/HubPage`

### Key decisions made this chat
- HUB_MANAGER is locked to `user.districtId` automatically; EC and SUPER_ADMIN get district selector buttons
- Alert ID for volunteer assignment is fetched from `GET /api/alert/status` on load — if not activated, assignment form shows a warning instead of crashing
- Abort run requires a reason field (enforced client-side before API call) per Section A.4
- VOLUNTEER_SAFETY incidents show escalation note from backend response if `autoEscalated` is true
- EMK-3 stock shows "MoH cold storage" note when total is 0 (not yet transferred)
- Radio check-in slots already submitted today are visually marked "done" in both the compliance grid and the slot selector buttons
- `subWarehouseId` is passed down from `selectedDistrict.subWarehouseId` — if null, dispatch/assign/start-run forms show a warning instead of erroring silently

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

## Testing Sequence for Chat 12

1. Login as `hub1@rema.vn` → /hub
2. **Stock tab**: Check EMK levels → try dispatch (need sub-warehouse ID) → try adjustment with reason → check audit log
3. **Volunteers tab**: Add a volunteer → check roster table → try assign (requires activated alert)
4. **Deliveries tab**: Start a run → mark complete → verify run appears in history
5. **Incidents tab**: Report ROUTE_BLOCKED → report VOLUNTEER_SAFETY (auto-escalates) → resolve one
6. **Radio tab**: Submit T0800 check-in as OK → verify slot turns green → submit T1200 as ISSUE_REPORTED with notes
7. Login as `coordinator@rema.vn` → /hub → district selector visible → switch between districts

## Next Chat Goal — Chat 13: Frontend V8 Volunteer Mobile View

### What Chat 13 builds
**Page:** `frontend/src/pages/VolunteerPage.tsx` (replaces placeholder)

**Mobile-optimized layout — 3 bottom-nav tabs:**

1. **Assess** — 5-category household assessment form (reuses scoring utils), live score ring, submit creates household record
2. **Deliver** — Priority queue for volunteer's district, record delivery receipt (POST /api/delivery/receipts) per household
3. **Report** — Quick incident report form (5 types), confirmation screen

**Design:**
- Max width 480px centered, large touch targets (min 44px tap area)
- Bottom navigation bar (fixed, 3 icons)
- No sidebar — full-screen mobile experience
- Uses existing scoring.ts utils for live preview
- District inferred from `user.districtId` (VOLUNTEER role)

**APIs used:**
- `GET /api/households/priority-queue?districtId=X` — for Deliver tab
- `POST /api/households` — for Assess tab (same as PrioritizePage)
- `POST /api/delivery/receipts` — record individual household delivery
- `GET /api/delivery/runs?districtId=X&status=IN_PROGRESS` — pick active run for receipts
- `POST /api/incidents` — for Report tab

**Role gate:** VOLUNTEER, HUB_MANAGER, SUPER_ADMIN (volunteers need access, HMs may use it too)

### First steps for Chat 13
1. Read HANDOFF.md + PROJECT_SCOPE.md
2. Create `frontend/src/pages/VolunteerPage.tsx` with mobile layout
3. Build 3 tab components: AssessTab, DeliverTab, ReportTab
4. Update PlaceholderPages.tsx — remove VolunteerPage
5. Update App.tsx — import real VolunteerPage
6. Deploy and test on mobile browser width