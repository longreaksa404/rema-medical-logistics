# REMA Handoff Document
Last updated: Chat 3 complete

## Current Chat Goal
Chat 3 — Auth + RBAC — COMPLETE

## What Was Completed This Chat
- [x] src/types/auth.ts — JwtPayload interface + Express Request extension
- [x] src/middleware/auth.ts — requireAuth + requireRole (role hierarchy)
- [x] src/services/auth.service.ts — loginUser, getCurrentUser, hashPassword
- [x] src/controllers/auth.controller.ts — login, logout, me handlers
- [x] src/routes/auth.routes.ts — POST /login, POST /logout, GET /me
- [x] src/routes/test.routes.ts — 4 role-gated test routes
- [x] src/seed.ts — seeds 3 districts + 3 sub-warehouses + 5 users (one per role)
- [x] src/app.ts — auth + test routes wired in
- [x] backend/package.json — bcrypt, jsonwebtoken, ts-node added
- [x] backend/tsconfig.json — types: ["node"] added
- [x] root package.json — fixed (was empty/invalid JSON)
- [x] swagger.yaml — Auth Tests tag added
- [x] All 7 Swagger tests passed (login, me, viewer, hub-manager, coordinator 403, admin 403, 401 without token)

## What Is NOT Done Yet
- [ ] Push to GitHub (do this manually)
- [ ] Chat 4: Activation + Scoring Engine

## What Is Done
- [x] Chat 1 — All strategy sections complete (0, A, B, C, D, E, F)
- [x] Assumptions Log — 48 assumptions documented
- [x] Tech stack locked
- [x] Chat 2 — Project Setup ✅
- [x] Chat 3 — Auth + RBAC ✅

## What Is Next — Chat 4: Activation + Scoring Engine
1. POST /api/alert/trigger (2-of-3 logic, auto-activate)
2. GET /api/alert/status
3. PATCH /api/alert/phase (EC only)
4. POST /api/score/household (20-point engine — must match Section C exactly)
5. Score band assignment (CRITICAL/HIGH/MEDIUM/STANDARD)
6. EMK type recommendation from score
7. POST /api/households (create + score)
8. GET /api/households (list + filter)
9. GET /api/households/:id
10. PATCH /api/households/:id (update + re-score)
11. GET /api/households/priority-queue (sorted by band then score)
12. Test scoring against Section C worked example

## Critical Decisions to Remember
- EMK-3 never pre-stored — MoH cold storage only, transferred at activation
- Scoring: exactly 5 categories, 20 points max, must match Section C precisely
- Volunteer safety hard limit: suspend all delivery above 80cm water depth
- Last-mile tiers: motorbike (0–30cm) / bicycle or foot (30–60cm) / boat (60–80cm) / suspended (>80cm)
- 3 sub-warehouses, 1 per district, 12 volunteers each = 36 total
- Activation trigger: 2 of 3 conditions must be met simultaneously
- Central warehouse holds 30% reserve after dispatching to sub-warehouses
- Scarcity mode triggers when total stock falls below 30% of original allocation
- JWT_SECRET must be in .env — default dev value is placeholder only
- Role hierarchy (low → high): VIEWER → VOLUNTEER → HUB_MANAGER → EMERGENCY_COORDINATOR → SUPER_ADMIN
- seed.ts lives in backend/src/seed.ts — run with npm run seed from backend/
- Test routes (/api/test/*) should be removed before final deployment
- root package.json must not be empty — ts-node walks up and chokes on invalid JSON

## Live URLs
- Backend API: not yet deployed
- Frontend: not yet deployed
- Swagger docs: not yet deployed
- Supabase DB: rema-medical-logistics (Singapore, ref: vkrtqhiymbbdgmtybjrm)