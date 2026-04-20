# REMA Handoff Document
Last updated: Chat 2 complete

## Current Chat Goal
Chat 2 — Project Setup — COMPLETE

## What Was Completed This Chat
- [x] Step 1–4 (from last time): monorepo, Docker, Supabase, 5-table Prisma schema
- [x] Step 5 — Prisma schema updated to full 15-table design
- [x] Step 6 — Migration command ready: npx prisma migrate dev --name full-schema
- [x] Step 7 — src/index.ts and src/app.ts built
- [x] Step 8 — GET /api/health endpoint
- [x] Step 9 — Swagger setup at /api/docs with full OpenAPI 3.0 spec (all endpoints stubbed)
- [x] Step 10 — Ready to test locally

## What Is NOT Done Yet
- [ ] Push to GitHub (Reaksa does this manually after testing)
- [ ] Chat 3: Auth + RBAC

## What Is Done
- [x] Chat 1 — All strategy sections complete (0, A, B, C, D, E, F)
- [x] Assumptions Log — 48 assumptions documented
- [x] Tech stack locked
- [x] Chat 2 — Project Setup ✅

## What Is Next — Chat 3: Auth + RBAC
1. Install: npm install jsonwebtoken bcrypt @types/jsonwebtoken @types/bcrypt
2. Seed users table (one per role: SUPER_ADMIN, EMERGENCY_COORDINATOR, HUB_MANAGER, VOLUNTEER, VIEWER)
3. POST /api/auth/login (validate email + password → return JWT)
4. POST /api/auth/logout
5. GET /api/auth/me (current user from JWT)
6. Auth middleware (verify JWT on protected routes)
7. Role guard middleware (reject below required role)
8. Test in Swagger: login → token → call protected route → 401 without token → 403 wrong role

## Critical Decisions to Remember
- EMK-3 never pre-stored — MoH cold storage only, transferred at activation
- Scoring: exactly 5 categories, 20 points max, must match Section C precisely
- Volunteer safety hard limit: suspend all delivery above 80cm water depth
- Last-mile tiers: motorbike (0–30cm) / bicycle or foot (30–60cm) / boat (60–80cm) / suspended (>80cm)
- 3 sub-warehouses, 1 per district, 12 volunteers each = 36 total
- Activation trigger: 2 of 3 conditions must be met simultaneously
- Central warehouse holds 30% reserve after dispatching to sub-warehouses
- Scarcity mode triggers when total stock falls below 30% of original allocation
- Prisma stays at v5.22 — do not upgrade mid-project
- DIRECT_URL + DATABASE_URL both required in .env

## Live URLs
- Backend API: not yet deployed
- Frontend: not yet deployed
- Swagger docs: not yet deployed
- Supabase DB: rema-medical-logistics (Singapore, ref: vkrtqhiymbbdgmtybjrm)