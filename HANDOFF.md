# REMA Handoff Document
Last updated: Chat 15 complete

## Current Chat Goal
Chat 15 — V3 Warehouse Layout (draw.io) — COMPLETE

## What Was Completed This Chat

### Deliverables produced
- `V3-central-warehouse.drawio` — Full XML provided, ready to import
  - Outer warehouse wall with title block
  - EMK-1 Zone (green) with 6 pallets
  - EMK-2 Zone (yellow) with 4 pallets
  - EMK-3 Staging Zone (red dashed) — cold chain warning box
  - 30% Reserve Zone (purple) with 4 pallets
  - Management Area (top-right)
  - Dispatch Staging Area (bottom, full width)
  - Loading Dock / Truck Bay
  - Arrows: Reserve → Dispatch → Loading Dock → Sub-Warehouses
  - Legend + Title Block
- `V3-sub-warehouse.drawio` — Full XML provided, ready to import
  - Outer sub-warehouse wall with title block
  - EMK-1 Zone (green) with 4 pallets
  - EMK-2 Zone (yellow) with 3 pallets
  - EMK-3 Temp Zone (red dashed) — cold box, no overnight storage rule
  - Volunteer Check-in Station (blue)
  - Comms + Map Point (purple)
  - Entrance arrow + truck access label
  - Physical Storage Standards box (yellow)
  - Delivery Team Structure box (grey)
  - Legend

### Key decisions made this chat
- Both diagrams built in draw.io (not React SVG) as requested
- Two separate XML files — can be combined into one .drawio file with two page tabs
- Export target: PNG at 150% scale, white background, 20px border
- Save to: `sections/visuals/` and `frontend/public/visuals/`
- Frontend embed code provided for WarehouseLayoutPage.tsx

### Files to create/update after this chat
- `sections/visuals/V3-central-warehouse.png` — export from draw.io
- `sections/visuals/V3-sub-warehouse.png` — export from draw.io
- `sections/visuals/V3-warehouse-layout.drawio` — source file
- `frontend/public/visuals/V3-central-warehouse.png` — copy for frontend
- `frontend/public/visuals/V3-sub-warehouse.png` — copy for frontend
- `frontend/src/pages/WarehouseLayoutPage.tsx` — replace placeholder with embed code

## Live URLs
| Service | URL |
|---|---|
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

## Next Chat Goal — Chat 16: V5 Stakeholder Flowchart (draw.io)

### What Chat 16 builds
One swimlane flowchart showing how all 5 actor groups coordinate
across Phase 0, Phase 1, and Phase 2:
1. Red Cross Operations Center
2. Hub Managers
3. Volunteers
4. Local Authorities (Ward People's Committees + Civil Defense)
5. Logistics Partners (trucks, boats, pharmacy distributors)

Includes decision diamonds, information flow arrows, escalation paths,
and coordination failure triggers. Full XML for draw.io import.

### First steps for Chat 16
1. Read HANDOFF.md + PROJECT_SCOPE.md + section-D-coordination-model.md
2. Read section-A-response-design.md for phase timing
3. Produce full draw.io XML for V5 swimlane diagram
4. Guide export + frontend embed into StakeholderPage.tsx