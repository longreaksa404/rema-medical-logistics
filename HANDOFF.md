# REMA Handoff Document
Last updated: Chat 22 complete — post-submission improvements

---

## Current Status

**Chat 22 complete.** All 6 fixes implemented and verified. Profile page with avatar added.

---

## What Was Completed in Chat 22

### Fix 1 — Per-zone route recommend endpoint
- `route.service.ts` — `recommendByDistrict()` returns per-zone array
- `route.controller.ts` — GET /api/route/recommend accepts `districtId` param
- `frontend/src/api/routes.ts` — `getRecommendByDistrict()`, `DistrictRecommendation` type
- `frontend/src/pages/RoutingPage.tsx` — reads real zone depths from API

### Fix 2 — Notification triggers
- `alert.service.ts` — notifies on activation + phase advance; emits `phase_changed`
- `stock.service.ts` — notifies on scarcity; emits `scarcity_triggered`
- `incident.service.ts` — notifies district hub on incident; emits `incident_reported`

### Fix 3 — mustChangePassword enforcement
- `schema.prisma` — `mustChangePassword Boolean @default(false)` added to User
- `user.service.ts` — set true on create, false on changeOwnPassword, true on resetUserPassword
- `auth.service.ts` — included in login response and getCurrentUser
- `AuthContext.tsx` — login() returns boolean (mustChangePassword value)
- `LoginPage.tsx` — redirects to /change-password when login returns true
- `ChangePasswordPage.tsx` — forced banner, no Cancel button when mustChangePassword

### Fix 4 — Zone geographic data from API
- `RoutingPage.tsx` — replaced hardcoded zone depths with `getRecommendByDistrict` fetch

### Fix 5 — WebSocket real-time alerts
- `app.ts` — socket.io Server + httpServer export + cookie-parser
- `index.ts` — httpServer.listen
- Services emit events on phase change, scarcity, incident
- `AuthContext.tsx` — socket.io-client connects on login, disconnects on logout
- `DashboardPage.tsx` — subscribes to 3 events, silent refetch

### Fix 6 — Refresh tokens
- `schema.prisma` — RefreshToken model added
- `auth.service.ts` — access 15m, refresh 7d, hash in DB
- `auth.controller.ts` — httpOnly cookie, POST /api/auth/refresh
- `auth.routes.ts` — POST /api/auth/refresh registered
- `frontend/src/api/client.ts` — withCredentials, refresh interceptor with queue
- Migrations: add_must_change_password, add_refresh_tokens, add_user_avatar

### User Profile Page
- `frontend/src/pages/ProfilePage.tsx` — NEW
- `frontend/src/components/Avatar.tsx` — NEW reusable component
- `schema.prisma` — `avatarBase64 String?` on User
- `user.service.ts` — `updateOwnAvatar()` with 50kb limit
- `user.controller.ts` — `updateAvatar` handler
- `user.routes.ts` — PATCH /api/users/me/avatar
- `auth.service.ts` — avatarBase64 in login response + getCurrentUser
- `AuthContext.tsx` — `updateAvatar()` updates state + localStorage
- `frontend/src/api/auth.ts` — `updateAvatar()`, `avatarBase64?` on UserProfile
- `App.tsx` — /profile route added
- `Sidebar.tsx` — clickable user card with Avatar component

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
| admin@rema.kh | SUPER_ADMIN | - |
| coordinator@rema.kh | EMERGENCY_COORDINATOR | - |
| hub1@rema.kh | HUB_MANAGER | Dangkao |
| hub2@rema.kh | HUB_MANAGER | Mean Chey |
| hub3@rema.kh | HUB_MANAGER | Pou Senchey |
| volunteer1@rema.kh | VOLUNTEER | Dangkao |
| viewer@rema.kh | VIEWER | - |

---

## Key Decisions Log (Chat 22 additions)

| Decision | Choice | Why |
|---|---|---|
| Refresh token storage | SHA-256 hash in DB, raw token in httpOnly cookie | Raw token never touches DB; cookie is XSS-safe |
| Access token expiry | 15 minutes | Short enough to limit stolen token window; refresh handles seamless renewal |
| Avatar storage | base64 in users table | No external service dependency; 128x128 JPEG stays under 25kb |
| mustChangePassword enforcement | Client-side redirect only | UX gate sufficient for demo; server-side enforcement optional for production |
| Profile page | /profile route inside AppShell, all roles | Centralises account management; sidebar user card is the entry point |
| Sidebar user card | Clickable card (avatar + name) → /profile | Clean UX pattern; no separate profile icon needed |
| Socket.io broadcast | All connected clients receive all events | Operational roles all need system-wide awareness |

---

## Prisma Migrations Applied (Chat 22)
1. `add_must_change_password` — Boolean field on users
2. `add_refresh_tokens` — RefreshToken model + User relation
3. `add_user_avatar` — avatarBase64 nullable String on users

## Git Commit
```bash
git add .
git commit -m "Chat 22 complete: per-zone routes, notifications, mustChangePassword, websocket, refresh tokens, profile page with avatar"
```