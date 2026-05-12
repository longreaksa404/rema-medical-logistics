# REMA Handoff Document
Last updated: Chat 21 complete — FINAL (reset endpoint added)

---

## Current Status

**REMA IS COMPLETE. All 21 chats done.**

---

## What Was Completed in Chat 21

### Submission package documents
- `REMA-Executive-Summary.md`
- `REMA-Master-Strategy.md`
- `REMA-Demo-Guide.md`
- `REMA-Presentation-Outline.md`
- `REMA-Interview-Reference.md`

### Reset endpoint (added post-Chat 21)
- `backend/src/services/alert.service.ts` — added `resetSystem()` function
- `backend/src/controllers/alert.controller.ts` — added `reset` handler, added `resetSystem` to import
- `backend/src/routes/alert.routes.ts` — `POST /api/alert/reset` registered (SUPER_ADMIN only)

---

## Live URLs
| Service | URL |
|---|---|
| Backend API | https://rema-medical-logistics.onrender.com |
| Swagger docs | https://rema-medical-logistics.onrender.com/api/docs |
| Frontend | https://rema-system.vercel.app |
| Database | Supabase PostgreSQL — rema-medical-logistics (Singapore) |

---

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

---

## Final Submission Checklist
- [x] Git tag v1.0.0 applied
- [x] All 4 submission documents in `docs/submission/`
- [x] README.md updated with rema-system.vercel.app URL
- [x] 113 unit tests passing
- [x] Frontend loads at Vercel URL
- [x] Swagger UI loads with all endpoints documented
- [x] AI Brief button visible for coordinator@rema.vn
- [x] UptimeRobot keeping backend warm
- [x] POST /api/alert/reset working for admin@rema.vn

---

## Key Decisions Log (Full Project)

| Chat | Decision | Choice |
|---|---|---|
| 1 | Core architecture | 3-layer: Central Warehouse → Sub-Warehouses → Last Mile |
| 1 | EMK types | 3: General / Vulnerable / Chronic Illness |
| 1 | Activation trigger | 2 of 3 conditions — locked, no manual override |
| 1 | EMK-3 cold chain | MoH cold storage only — never at sub-warehouses |
| 1 | Scoring system | 20-point, 5-category, paper form, auditable |
| 1 | Cost model | $0.95/person/year, 3-bucket architecture |
| 2–7 | Backend | Node.js + TypeScript + Express + Prisma + PostgreSQL |
| 7.6 | Frontend architecture | Single unified React app (Option A), one Vercel deployment |
| 8–14 | Frontend | React + Vite + TypeScript + Tailwind CSS |
| 15–17 | Static visuals | draw.io (V3, V5) + ReportLab PDF (V6) |
| 18 | Test scope | Backend utility functions only — no Prisma, no HTTP |
| 18 | Scarcity boundary | isInScarcity uses strict < 0.3 — exactly 30% is NOT scarce |
| 19 | CI/CD | GitHub Actions: test on PR, deploy to Render on main |
| 20 | AI feature | Mock service, no API key required, reads real DB, advisory only |
| 20 | Advisory banner | Red banner always rendered — not dismissable |
| 21 | Submission package | 4 documents: Executive Summary, Master Strategy, Demo Guide, Slide Outline |
| 21 | Frontend URL | rema-system.vercel.app (renamed from rema-frontend-delta) |
| 21 | Reset endpoint | POST /api/alert/reset — SUPER_ADMIN only, resets phase to 0, clears all triggers, invalidates cache |
| 21 | Phase direction | Phase advances forward only (0→1→2) via frontend; reset is the only way back, SUPER_ADMIN only |