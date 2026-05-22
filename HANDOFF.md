# REMA Handoff Document
Last updated: Volunteer Sync Session

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

## What Was Completed in Fix Session (Routing Map UI)

### LeafletMap.tsx — zone polygon visual improvements
- Zone polygons now have thin white dashed divider lines between zones within same district
  (color: rgba(255,255,255,0.5), weight 1.5, dashArray 5/4)
- District name labels changed to always white font — removed per-district color from text
- Previous version had district color applied to both border AND text which made labels hard to read

### RoutingPage.tsx — DistrictSummaryCard redesign (Option 2 - minimal list)
- Removed misleading average depth number and district-level mode badge
- Each zone shown as its own row: mode icon / zone name / depth cm / mode label
- Suspended zone rows highlighted with red background + red border
- Pulsing red suspended count badge in card header if any zone > 80cm
- Real household data from DistrictCard (no extra API call):
  - householdsAssessed shown in header subtitle
  - deliveredCount shown green in footer
  - pending = householdsAssessed - deliveredCount shown yellow
  - openIncidents shown red, only visible if > 0

---

## What Was Completed — Volunteer Sync Session

### Volunteer-User link
- schema.prisma — userId String? @unique added to Volunteer; User gets volunteer back-relation
- Migration: add_volunteer_user_link
- user.service.ts — createUser with role VOLUNTEER now runs a $transaction creating both user + volunteer record; phone field required for VOLUNTEER role
- user.controller.ts — phone passed through from request body
- volunteer.service.ts — createVolunteer removed from exports; createCommunityVolunteer added for no-account field helpers; setVolunteerRole added for promote/demote
- volunteer.controller.ts — POST /api/volunteers now creates community volunteer only (no login); added PATCH /api/volunteers/:id/role handler
- volunteer.routes.ts — added PATCH /:id/role; POST / now maps to createCommunity
- hub.ts — removed createVolunteer; added createCommunityVolunteer and setVolunteerRole; Volunteer interface gets user field
- HubPage.tsx VolunteersTab — removed Add Volunteer form; added promote/demote button per roster row; info note explains volunteers come from user accounts; email shown under name; community volunteer label for no-account entries

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
| Zone divider lines | White dashed (not solid) inside district polygons | Dashes signal internal boundary; thick solid border remains the authoritative district edge |
| District name font | Always white regardless of district border color | Per-district colored text was hard to read against dark map background |
| District card design | Option 2 minimal list rows | Each zone is operationally independent — no district-level average makes sense |
| Household data source | Existing DistrictCard from dashboard summary | householdsAssessed + deliveredCount already available; no extra API call needed |
| Pending delivery calc | householdsAssessed - deliveredCount client-side | Simpler than adding a pendingDelivery field to DistrictCard |

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