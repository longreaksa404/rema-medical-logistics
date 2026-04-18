# REMA Handoff Document
Last updated: Chat 2 partial

## Current Chat Goal
Chat 2 — Project Setup — INCOMPLETE (Steps 5 and 6 remaining)

## What Was Completed This Chat
- [x] Monorepo folder structure created
- [x] Docker + docker-compose files created
- [x] Supabase project created (rema-medical-logistics, Singapore region)
- [x] Prisma schema created (5 tables) + first migration run successfully
- [x] PROJECT_SCOPE.md written and pushed to repo
- [x] PROJECT_PLAN.md written and pushed to repo
- [x] Claude Project Instructions updated with opening + closing rituals

## What Is NOT Done Yet (finish in next chat)
- [ ] Step 5 — Express boilerplate (src/index.ts, src/app.ts, GET /api/health)
- [ ] Step 6 — Swagger setup (/api/docs)
- [ ] Prisma schema updated to full 15-table design
- [ ] New migration run after schema update

## What Is Done
- [x] Chat 1 — All strategy sections complete (0, A, B, C, D, E, F)
- [x] Assumptions Log — 48 assumptions documented
- [x] Tech stack locked
- [x] Chat structure planned (Chats 2–14)
- [ ] Chat 2 — Project Setup
- [ ] Chat 3 — Backend: Activation + Scoring
- [ ] Chat 4 — Backend: Stock Management
- [ ] Chat 5 — Backend: Routing + Dashboard Summary
- [ ] Chat 6 — V1 Dashboard UI: Setup + Layout
- [ ] Chat 7 — V1 Dashboard UI: Data + Charts
- [ ] Chat 8 — V2 Routing Logic: Map Setup
- [ ] Chat 9 — V2 Routing Logic: Logic + Display
- [ ] Chat 10 — V4 Prioritization Matrix
- [ ] Chat 11 — V3 Warehouse Layout
- [ ] Chat 12 — V5 Stakeholder Flowchart
- [ ] Chat 13 — V6 Operating Protocol
- [ ] Chat 14 — Section Z Final Assembly

## What Is Next
Finish Chat 2 — Steps 5 and 6:
1. Update Prisma schema to full 15-table design (from PROJECT_SCOPE.md Section 8)
2. Run: npx prisma migrate dev --name full-schema
3. Build src/index.ts and src/app.ts
4. Add GET /api/health endpoint
5. Set up Swagger at /api/docs

## Critical Decisions to Remember
- EMK-3 never pre-stored — MoH cold storage only, transferred at activation
- Scoring: exactly 5 categories, 20 points max, must match Section C precisely
- Volunteer safety hard limit: suspend all delivery above 80cm water depth
- Last-mile tiers: motorbike (0–30cm) / bicycle or foot (30–60cm) /
  boat (60–80cm) / suspended (>80cm)
- 3 sub-warehouses, 1 per district, 12 volunteers each = 36 total
- Activation trigger: 2 of 3 conditions must be met simultaneously
- Central warehouse holds 30% reserve after dispatching to sub-warehouses
- Scarcity mode triggers when total stock falls below 30% of original allocation
- Stack is locked — do not suggest alternatives
- Supabase project ref: vkrtqhiymbbdgmtybjrm — Singapore region (ap-southeast-1)
- Prisma stays at v5.22 — do not upgrade mid-project
- DIRECT_URL + DATABASE_URL both required in .env for Prisma + Supabase pooler to work

## Live URLs
- Backend API: not yet deployed
- Frontend: not yet deployed
- Swagger docs: not yet deployed
- Supabase DB: rema-medical-logistics (Singapore, ref: vkrtqhiymbbdgmtybjrm)