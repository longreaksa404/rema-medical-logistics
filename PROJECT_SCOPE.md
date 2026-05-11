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
| Scenario | Recurrent urban flood, 5–7 days, water depth 30–80cm, 3–4 affected districts |
| Critical window | 24–48 hours |

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
| Phase 1 | Hours 0–24 | Activate, pre-position stock at sub-warehouses, community assessment |
| Phase 2 | Hours 24–48 | Adaptive last-mile delivery from sub-warehouses |

**Activation trigger:** Any 2 of these 3 conditions met simultaneously:
1. City/provincial flood warning Level 2 or above
2. Rainfall forecast exceeds 100mm in 24 hours
3. Any target district reports street-level flooding

---

## 5. LAST-MILE DELIVERY TIERS

| Water Depth | Delivery Mode |
|---|---|
| 0–30 cm | Motorbike with waterproof pannier bags |
| 30–60 cm | Cargo bicycle or volunteer on foot with backpack |
| 60–80 cm | Small motorized boat or inflatable raft |
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
- 15–20 → 🔴 CRITICAL (deliver in current run)
- 10–14 → 🟠 HIGH (deliver same day)
- 5–9 → 🟡 MEDIUM (deliver within 48h)
- 0–4 → 🟢 STANDARD (community collection point)

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
- User changes password on first login via `PATCH /api/users/me/password`
- SUPER_ADMIN can reset any password via `POST /api/users/:id/reset-password`
- Departing staff: `PATCH /api/users/:id` with `active: false` — data preserved, login blocked. Never delete users.

---

## 8. DATABASE SCHEMA (Complete — 15 Tables)

### users
```
id, email, passwordHash, role, districtId (nullable), name, active, createdAt, updatedAt
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
GET    /api/auth/me
```

### User Management
```
GET    /api/users                         List all users (SUPER_ADMIN only)
POST   /api/users                         Create user with temporary password (SUPER_ADMIN only)
GET    /api/users/:id                     Single user detail (SUPER_ADMIN only)
PATCH  /api/users/:id                     Update name, email, role, district, active (SUPER_ADMIN only)
PATCH  /api/users/me/password             Change own password (any authenticated user)
POST   /api/users/:id/reset-password      Admin password reset (SUPER_ADMIN only)
```

### Flood Alert
```
POST   /api/alert/trigger
GET    /api/alert/status
PATCH  /api/alert/phase                   EMERGENCY_COORDINATOR+
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
GET    /api/route/recommend
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

### AI Brief (NEW — Chat 20)
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
| V0 | Auth | All | Login page, role-based redirect, change password on first login |
| V1 | Operations Dashboard | EC, SUPER_ADMIN, VIEWER | Phase banner, district cards, stock chart, priority queue, incidents, notifications, AI Brief button (EC + SUPER_ADMIN only) |
| V2 | Routing Map | EC, HUB_MANAGER | Leaflet map, district overlays, water depth input, delivery mode per zone |
| V3 | Warehouse Layout | All | Static draw.io diagram — central + sub-warehouse floor plans |
| V4 | Prioritization Tool | EC, HUB_MANAGER, VOLUNTEER | Assessment form, live scoring, score band result, priority table |
| V5 | Stakeholder Flowchart | All | Static draw.io swimlane diagram — actor decision flows |
| V6 | Operating Protocol | All | PDF document — activation checklist, radio script, delivery runsheet |
| V7 | Hub Manager Portal | HUB_MANAGER | Per-district: stock, volunteers, delivery runs, incidents, radio check-ins |
| V8 | Volunteer Mobile View | VOLUNTEER | Mobile-optimized: assessment form, delivery receipt, incident report |
| V9 | User Management | SUPER_ADMIN | Create users, deactivate users, reset passwords |

---

## 11. TECH STACK (LOCKED)

```
Backend:         Node.js + TypeScript + Express + Prisma + PostgreSQL
Auth:            JWT (jsonwebtoken) + bcrypt (cost factor 12 in production)
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
| Assumptions-log.md | 49 assumptions — new assumptions continue from #50 |

---

## 13. ENGINEERING QUALITY ADDITIONS

### 13.1 Unit Testing (Chat 18)

**Framework:** Jest + ts-jest
**Location:** `backend/src/utils/__tests__/`
**Scope:** Pure utility functions only — no database, no HTTP calls, no Prisma

These are the functions that implement REMA's locked rules. If they are wrong,
judges can verify against the strategy documents. Tests prove correctness.

| Test File | Functions Tested | What It Verifies |
|---|---|---|
| `scoring.test.ts` | `scoreHousehold(), assignBand(), recommendEmk(), validateScoreInput()`, All scoring rules — 59 tests |
| `stock.utils.test.ts` | `isInScarcity()` | 30% threshold, zero-total guard, real REMA values — 18 tests |
| `alert.test.ts` | `shouldActivate()` | All 8 boolean combinations — 13 tests |
| `route.test.ts` | `getDeliveryModeForDepth()` | All 4 tiers, all 3 boundaries — 23 tests |

**Run command:** `npm test` inside `backend/`

**What is NOT tested:**
- Controllers (require HTTP setup)
- Services (require database)
- Frontend components
- E2E flows

This is an honest scope. The utility functions contain all the critical business logic.
Controllers and services are integration-tested implicitly through the live Swagger UI.

---

### 13.2 CI/CD Pipeline — GitHub Actions (Chat 19)

**File:** `.github/workflows/ci.yml`
**Triggers:** Push to `main` branch, and any pull request

