# REMA Handoff Document
Last updated: Chat 7.6 complete

## Current Chat Goal
Chat 7.6 — User Management + Public Status (real deployment prep) — COMPLETE

---

## What Was Completed This Chat

### New files
- [x] `backend/src/services/user.service.ts` — full user lifecycle: create, list, get, update, changeOwnPassword, resetUserPassword, getPublicStatus
- [x] `backend/src/controllers/user.controller.ts` — controllers for all user management endpoints + publicStatus
- [x] `backend/src/routes/user.routes.ts` — routes with correct SUPER_ADMIN guards and /me/password ordering

### Modified files
- [x] `backend/src/app.ts` — added user routes + GET /api/status (public, no auth)
- [x] `backend/swagger.yaml` — added UserDetail, CreateUserRequest, PublicStatus schemas + all new paths

### Architecture decisions made this chat
1. **SUPER_ADMIN created via seed script only — never via API.** Deliberate security decision for real deployment. All other roles created by SUPER_ADMIN via POST /api/users.
2. **No public /register endpoint.** REMA is a closed user base — Red Cross staff only. Users are provisioned by SUPER_ADMIN.
3. **Deactivate, never delete.** Users who leave get `active: false`. All audit trail records preserved. This is enforced in updateUser().
4. **GET /api/status is public (no auth).** Returns only non-sensitive aggregate data: phase, activation state, district count, delivery count. Zero PII, zero household data.
5. **VIEWER role keeps auth required.** Dashboard shows sensitive humanitarian data (addresses, vulnerability scores, medication status). Even read-only observers must be named, credentialed accounts.
6. **Frontend architecture: Option A — Single unified React app, role-based rendering.** One codebase, one Vercel deployment. UI adapts based on JWT role after login.

---

## Files to Place in Repo

| File | Destination | Action |
|---|---|---|
| `user.service.ts` | `backend/src/services/user.service.ts` | NEW |
| `user.controller.ts` | `backend/src/controllers/user.controller.ts` | NEW |
| `user.routes.ts` | `backend/src/routes/user.routes.ts` | NEW |
| `app.ts` | `backend/src/app.ts` | REPLACE |
| `swagger.yaml` | `backend/swagger.yaml` | ADD new schemas + paths (see swagger-additions.yaml) |

---

## Complete Backend API — All Endpoints (as of Chat 7.6)

### Auth
```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

### System (public)
```
GET    /api/health           (no auth)
GET    /api/status           (no auth — aggregate data only)
```

### User Management
```
GET    /api/users                        SUPER_ADMIN only
POST   /api/users                        SUPER_ADMIN only
GET    /api/users/:id                    SUPER_ADMIN only
PATCH  /api/users/:id                    SUPER_ADMIN only
PATCH  /api/users/me/password            any authenticated user
POST   /api/users/:id/reset-password     SUPER_ADMIN only
```

### Flood Alert
```
POST   /api/alert/trigger
GET    /api/alert/status
PATCH  /api/alert/phase                  EMERGENCY_COORDINATOR+
```

### Scoring + Households
```
POST   /api/score/household
GET    /api/households
POST   /api/households
GET    /api/households/priority-queue
GET    /api/households/:id
PATCH  /api/households/:id
```

### Districts + Stock
```
GET    /api/districts
GET    /api/districts/:id
GET    /api/districts/:id/summary
GET    /api/stock/status
GET    /api/stock/movements
GET    /api/stock/movements/:districtId
POST   /api/stock/dispatch
POST   /api/stock/reallocate             EMERGENCY_COORDINATOR+
POST   /api/stock/adjust                 HUB_MANAGER+
GET    /api/stock/:districtId
```

### Delivery + Routing
```
GET    /api/delivery/runs
POST   /api/delivery/runs
GET    /api/delivery/runs/:id
POST   /api/delivery/receipts
PATCH  /api/delivery/runs/:id/complete
PATCH  /api/delivery/runs/:id/abort      HUB_MANAGER+
GET    /api/route/recommend
POST   /api/route/update
GET    /api/route/logs
GET    /api/route/district/:districtId
```

### Volunteers + Incidents + Radio
```
GET    /api/volunteers
POST   /api/volunteers                   HUB_MANAGER+
PATCH  /api/volunteers/:id               HUB_MANAGER+
POST   /api/volunteers/assign            HUB_MANAGER+
GET    /api/volunteers/:districtId/roster
POST   /api/incidents
GET    /api/incidents
PATCH  /api/incidents/:id/resolve
POST   /api/radio/checkin
GET    /api/radio/checkins
GET    /api/radio/compliance
```

### Notifications + Dashboard
```
GET    /api/notifications
PATCH  /api/notifications/read-all
PATCH  /api/notifications/:id/read
GET    /api/dashboard/summary
GET    /api/dashboard/district/:id
```

---

## What Is Next — Chat 8: Frontend Auth + Dashboard Setup

**Goal:** Login works. Single unified React app (Option A) running on Vercel, connected to Render backend.

### Steps
1. React project setup (Vite + TypeScript + Tailwind CSS) inside `frontend/`
2. Environment config (`.env` with Render backend URL)
3. API service layer (axios instance + JWT interceptor)
4. Auth context (store JWT, current user, role, logout)
5. Login page (V0) — form + error handling + role-based redirect
6. Protected route wrapper component
7. Role-based navigation sidebar (links differ by role)
8. Dashboard shell layout (header + sidebar + content area)
9. Phase status banner component (Phase 0/1/2 with color)
10. Change password page (any auth user — needed for first login after admin creates account)
11. User management page (SUPER_ADMIN only — create/deactivate users)
12. Deploy to Vercel
13. Add 30-second polling interval (useEffect + setInterval)
14. Manual refresh button for Operations Center users
15. "Last updated" timestamp on dashboard

### Key decisions for Chat 8
- Single app, role-based rendering (Option A — locked)
- React Router v6 for routing
- Axios with JWT interceptor in a shared `api/` service layer
- Auth state in React Context (not Redux — overkill for this project)
- Tailwind for all styling — no component library needed

---

## Live URLs
- Backend API: https://rema-medical-logistics.onrender.com
- Swagger docs: https://rema-medical-logistics.onrender.com/api/docs
- Frontend: not yet started
- Supabase DB: rema-medical-logistics (Singapore, ref: vkrtqhiymbbdgmtybjrm)

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