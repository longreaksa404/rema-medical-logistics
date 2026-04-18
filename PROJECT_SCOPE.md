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

---

## 8. DATABASE SCHEMA (Complete — 15 Tables)

### users
Stores system accounts for all roles.
```
id, email, passwordHash, role, districtId (nullable), name, active, createdAt, updatedAt
```

### districts
3 districts, each with one sub-warehouse.
```
id, name, population (estimated households), latitude, longitude, createdAt
```

### sub_warehouses
One per district. Tracks setup status and backup location.
```
id, districtId, name, address, latitude, longitude,
status (INACTIVE | ACTIVE | BACKUP_ACTIVATED),
isBackup, backupForId (nullable), capacitySqm, createdAt, updatedAt
```

### stock
EMK levels per sub-warehouse. EMK-3 tracked separately (MoH transfer only).
```
id, subWarehouseId,
emk1Total, emk1Remaining,
emk2Total, emk2Remaining,
emk3Total, emk3Remaining,
updatedAt
```

### stock_movements
Immutable audit log of every stock change.
```
id, subWarehouseId, emkType (EMK1|EMK2|EMK3),
movementType (DISPATCH|DELIVERY|REALLOCATION|ADJUSTMENT|MOH_TRANSFER),
quantity, reason, performedBy (userId), createdAt
```

### flood_alerts
Global activation state. One active record at a time.
```
id, warningLevelTwo (bool), rainfallExceeds100mm (bool), streetFloodingReport (bool),
activated (bool), activatedAt (nullable),
phase (0|1|2), createdAt, updatedAt
```

### households
Assessed households with vulnerability scores.
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
Raw assessment form submission per household (supports re-assessment).
```
id, householdId, submittedBy (volunteerId),
cat1Score, cat2Score, cat3Score, cat4Score, cat5Score,
totalScore, notes, createdAt
```

### volunteers
Volunteer roster per district.
```
id, districtId, name, phone, role (TEAM_LEADER|VOLUNTEER),
status (AVAILABLE|DEPLOYED|INACTIVE), createdAt, updatedAt
```

### volunteer_assignments
Assigns volunteers to zones and teams per activation.
```
id, volunteerId, subWarehouseId, zone, teamNumber,
alertId (flood_alerts.id), createdAt
```

### delivery_runs
Each delivery trip from a sub-warehouse.
```
id, subWarehouseId, teamNumber, zone,
departedAt, returnedAt (nullable),
status (IN_PROGRESS|COMPLETE|ABORTED),
leadVolunteerId, createdAt, updatedAt
```

### delivery_receipts
Per-household delivery confirmation.
```
id, deliveryRunId, householdId, emkType, quantity,
confirmedBy (volunteer signature/thumbprint noted),
deliveredAt, notes, createdAt
```

### routes
Current delivery mode recommendation per district zone.
```
id, districtId, zone, waterDepthCm,
deliveryMode (MOTORBIKE|BICYCLE_OR_FOOT|BOAT|SUSPENDED),
active (bool), updatedAt
```

### route_logs
History of all route status changes.
```
id, routeId, previousDepth, newDepth,
previousMode, newMode, reportedBy (userId), createdAt
```

### incidents
Reported incidents: safety issues, route blockages, scarcity triggers.
```
id, districtId, reportedBy (userId),
type (ROUTE_BLOCKED|VOLUNTEER_SAFETY|STOCK_SCARCITY|BUILDING_FLOODED|OTHER),
description, status (OPEN|ESCALATED|RESOLVED),
resolvedBy (userId nullable), resolvedAt (nullable),
createdAt, updatedAt
```

### radio_checkins
Scheduled 4x daily radio check-ins (08:00/12:00/16:00/20:00).
```
id, districtId, submittedBy (userId),
scheduledTime (08:00|12:00|16:00|20:00),
status (OK|ISSUE_REPORTED),
notes, createdAt
```

### notifications
System notifications pushed to users.
```
id, userId, type, message, read (bool), createdAt
```

---

## 9. COMPLETE API ENDPOINTS

### Auth
```
POST   /api/auth/login              Login, returns JWT
POST   /api/auth/logout             Invalidate token
GET    /api/auth/me                 Current user profile
```

