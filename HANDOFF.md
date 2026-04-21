# REMA Handoff Document
Last updated: Chat 4 complete

## Current Chat Goal
Chat 4 — Activation + Scoring Engine — COMPLETE

## What Was Completed This Chat
- [x] alert.service.ts — getOrCreateActiveAlert, submitTrigger (2-of-3 auto-activate), getAlertStatus, advancePhase
- [x] alert.controller.ts — trigger, status, phase handlers
- [x] alert.routes.ts — POST /trigger, GET /status, PATCH /phase (EC-only)
- [x] scoring.ts (utils) — exact 20-point engine from Section C; all 6 scores+bands match
- [x] household.service.ts — computeScore, createHousehold, listHouseholds, getHousehold, updateHousehold, getPriorityQueue
- [x] household.controller.ts — scoreOnly, create, list, priorityQueue, getOne, update
- [x] household.routes.ts — /api/score and /api/households routes
- [x] district.routes.ts — GET /api/districts, GET /api/districts/:id (quick unblock)
- [x] app.ts — all Chat 4 routes wired in
- [x] swagger.yaml — full replacement with Chat 3 + Chat 4 endpoints
- [x] TypeScript fix — Record type in alert.service.ts updated to include number

## Swagger Tests Passed
- [x] GET /api/alert/status → fresh alert, all false, phase 0
- [x] POST /api/alert/trigger warningLevelTwo → 1 condition set
- [x] POST /api/alert/trigger rainfallExceeds100mm → activated=true, phase=1
- [x] POST /api/score/household Case F → score=10, HIGH, EMK3
- [x] POST /api/score/household Case E → score=1, STANDARD, EMK1

## What Is NOT Done Yet
- [ ] POST /api/households and GET /api/households/priority-queue not tested yet
  (need district IDs — will happen naturally during Chat 5 seeding)
- [ ] Add Assumption #49 to docs/Assumptions-log.md
- [ ] Push to GitHub

## What Is Done
- [x] Chat 1 — All strategy sections complete
- [x] Chat 2 — Project Setup ✅
- [x] Chat 3 — Auth + RBAC ✅
- [x] Chat 4 — Activation + Scoring Engine ✅

## What Is Next — Chat 5: Stock Management
1. Seed stock records for all 3 sub-warehouses (initial allocation per Section B.2)
2. GET /api/stock/status — all sub-warehouses
3. GET /api/stock/:districtId — single district
4. POST /api/stock/dispatch — central warehouse → sub-warehouse, creates stock_movement
5. POST /api/stock/reallocate — cross-district, EC only
6. POST /api/stock/adjust — manual with reason, Hub Manager
7. GET /api/stock/movements — full audit log
8. GET /api/stock/movements/:districtId — per-district log
9. Scarcity mode check (stock < 30% of original allocation)
10. Full lifecycle test in Swagger

## Critical Decisions to Remember
- EMK-3 never pre-stored — MoH cold storage only, transferred at activation
- Scoring: 6/6 scores+bands match Section C.8 exactly
- EMK recommendation: cat1≥5→EMK3, cat2≥1→EMK2, else EMK1 (field-adjustable)
- Assumption #49: EMK2 default for cat2≥1 is conservative; field volunteers can downgrade
- Priority queue sort: BAND ORDER → totalScore DESC → cat1 DESC → createdAt ASC
- /priority-queue route MUST be before /:id in Express route order
- FloodAlert is a single accumulating record — conditions are additive
- Phase auto-advances to 1 when 2-of-3 triggers met
- alert.service.ts Record type: boolean | string | Date | number

## Live URLs
- Backend API: not yet deployed
- Frontend: not yet deployed
- Swagger docs: not yet deployed
- Supabase DB: rema-medical-logistics (Singapore, ref: vkrtqhiymbbdgmtybjrm)