**Pipeline steps:**

```
On pull request:
  1. Checkout code
  2. Set up Node.js 20
  3. Install backend dependencies (npm ci)
  4. Run backend unit tests (npm test)
  → If tests fail: PR is blocked. No deploy.

On push to main (after PR merge):
  1. Checkout code
  2. Set up Node.js 20
  3. Install backend dependencies (npm ci)
  4. Run backend unit tests (npm test)
  5. Trigger Render deploy hook (HTTP POST to deploy hook URL)
  → Render rebuilds and redeploys backend automatically.
  → Vercel autodeploys frontend from GitHub — no extra step needed.
```

**GitHub repository secrets required:**

| Secret Name | Where to Get It | Set By |
|---|---|---|
| `RENDER_DEPLOY_HOOK_URL` | Render dashboard → your service → Settings → Deploy Hook | Manual — document in README |

**No database connection in CI.** Unit tests are pure functions.
No `DATABASE_URL` or `JWT_SECRET` needed in GitHub secrets.

**What CI does NOT do:**
- No Docker build (Render handles this)
- No staging environment
- No Vercel CLI step (Vercel GitHub integration handles autodeploy)
- No E2E tests

---

### 13.3 AI Integration — REMA AI Brief (Chat 20)

**Feature name:** REMA AI Brief
**Visible to:** EMERGENCY_COORDINATOR and SUPER_ADMIN only (on V1 Dashboard)
**SDK:** `@anthropic-ai/sdk` (server-side only — API key never exposed to browser)
**Model:** `claude-sonnet-4-20250514`

#### What it does

When the Emergency Coordinator clicks "Generate AI Brief," the system:

1. Backend reads current dashboard state from the database (same data as `GET /api/dashboard/summary`)
2. Builds a structured prompt using only aggregate, non-PII data:
   - Current phase (0/1/2)
   - Stock levels per district (EMK-1/2/3 remaining vs. total)
   - Number of households per priority band (CRITICAL/HIGH/MEDIUM/STANDARD)
   - Number of open incidents by type
   - Radio check-in compliance rate
   - Active delivery runs count
3. Calls the Anthropic API server-side
4. Returns a structured JSON response to the frontend

**API endpoint:**
```
POST   /api/ai/brief    EMERGENCY_COORDINATOR+    No request body required
```

**Response shape:**
```json
{
  "summary": "string — 2-3 sentence situation overview",
  "priorityAlert": "string — single most urgent issue right now",
  "nextStep": "string — one concrete action for the EC in the next hour",
  "generatedAt": "ISO timestamp",
  "dataSnapshot": {
    "phase": 1,
    "totalCritical": 12,
    "totalHigh": 34,
    "scarcityActive": false
  }
}
```

#### Hard constraints (from REMA Principle 4: Technology serves people, not the reverse)

| Constraint | Implementation |
|---|---|
| Advisory only | Frontend always shows "Advisory only — human decision required" label |
| No PII in prompt | Prompt uses aggregate counts only — no names, addresses, or household IDs |
| Cannot trigger actions | Endpoint is read-only — no write operations in this flow |
| Graceful degradation | If Anthropic API is unavailable, return HTTP 503 with clear message; frontend shows "AI Brief temporarily unavailable — use dashboard directly" |
| Transparent to user | Response includes `dataSnapshot` so EC can see exactly what data the AI used |

#### Frontend implementation (V1 Dashboard additions)

- "Generate AI Brief" button — visible only to EMERGENCY_COORDINATOR and SUPER_ADMIN
- Button shows loading spinner while API call is in progress (typically 2–5 seconds)
- Result displayed in a modal with three clearly labelled sections
- "Advisory only" notice in red at top of modal — always visible
- "Generated at [timestamp] from live dashboard data" shown at bottom
- Error state: if 503 returned, show fallback message without crashing

#### Environment variable

```
ANTHROPIC_API_KEY=sk-ant-...   # Added to Render environment variables only
                                # Never committed to repository
                                # Documented in backend/.env.example as placeholder
```

---

### 13.4 New Assumptions (from Sections 13.1–13.3)

These continue from assumption #49 in Assumptions-log.md:

| # | Section | Assumption | Reason |
|---|---|---|---|
| 50 | Chat 18 | Unit tests cover backend utility functions only — no integration or E2E tests | Pure function tests give highest confidence per effort; controllers and services are implicitly tested via live Swagger UI |
| 51 | Chat 19 | Vercel autodeploys frontend from the GitHub main branch — no explicit CI step needed | Vercel's native GitHub integration handles this; only Render requires an explicit deploy hook |
| 52 | Chat 19 | GitHub Actions CI uses Node.js 20 — matches Render's build environment | Version consistency prevents "works in CI, fails on Render" failures |
| 53 | Chat 20 | AI Brief prompt contains aggregate counts only — no household-level data, no addresses, no personal information | Humanitarian data protection principle; aggregate data is sufficient for an operational summary |
| 54 | Chat 20 | ANTHROPIC_API_KEY is stored as a Render environment variable only — never committed to the repository or exposed to the frontend browser bundle | Standard secret management; .env.example documents the key name with a placeholder value |
| 55 | Chat 20 | AI Brief feature is advisory only and cannot trigger any database write or system state change | Matches REMA Operating Principle 4: technology augments human judgment, does not replace it |
| 56 | Chat 18 | route.utils.ts extracted as a pure utility file to allow unit testing of delivery mode logic without importing PrismaClient | route.service.ts imports Prisma at module level; pure test files cannot import it |