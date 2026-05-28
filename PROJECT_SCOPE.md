# REMA — Project Scope
**Rapid Emergency Medical Access**
Challenge: Medical Logistics in a Sinking City | University Track | Viet Nam Red Cross

---

## 1. SYSTEM IDENTITY

| Field | Value |
|---|---|
| System name | REMA (Rapid Emergency Medical Access) |
| Vision | Get the right supplies to the right people, through the right route, at the right time — even when the city stops working |
| Target city | Ho Chi Minh City (or comparable Vietnamese delta city) |
| Organizer | Viet Nam Red Cross (supported by BSSC, RMIT, Innoex, HELP Logistics) |
| Track | University Track |
| Scenario | Recurrent urban flood, 5-7 days, water depth 30-80cm, 3-4 affected districts |
| Critical window | 24-48 hours |

---

## 2. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────┐
│  LAYER 3 — LAST MILE                                │
│  Volunteers on foot / motorbike / boat              │
│  Community collection points                        │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  LAYER 2 — SUB-WAREHOUSES (×3)                      │
│  One per affected district                          │
│  Set up inside existing community buildings         │
│  Stocked before floods peak                         │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  LAYER 1 — CENTRAL WAREHOUSE                        │
│  Master stock, sourcing coordination                │
│  Dispatch decisions, data aggregation               │
└─────────────────────────────────────────────────────┘
```

---

## 3. EMK TYPES

| Type | Target | Key Contents |
|---|---|---|
| EMK-1 | General household | ORS, water purification, wound care, paracetamol, hygiene kit |
| EMK-2 | Vulnerable household (elderly, pregnant, infant, disabled) | All EMK-1 + infant formula, prenatal vitamins, thermometer, BP card |
| EMK-3 | Chronic illness (lost access to medication) | 3-day medication supply, glucose strips, syringes, referral card |

**Critical rule:** EMK-3 is NEVER pre-stored at sub-warehouses. Held at Ministry of Health cold storage. Transferred only at flood activation.

---

## 4. RESPONSE PHASES

| Phase | Timing | Description |
|---|---|---|
| Phase 0 | Dry season (before flood) | Preparedness — identify sites, train volunteers, sign agreements, assemble EMKs |
| Phase 1 | Hours 0-24 | Activate, pre-position stock at sub-warehouses, community assessment |
| Phase 2 | Hours 24-48 | Adaptive last-mile delivery from sub-warehouses |

**Activation trigger:** Any 2 of these 3 conditions met simultaneously:
1. City/provincial flood warning Level 2 or above
2. Rainfall forecast exceeds 100mm in 24 hours
3. Any target district reports street-level flooding

---

## 5. LAST-MILE DELIVERY TIERS

| Water Depth | Delivery Mode |
|---|---|
| 0-30 cm | Motorbike with waterproof pannier bags |
| 30-60 cm | Cargo bicycle or volunteer on foot with backpack |
| 60-80 cm | Small motorized boat or inflatable raft |
| > 80 cm | Delivery suspended — escalate to civil defense |

---

## 6. PRIORITIZATION SCORING (Section C — LOCKED)

5 categories, maximum 20 points total:

| Category | Max Points |
|---|---|
| 1. Medical urgency (chronic illness + medication status) | 8 |
| 2. Household vulnerability (infant, pregnant, elderly, disabled) | 5 |
| 3. Flood exposure (water depth at household) | 4 |
| 4. Self-sufficiency (food, water, sanitation access) | 2 |
| 5. Isolation (cut off from neighbors/communication) | 1 |

Score bands:
- 15-20 → CRITICAL (deliver in current run)
- 10-14 → HIGH (deliver same day)
- 5-9 → MEDIUM (deliver within 48h)
- 0-4 → STANDARD (community collection point)

---

## 7. USER ROLES (RBAC)

| Role | Who | Key Permissions |
|---|---|---|
| `SUPER_ADMIN` | Red Cross HQ admin | Full access, user management, all districts |
| `EMERGENCY_COORDINATOR` | Operations Center lead | Activate REMA, approve resupply, cross-district reallocation, advance phases |
| `HUB_MANAGER` | One per district | Manage own district: stock, volunteers, deliveries, routes, incidents |
| `VOLUNTEER` | Field volunteers | Submit assessments, log deliveries, report incidents, radio check-ins |
| `VIEWER` | Read-only observers | View dashboards only — no write access |

**SUPER_ADMIN creation rule:** SUPER_ADMIN accounts are created via the seed script only — never via API. All other roles are created by SUPER_ADMIN via `POST /api/users`. This is a deliberate security decision for real deployment.

**No public registration.** REMA is a closed user base — Red Cross staff and named observers only. All accounts are provisioned by SUPER_ADMIN.

**User lifecycle:**
- SUPER_ADMIN creates users with a temporary password via `POST /api/users`
- New user is forced to change password on first login (`mustChangePassword: true`)
- User changes password via their Profile page (`PATCH /api/users/me/password`)
- SUPER_ADMIN can reset any password via `POST /api/users/:id/reset-password` — forces change on next login
- Departing staff: `PATCH /api/users/:id` with `active: false` — data preserved, login blocked. Never delete users.

---

## 8. DATABASE SCHEMA (Complete — 20 Tables)

### users
```
id, email, passwordHash, role, districtId (nullable), name, active,
mustChangePassword, avatarBase64 (nullable), createdAt, updatedAt
```

### districts
```
id, name, population, latitude, longitude, createdAt
```

### sub_warehouses
```
id, districtId, name, address, latitude, longitude,
status (INACTIVE | ACTIVE | BACKUP_ACTIVATED),
isBackup, backupForId (nullable), capacitySqm, createdAt, updatedAt
```

### stock
```
id, subWarehouseId,
emk1Total, emk1Remaining,
emk2Total, emk2Remaining,
emk3Total, emk3Remaining,
updatedAt
```

### stock_movements
```
id, subWarehouseId, emkType (EMK1|EMK2|EMK3),
movementType (DISPATCH|DELIVERY|REALLOCATION|ADJUSTMENT|MOH_TRANSFER),
quantity, reason, performedBy (userId), createdAt
```

### flood_alerts
```
id, warningLevelTwo (bool), rainfallExceeds100mm (bool), streetFloodingReport (bool),
activated (bool), activatedAt (nullable), phase (0|1|2), createdAt, updatedAt
```

### households
```
id, districtId, address,
medicalUrgencyScore, vulnerabilityScore, floodExposureScore,
selfSufficiencyScore, isolationScore, totalScore,
priorityBand (CRITICAL|HIGH|MEDIUM|STANDARD),
recommendedEmk (EMK1|EMK2|EMK3),
delivered (bool), deliveredAt (nullable),
assessedBy (volunteerId), createdAt, updatedAt
```

### household_assessments
```
id, householdId, submittedBy (volunteerId),
cat1Score, cat2Score, cat3Score, cat4Score, cat5Score,
totalScore, notes, createdAt
```

### volunteers
```
id, districtId, name, phone, role (TEAM_LEADER|VOLUNTEER),
status (AVAILABLE|DEPLOYED|INACTIVE), createdAt, updatedAt
```

### volunteer_assignments
```
id, volunteerId, subWarehouseId, zone, teamNumber,
alertId (flood_alerts.id), createdAt
```

### delivery_runs
```
id, subWarehouseId, teamNumber, zone,
departedAt, returnedAt (nullable),
status (IN_PROGRESS|COMPLETE|ABORTED),
leadVolunteerId, createdAt, updatedAt
```

### delivery_receipts
```
id, deliveryRunId, householdId, emkType, quantity,
deliveredAt, notes, createdAt
```

### routes
```
id, districtId, zone, waterDepthCm,
deliveryMode (MOTORBIKE|BICYCLE_OR_FOOT|BOAT|SUSPENDED),
active (bool), updatedAt
```

### route_logs
```
id, routeId, previousDepth, newDepth,
previousMode, newMode, reportedBy (userId), createdAt
```

### incidents
```
id, districtId, reportedBy (userId),
type (ROUTE_BLOCKED|VOLUNTEER_SAFETY|STOCK_SCARCITY|BUILDING_FLOODED|OTHER),
description, status (OPEN|ESCALATED|RESOLVED),
resolvedBy (userId nullable), resolvedAt (nullable),
createdAt, updatedAt
```

### radio_checkins
```
id, districtId, submittedBy (userId),
scheduledTime (T0800|T1200|T1600|T2000),
status (OK|ISSUE_REPORTED),
notes, createdAt
```

### notifications
```
id, userId, type, message, read (bool), createdAt
```

### refresh_tokens (NEW — Chat 22)
```
id, tokenHash (unique), userId, expiresAt, revoked (bool), createdAt
```

---

## 9. COMPLETE API ENDPOINTS

### System (no auth required)
```
GET    /api/health              Health check
GET    /api/status              Public status — aggregate data only, zero PII
```

### Auth
```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh        Issues new access token from httpOnly refresh cookie
GET    /api/auth/me
```

### User Management
```
GET    /api/users                         List all users (SUPER_ADMIN only)
POST   /api/users                         Create user with temporary password (SUPER_ADMIN only)
GET    /api/users/:id                     Single user detail (SUPER_ADMIN only)
PATCH  /api/users/:id                     Update name, email, role, district, active (SUPER_ADMIN only)
PATCH  /api/users/me/password             Change own password (any authenticated user)
PATCH  /api/users/me/avatar               Update own avatar — base64 image (any authenticated user)
POST   /api/users/:id/reset-password      Admin password reset (SUPER_ADMIN only)
```

### Flood Alert
```
POST   /api/alert/trigger
GET    /api/alert/status
PATCH  /api/alert/phase                   EMERGENCY_COORDINATOR+
POST   /api/alert/reset                   SUPER_ADMIN only — resets to Phase 0 standby
```

### Districts & Sub-Warehouses
```
GET    /api/districts
GET    /api/districts/:id
GET    /api/districts/:id/summary
```

### Stock Management
```
GET    /api/stock/status
GET    /api/stock/:districtId
POST   /api/stock/dispatch
POST   /api/stock/reallocate              EMERGENCY_COORDINATOR+
POST   /api/stock/adjust                  HUB_MANAGER+
GET    /api/stock/movements
GET    /api/stock/movements/:districtId
```

### Households & Scoring
```
POST   /api/score/household
GET    /api/households
POST   /api/households
GET    /api/households/priority-queue
GET    /api/households/:id
PATCH  /api/households/:id
```

### Delivery
```
POST   /api/delivery/runs
GET    /api/delivery/runs
GET    /api/delivery/runs/:id
POST   /api/delivery/receipts
PATCH  /api/delivery/runs/:id/complete
PATCH  /api/delivery/runs/:id/abort       HUB_MANAGER+
```

### Routing
```
GET    /api/route/recommend               With districtId: per-zone breakdown; with waterDepthCm: single-depth lookup
POST   /api/route/update
GET    /api/route/logs
GET    /api/route/district/:districtId
```

### Volunteers
```
GET    /api/volunteers
POST   /api/volunteers                    HUB_MANAGER+
PATCH  /api/volunteers/:id                HUB_MANAGER+
POST   /api/volunteers/assign             HUB_MANAGER+
GET    /api/volunteers/:districtId/roster
```

### Incidents
```
POST   /api/incidents
GET    /api/incidents
PATCH  /api/incidents/:id/resolve
```

### Radio Check-ins
```
POST   /api/radio/checkin
GET    /api/radio/checkins
GET    /api/radio/compliance
```

### Notifications
```
GET    /api/notifications
PATCH  /api/notifications/read-all
PATCH  /api/notifications/:id/read
```

### Dashboard
```
GET    /api/dashboard/summary
GET    /api/dashboard/district/:id
```

### AI Brief
```
POST   /api/ai/brief                      EMERGENCY_COORDINATOR+
```
Reads current dashboard state server-side. Returns operational summary, priority alert,
and recommended next step. No PII in prompt. Advisory output only — cannot trigger
any system action. Graceful degradation if Anthropic API is unavailable.

---

## 10. FRONTEND PAGES & VIEWS

**Architecture: Single unified React app (Option A). One Vercel deployment. UI adapts based on JWT role after login.**

| View | Name | Visible To | Description |
|---|---|---|---|
| V0 | Auth | All | Login page, role-based redirect, forced change password on first login |
| V1 | Operations Dashboard | EC, SUPER_ADMIN, VIEWER | Phase banner, phase controls, district cards, stock chart, priority queue, incidents, notifications, AI Brief button |
| V2 | Routing Map | EC, HUB_MANAGER | Leaflet map with 9 real zone polygons (3 per district), each colored by water depth. Zone polygons clipped from real OSM district boundaries using lat-band splitting. District identity via thick colored outer border + white district name label + zone letter markers. Per-zone depth sliders with save. District cards show zone list rows with real household data (assessed, delivered, pending, incidents). Route change log. |s
| V3 | Warehouse Layout | All | Static draw.io diagram — central + sub-warehouse floor plans |
| V4 | ~~Prioritization Tool~~ | Removed | Merged into VolunteerPage (assessment) and DashboardPage (priority queue) |
| V5 | Stakeholder Flowchart | All | Static draw.io swimlane diagram — actor decision flows |
| V6 | Operating Protocol | All | PDF document — activation checklist, radio script, delivery runsheet |
| V7 | Hub Manager Portal | HUB_MANAGER | Per-district: stock, volunteers, delivery runs, incidents, radio check-ins |
| V8 | Volunteer Mobile View | VOLUNTEER | Mobile-optimized: assessment form, delivery receipt, incident report |
| V9 | User Management | SUPER_ADMIN | Create users, deactivate users, reset passwords |
| V10 | Profile | All | Account info, avatar upload, change password |

---

## 11. TECH STACK (LOCKED)

```
Backend:         Node.js + TypeScript + Express + Prisma + PostgreSQL
Auth:            JWT access token (15m) + httpOnly refresh token (7d) + bcrypt
Realtime:        socket.io (server) + socket.io-client (frontend)
Frontend:        React (Vite) + TypeScript + Tailwind CSS + Recharts + Leaflet.js
Infrastructure:  Docker + docker-compose
Hosting:         Render (backend) + Supabase (PostgreSQL) + Vercel (frontend)
API Docs:        Swagger (swagger-ui-express)
Static Diagrams: draw.io
Testing:         Jest + ts-jest (backend unit tests only)
CI/CD:           GitHub Actions
AI:              Anthropic Claude API (@anthropic-ai/sdk) — server-side only
```

Do NOT use Railway — free tier is 30 days only.

---

## 12. STRATEGY SECTION FILES (in /docs folder)

| File | Contents |
|---|---|
| section-0-core-concept.md | System name, architecture, 5 operating principles |
| section-A-response-design.md | 3 phases, activation trigger, decision authority map, info flow |
| section-B-logistics-model.md | EMK contents, sourcing model, storage layers, transport, contingency, B.10 cold chain |
| section-C-prioritization-framework.md | 20-point scoring system, score bands, tiebreakers, fairness safeguards |
| section-D-coordination-model.md | Coordination structure, actor roles, communication protocols |
| section-E-scalability-sustainability.md | Scale-up model, sustainability mechanisms |
| section-F-financial-plan.md | Budget estimates, cost breakdown |
| Assumptions-log.md | 58 assumptions documented |

---

## 13. ENGINEERING QUALITY ADDITIONS

### 13.1 Unit Testing (Chat 18)

**Framework:** Jest + ts-jest
**Location:** `backend/src/utils/__tests__/`
**Scope:** Pure utility functions only — no database, no HTTP calls, no Prisma

| Test File | Functions Tested | What It Verifies |
|---|---|---|
| `scoring.test.ts` | `scoreHousehold(), assignBand(), recommendEmk(), validateScoreInput()` | All scoring rules — 59 tests |
| `stock.utils.test.ts` | `isInScarcity()` | 30% threshold, zero-total guard — 18 tests |
| `alert.test.ts` | `shouldActivate()` | All 8 boolean combinations — 13 tests |
| `route.test.ts` | `getDeliveryModeForDepth()` | All 4 tiers, all 3 boundaries — 23 tests |

**Run command:** `npm test` inside `backend/`

---

### 13.2 CI/CD Pipeline — GitHub Actions (Chat 19)

**File:** `.github/workflows/ci.yml`
**Triggers:** Push to `main` branch, and any pull request

```
On pull request:
  1. Checkout code
  2. Set up Node.js 20
  3. Install backend dependencies (npm ci)
  4. Run backend unit tests (npm test)
  → If tests fail: PR is blocked. No deploy.

