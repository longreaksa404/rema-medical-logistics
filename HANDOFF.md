# REMA Handoff Document
Last updated: Chat 16 complete

## Current Chat Goal
Chat 16 — V5 Stakeholder Flowchart (draw.io) — COMPLETE

## What Was Completed This Chat

### Deliverables produced
- `V5-stakeholder-flowchart-v4.drawio` — Full V4 rebuild, ready to import
  - 6 swimlanes (added Health Facilities as distinct lane)
  - Lane 1: RC Operations Center
  - Lane 2: Hub Managers
  - Lane 3: Volunteers
  - Lane 4: Health Facilities (NEW — Ward Health Stations + District Hospital)
  - Lane 5: Local Authorities (Ward People's Committees + Civil Defense)
  - Lane 6: Logistics Partners (Trucks / Boats / Pharmacy Distributors / MoH)
  - All 3 phases with correct timing
  - Activation trigger diamond with YES (≥2 met) and NO (<2 met) branches
  - Scarcity mode diamond (30% threshold) in RC Phase 2
  - Backup sub-warehouse contingency path in HM Phase 2
  - Full delivery mode tier diamond (0–30/30–60/60–80/>80cm) in volunteer lane
  - Cross-ward assignment noted as fairness safeguard
  - All 20 cross-lane arrows with labels
  - 4 coordination failure protocols (F1–F4) from Section D.10
  - Full legend including cross-ward note and EMK-3 cold chain rule
  - 169 cells, 53 arrows — all references validated ✅

### Issues fixed from v3 audit (11 total)
1. Added Health Facilities lane (critical structural gap)
2. Activation trigger NO branch added
3. rc2escalq moved to correct position (not downstream of reallocation)
4. MoH EMK-3 request now fires from activation, not dispatch
5. Scarcity mode diamond added (30% threshold)
6. Backup sub-warehouse path added (hm2backupq diamond)
7. Delivery mode tiers visible (4-branch decision diamond)
8. Cross-ward assignment prominently noted
9. YES/NO labels on all decision diamonds
10. Volunteer safety escalation path back to HM
11. Backup LP contractor node added in Phase 0

### Key decisions made this chat
- 6 lanes (not 5) — Health Facilities is a distinct actor group per Section D.7
- Canvas: 2600×2100px for readable spacing
- MoH placed in Logistics Partners lane (supply chain role); distinct from Health Facilities lane (clinical role)
- Scarcity mode trigger: 30% of original allocation (Section C.9)

### Files to create/update after this chat
- `sections/visuals/V5-stakeholder-flowchart.drawio` — source file
- `sections/visuals/V5-stakeholder-flowchart.png` — export at 150% scale
- `frontend/public/visuals/V5-stakeholder-flowchart.png` — copy for frontend
- `frontend/src/pages/StakeholderPage.tsx` — embed the exported PNG

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

## Next Chat Goal — Chat 17: V6 Operating Protocol (PDF)

### What Chat 17 builds
A professional PDF document containing:
1. Phase 1 + 2 activation checklist (step-by-step, timed)
2. Radio check-in script (4 time slots: 08:00/12:00/16:00/20:00)
3. Delivery runsheet template (volunteer use, per zone)
4. Incident log template (Hub Manager use)
5. Volunteer household assessment form (Vietnamese labels, scoring on reverse)
6. Quick reference: delivery mode tiers, score bands, EMK types

### First steps for Chat 17
1. Read HANDOFF.md + PROJECT_SCOPE.md + section-A-response-design.md
2. Read section-C-prioritization-framework.md + section-D-coordination-model.md
3. Read the pdf SKILL.md at /mnt/skills/public/pdf/SKILL.md
4. Produce the operating protocol PDF