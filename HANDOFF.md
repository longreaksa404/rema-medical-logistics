# REMA Handoff Document
Last updated: Chat 5 complete

## Current Chat Goal
Chat 5 — Stock Management — COMPLETE

## What Was Completed This Chat
- [x] seed.ts — updated with stock records for all 3 sub-warehouses (Section B.2 figures)
- [x] seed.ts — added hub2@rema.vn and hub3@rema.vn (Hub Managers for Districts 2 and 3)
- [x] stock.service.ts — getAllStock, getStockByDistrict, dispatchStock, reallocateStock, adjustStock, getAllMovements, getMovementsByDistrict, recordDelivery (for Chat 6)
- [x] stock.controller.ts — all 8 handlers
- [x] stock.routes.ts — route order fixed (status/movements before :districtId)
- [x] district.service.ts — listDistricts, getDistrict, getDistrictSummary (for dashboard)
- [x] district.controller.ts — list, getOne, summary handlers
- [x] district.routes.ts — replaces Chat 4 stub; /summary before /:id
- [x] app.ts — stock and district routes wired in
- [x] swagger.yaml — StockLevel, StockMovement, DistrictCard schemas updated; all stock/district paths with full descriptions and examples

## Swagger Tests — What to Verify
- [ ] GET /api/districts → returns 3 districts with sub-warehouse IDs
- [ ] GET /api/stock/status → EMK1+EMK2 seeded, EMK3=0, no scarcity
- [ ] GET /api/stock/:districtId → single district stock
- [ ] POST /api/stock/dispatch (EMK1) → stock increases, DISPATCH movement created
- [ ] POST /api/stock/dispatch (EMK3) → stock increases, movement auto-changed to MOH_TRANSFER
- [ ] POST /api/stock/reallocate (EC only) → two movement records, from/to both updated
- [ ] POST /api/stock/adjust (Hub Manager) → negative quantity works, ADJUSTMENT movement created
- [ ] Scarcity test: adjust to <30% → anyScarce=true
- [ ] GET /api/stock/movements → all operations in audit log, newest first
- [ ] GET /api/stock/movements/:districtId → filtered correctly

## What Is NOT Done Yet
- [ ] Add Assumption #49 to docs/Assumptions-log.md
- [ ] Push to GitHub

## What Is Done
- [x] Chat 1 — All strategy sections complete
- [x] Chat 2 — Project Setup ✅
- [x] Chat 3 — Auth + RBAC ✅
- [x] Chat 4 — Activation + Scoring Engine ✅
- [x] Chat 5 — Stock Management ✅

## What Is Next — Chat 6: Delivery + Routing
1. POST /api/delivery/runs — start a delivery run (subWarehouseId, teamNumber, zone, leadVolunteerId)
2. GET /api/delivery/runs — list, filter by districtId/status
3. GET /api/delivery/runs/:id — single run with all receipts
4. POST /api/delivery/receipts — record per-household confirmation; calls recordDelivery() from stock.service
5. PATCH /api/delivery/runs/:id/complete — mark run complete, set returnedAt
6. GET /api/route/recommend?waterDepthCm=X — return delivery mode per Section A.4 tiers
7. POST /api/route/update — update water depth for a zone, creates route_log entry
8. GET /api/route/logs — route status history, filter by districtId
9. SUSPENDED logic: mode = SUSPENDED above 80cm, include warning message
10. Full lifecycle test: start run → add receipts (stock decrements) → complete run

## Critical Decisions to Remember
- recordDelivery() is already written in stock.service.ts — Chat 6 delivery receipt controller calls it
- Route tiers are locked: 0–30 MOTORBIKE / 30–60 BICYCLE_OR_FOOT / 60–80 BOAT / >80 SUSPENDED
- Delivery receipts must decrement sub-warehouse stock (call recordDelivery)
- Stock scarcity check: remaining < 30% of total → anyScarce flag
- EMK-3 dispatch auto-set to MOH_TRANSFER in service
- Assumption #49: Total fields update on each DISPATCH (current activation baseline)

## Live URLs
- Backend API: not yet deployed
- Frontend: not yet deployed
- Swagger docs: not yet deployed
- Supabase DB: rema-medical-logistics (Singapore, ref: vkrtqhiymbbdgmtybjrm)