On push to main (after PR merge):
  1-4. Same as above
  5. Trigger Render deploy hook
  → Render rebuilds backend. Vercel autodeploys frontend.
```

---

### 13.3 AI Integration — REMA AI Brief (Chat 20)

**Feature name:** REMA AI Brief
**Visible to:** EMERGENCY_COORDINATOR and SUPER_ADMIN only (on V1 Dashboard)
**SDK:** `@anthropic-ai/sdk` (server-side only)
**Implementation:** Mock service — reads real DB, generates contextually accurate brief.

**Response shape:**
```json
{
  "summary": "2-3 sentence situation overview",
  "priorityAlert": "single most urgent issue right now",
  "nextStep": "one concrete action for the EC in the next hour",
  "generatedAt": "ISO timestamp",
  "dataSnapshot": { "phase": 1, "totalCritical": 12, "scarcityActive": false }
}
```

**Hard constraints:** Advisory only, no PII in prompt, cannot trigger actions, graceful 503 degradation.

---

### 13.4 Post-Submission Engineering Improvements (Chat 22)

#### Security — Refresh Tokens
Short-lived access tokens (15m) plus revocable httpOnly refresh tokens (7d).
Refresh token hash stored in `refresh_tokens` table — raw token never in DB.
Auto-retry on 401 with parallel request queuing in axios interceptor.

#### Security — mustChangePassword
SUPER_ADMIN-created users are forced to change their temporary password on first login.
`mustChangePassword` flag in DB, returned in login response, enforced in frontend routing.
Admin password reset also sets flag — forces change on next login.

#### Realtime — WebSocket (socket.io)
Three events pushed to all connected clients instantly:
- `phase_changed` — on activation or phase advance
- `scarcity_triggered` — when any district stock falls below 30%
- `incident_reported` — on new incident creation
Dashboard refetches silently on any event. 30s polling remains as fallback.

#### Routing — Per-zone recommend endpoint
`GET /api/route/recommend?districtId=...` returns per-zone array instead of single district mode.
Frontend reads real zone depths from API on load; no hardcoded fallbacks.

#### Notifications — Automatic triggers
Phase change → notifies HUB_MANAGER + EC + SUPER_ADMIN.
Stock scarcity → notifies EC + SUPER_ADMIN.
Incident reported → notifies district HUB_MANAGER; escalated types also notify EC + SUPER_ADMIN.

#### User Profile Page (V10)
New `/profile` route accessible to all roles.
Shows account info (name, email, role, district).
Avatar upload: resized to 128x128 JPEG client-side, stored as base64 in DB.
Change password form moved here from standalone page.
Sidebar footer replaced with clickable user card (avatar + name) linking to profile.

---

### 13.5 Routing Map Improvements (Fix Session)

**Fix 1 - Per-zone recommend endpoint**
- `GET /api/route/recommend?districtId=` now returns per-zone array instead of single district mode
- Response: `{ districtId, districtName, zones: [{ zone, waterDepthCm, deliveryMode, active }] }`
- Old district-level mode collapse removed — operationally misleading

**Fix 2 - Notification triggers wired**
- `alert.service.ts` — creates notifications for all HUB_MANAGERs on phase advance
- `stock.service.ts` — creates notifications for EC and SUPER_ADMIN when scarcity triggers
- `incident.service.ts` — creates notification for relevant district HUB_MANAGER on incident report
- Notification system now writes on events, not just reads

**Fix 3 - mustChangePassword enforcement**
- `mustChangePassword Boolean` added to User model
- Set true on user creation via POST /api/users
- Login response includes flag; frontend redirects to change password page
- Navigation blocked until password changed

**Fix 4 - Zone geographic boundaries on map**
- Zone polygons computed by clipping real OSM district boundaries using Sutherland-Hodgman lat-band algorithm
- 9 zone polygons total: Dangkao A/B/C, Mean Chey A/B/C, Pou Senchey A/B/C
- Each zone polygon follows actual district boundary edges (not rectangles)
- Zone letter markers at computed centroids
- District name labels always white font
- Thin white dashed lines separate zones within same district
- Thick colored outer border per district (Dangkao=white, Mean Chey=blue, Pou Senchey=purple)

**Fix 5 - District card redesigned (Option 2 - minimal list)**
- Removed misleading average depth badge
- Each zone shown as its own row: icon / zone name / depth / mode label
- Suspended zones highlighted red with pulsing border
- Real household data from DistrictCard: assessed count, delivered, pending, open incidents
- Pending = householdsAssessed - deliveredCount (computed client-side, no extra API call)

### 13.6 New Assumptions (Chat 22)

| # | Assumption | Reason |
|---|---|---|
| 59 | Refresh tokens are stored as SHA-256 hashes — raw token never persisted | Standard security practice; hash is sufficient for lookup and revocation |
| 60 | Avatar images are resized to 128x128 JPEG client-side before upload — max ~25kb | Keeps DB row size manageable; Supabase free tier has row size limits |
| 61 | avatarBase64 stored directly in users table — no separate file storage service | Self-contained; no extra service dependency; acceptable for small team size |
| 62 | socket.io events are broadcast to all connected clients — no per-user or per-district filtering | All operational roles need awareness of system-wide events; filtering adds complexity without meaningful security benefit |
| 63 | mustChangePassword is enforced client-side only — no server middleware blocks API calls | API calls still work with old password; enforcement is a UX gate not a security gate. Real deployment could add server-side check if needed |
| 64 | Per-zone route recommend falls back to hardcoded defaults (15/25/45cm) only when no route records exist in DB | New deployments have no route records; fallback prevents blank map on first load |

### 13.7 Server-Side Pagination (Pagination Session)

All list endpoints that grow unbounded now paginate at the database layer.

| Endpoint | Strategy | Page Size |
|---|---|---|
| GET /api/stock/movements | Prisma skip/take + $transaction count | 20 |
| GET /api/stock/central/movements | Same | 20 |
| GET /api/households/priority-queue | Fetch all → in-memory sort → slice (Section C tiebreaker requires this) | 20 |
| GET /api/households | Prisma skip/take + $transaction count | 20 |
| GET /api/delivery/runs | Active runs always full; history paginated | 20 |
| GET /api/incidents | Open/escalated always full; resolved paginated | 20 |

Response shape for all paginated endpoints:
{ data, total, page, pageSize, totalPages }

Frontend: prev/next controls, placeholderData: keepPreviousData (no flash on page change), page resets on district/filter change.

Active delivery runs and open incidents are intentionally excluded from pagination — Hub Managers need full visibility of in-progress operations without navigation.