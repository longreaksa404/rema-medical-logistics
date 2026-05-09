# REMA Handoff Document
Last updated: Chat 17 complete

## Current Chat Goal
Chat 17 — V6 Operating Protocol (PDF) — COMPLETE

## What Was Completed This Chat

### Deliverables produced
- `V6-operating-protocol.pdf` — 8-page professional field reference document
  - Cover page with classification notice, metadata, and contents table
  - Section 1: Phase 1 Activation Checklist (Hours 0–3 / 3–8 / 8–16 / 16–24)
    - 4 colour-coded time blocks with checkboxes and responsible roles
    - Activation trigger highlighted in red alert box (2-of-3 conditions)
  - Section 2: Phase 2 Adaptive Delivery Checklist
    - Delivery mode table (water depth → transport → capacity)
    - 4-band priority order table with colour coding
    - Repeatable daily ops checklist (16 items)
  - Section 3: Radio Check-In Script (08:00 / 12:00 / 16:00 / 20:00)
    - Exact scripted dialogue for each slot
    - Coordination failure quick reference (F1–F4 from Section D.10)
  - Section 4: Delivery Runsheet Template
    - 12-row household delivery log
    - Run header, summary totals, team leader + hub manager sign-off
  - Section 5: Incident Log Template
    - 10-row incident log with type codes (RT/VS/SS/BF/OT)
    - Contingency decisions log
  - Section 6: Volunteer Household Assessment Form
    - All 5 scoring categories with exact point values
    - Total score box and priority band lookup
    - EMK recommendation table
    - Tiebreaker rules (3 steps)
    - Volunteer notes field and signature block

### Key decisions made this chat
- PDF built with reportlab (Python) — no external fonts, fully portable
- 8 pages total — designed to print double-sided on A4
- Every scoring value matches Section C exactly
- Colour scheme consistent with REMA brand (dark red Phase 1, dark blue Phase 2, purple Assessment)
- Assumes this PDF will be embedded in frontend as V6 static document

### Files to copy into repo
- Copy `V6-operating-protocol.pdf` to `sections/visuals/V6-operating-protocol.pdf`
- Copy `V6-operating-protocol.pdf` to `frontend/public/visuals/V6-operating-protocol.pdf`
- Create `frontend/src/pages/ProtocolPage.tsx` to embed the PDF (iframe or object tag)

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

## Next Chat Goal — Chat 18: Final Assembly + Submission Package

### What Chat 18 builds
1. Verify all live URLs (Render + Vercel + Swagger)
2. Wire V6 PDF into frontend ProtocolPage.tsx
3. Compile all strategy sections into a master document (or confirm they're already separate)
4. Write executive summary (1 page)
5. Write system demo guide (test account walkthrough)
6. Final assumptions log review
7. Build presentation slide outline
8. Final git tag: v1.0.0
9. Package everything into submission folder README

### First steps for Chat 18
1. Read HANDOFF.md + PROJECT_SCOPE.md + PROJECT_PLAN.md
2. Check all live URLs are responding
3. Add ProtocolPage.tsx to frontend (embed PDF)
4. Then proceed with submission package