### Flood Alert
```
POST   /api/alert/trigger           Submit trigger condition (2-of-3 auto-activate)
GET    /api/alert/status            Current activation state and phase
PATCH  /api/alert/phase             Advance phase 0→1→2 (EC only)
```

### Districts & Sub-Warehouses
```
GET    /api/districts               List all 3 districts
GET    /api/districts/:id           Single district with sub-warehouse info
GET    /api/districts/:id/summary   District overview (stock + households + volunteers)
```

### Stock Management
```
GET    /api/stock/status            Stock levels across all sub-warehouses
GET    /api/stock/:districtId       Stock for one district
POST   /api/stock/dispatch          Record dispatch from central warehouse
POST   /api/stock/reallocate        Cross-district reallocation (EC only)
POST   /api/stock/adjust            Manual adjustment with reason (Hub Manager)
GET    /api/stock/movements         Full audit log of all stock changes
GET    /api/stock/movements/:districtId  Audit log for one district
```

### Households & Scoring
```
POST   /api/score/household         Score a household (20-point engine)
GET    /api/households              List households (filter by district, band)
GET    /api/households/:id          Single household detail
POST   /api/households              Create household record
PATCH  /api/households/:id          Update household (triggers re-score)
GET    /api/households/priority-queue  Sorted delivery priority list by district
```

### Delivery
```
POST   /api/delivery/runs           Start a delivery run
GET    /api/delivery/runs           List all delivery runs
GET    /api/delivery/runs/:id       Single run with all receipts
POST   /api/delivery/receipts       Record per-household delivery confirmation
PATCH  /api/delivery/runs/:id/complete  Mark run complete
```

### Routing
```
GET    /api/route/recommend         Delivery mode by water depth per zone
POST   /api/route/update            Update water depth for a zone
GET    /api/route/logs              Route status change history
```

### Volunteers
```
GET    /api/volunteers              List all volunteers (filter by district)
POST   /api/volunteers              Add volunteer to roster
PATCH  /api/volunteers/:id          Update volunteer info or status
POST   /api/volunteers/assign       Assign volunteer to zone/team
GET    /api/volunteers/:districtId/roster  Full roster for a district
```

### Incidents
```
POST   /api/incidents               Report an incident
GET    /api/incidents               List incidents (filter by district, type, status)
PATCH  /api/incidents/:id/resolve   Mark incident resolved
```

### Radio Check-ins
```
POST   /api/radio/checkin           Submit scheduled radio check-in
GET    /api/radio/checkins          List check-ins (filter by district, date)
```

### Notifications
```
GET    /api/notifications           Get notifications for current user
PATCH  /api/notifications/:id/read  Mark notification as read
```

### Dashboard
```
GET    /api/dashboard/summary       Aggregated view: phase + stock + households + alerts
GET    /api/dashboard/district/:id  Per-district summary card data
```

---

## 10. FRONTEND PAGES & VIEWS

| View | Name | Description |
|---|---|---|
| V0 | Auth | Login page, role-based redirect after login |
| V1 | Operations Dashboard | Phase banner, district cards, stock chart, priority queue, incidents, notifications |
| V2 | Routing Map | Leaflet map, district overlays, water depth input, delivery mode per zone |
| V3 | Warehouse Layout | Static draw.io diagram — central + sub-warehouse floor plans |
| V4 | Prioritization Tool | Assessment form, live scoring, score band result, priority table |
| V5 | Stakeholder Flowchart | Static draw.io swimlane diagram — actor decision flows |
| V6 | Operating Protocol | PDF document — activation checklist, radio script, delivery runsheet, incident log |
| V7 | Hub Manager Portal | Per-district: stock management, volunteer roster, delivery runs, incidents, radio check-ins |
| V8 | Volunteer Mobile View | Mobile-optimized: assessment form, delivery receipt, incident report |

---

## 11. TECH STACK (LOCKED)

```
Backend:        Node.js + TypeScript + Express + Prisma + PostgreSQL
Auth:           JWT (jsonwebtoken) + bcrypt
Frontend:       React (Vite) + TypeScript + Tailwind CSS + Recharts + Leaflet.js
Infrastructure: Docker + docker-compose
Hosting:        Render (backend) + Supabase (PostgreSQL) + Vercel (frontend)
API Docs:       Swagger (swagger-ui-express)
Static Diagrams: draw.io
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
| Assumptions-log.md | 48 assumptions — new assumptions continue from #49 |
