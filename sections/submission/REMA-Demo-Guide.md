# REMA — Judge Demo Guide
## System Walkthrough: 9 Steps, ~15 Minutes

**Frontend:** https://rema-system.vercel.app
**Swagger API Docs:** https://rema-medical-logistics.onrender.com/api/docs

All test accounts use password: `rema1234`

> **Note on Render cold starts:** The backend is hosted on Render's free tier and may take 30–60 seconds to wake up on first request. If the frontend shows a loading state, wait one moment and refresh.

---

## Step 1 — Emergency Coordinator Login and Dashboard (V1)

**Login as:** `coordinator@rema.vn` / `rema1234`

After login you are redirected to the **Operations Dashboard (V1)**.

**What to look at:**
- **Phase banner** at the top — shows current system phase (0 = Standby, 1 = Active, 2 = Delivery). Phase drives what actions are available.
- **District cards** — shows EMK stock levels and scarcity status for each of the 3 districts
- **Stock chart** — Recharts bar chart showing EMK-1/2/3 remaining vs. total per district
- **Priority queue table** — households ranked by vulnerability band (Critical / High / Medium / Standard)
- **Active incidents panel** — open route blocks, safety issues, scarcity alerts
- **Notifications feed** — real-time activity log

**AI Brief button** (top-right of dashboard, visible to EC and SUPER_ADMIN only):
- Click "Generate AI Brief"
- Wait ~1.2 seconds (simulated delay — reads real database state)
- Modal opens with three sections: Situation Summary, Priority Alert, Recommended Next Step
- Red "Advisory only — human decision required" banner is always visible
- Data snapshot shows exactly what data the AI used (transparency)
- This demonstrates REMA Operating Principle 4: technology augments human judgment, it does not replace it

---

## Step 2 — Trigger a Flood Activation

Still logged in as `coordinator@rema.vn`.

Navigate to the **Routing Map (V2)** via the sidebar — or use Swagger directly:

**Via Swagger UI** (`/api/docs`):
1. Find `POST /api/alert/trigger`
2. Authenticate with the coordinator JWT (use POST /api/auth/login first)
3. Submit with body: `{ "warningLevelTwo": true, "rainfallExceeds100mm": true, "streetFloodingReport": false }`
4. System auto-activates Phase 1 (2 of 3 conditions met)
5. Return to dashboard — phase banner now shows Phase 1 in amber/orange

**What this demonstrates:**
- Activation requires exactly 2 of 3 objective triggers — no manual override by a single person
- This is a deliberate governance decision to prevent both false activations and delayed response

---

## Step 3 — Routing Map (V2)

**Navigate to:** Routing Map in the sidebar

**What to do:**
- Observe the Leaflet.js map with 3 district zone overlays
- Adjust the water depth slider for any district (try 65cm)
- Watch the delivery mode update: above 60cm triggers BOAT mode
- Try 85cm — zone shows SUSPENDED with a warning (volunteer safety rule)
- The map reads from `GET /api/route/recommend` and writes via `POST /api/route/update`

**What this demonstrates:**
- Last-mile mode tiers are locked: motorbike → bicycle/foot → boat → suspended
- The map is not decorative — it drives actual volunteer dispatch decisions
- Route change history panel shows all updates with timestamps and reporter

---

## Step 4 — Household Assessment and Live Scoring (V4)

**Navigate to:** Prioritization Tool in the sidebar

**What to do:**
1. Fill in the assessment form — try replicating Household F from the worked example:
   - Category 1: Chronic illness, medication low (1–2 days) → 5 pts
   - Category 2: Elderly person 65+ → 2 pts
   - Category 3: Water in street → 1 pt
   - Category 4: Partial access → 1 pt
   - Category 5: Isolated → 1 pt
   - Expected total: **10 pts → HIGH band → EMK-2 recommended**
2. Watch the score update live as you fill each field (frontend scoring engine mirrors backend)
3. Submit — household appears in the priority queue below

**What this demonstrates:**
- The 20-point scoring system from Section C is faithfully implemented
- Live scoring preview reduces API calls and gives instant feedback
- Backend validates on submit (server-side scoring is authoritative)
- 113 unit tests verify this logic — run `npm test` in `backend/` to confirm

**All 6 worked examples from Section C:**

| Household | Expected Score | Expected Band |
|---|---|---|
| A — elderly, alone, no medication | 8 | Medium |
| B — family with infant, water at doorstep | 6 | Medium |
| C — diabetic, ran out of insulin | 9 | Medium |
| D — pregnant, water inside household | 8 | Medium |
| E — no vulnerabilities, dry | 1 | Standard |
| F — elderly, hypertension, medication low | 10 | High |

---

## Step 5 — Hub Manager Portal (V7)

**Login as:** `hub1@rema.vn` / `rema1234`

**Navigate to:** Hub Manager Portal

This view is scoped to District 1 only — Hub Manager cannot see other districts.

**Five tabs to explore:**

**Stock tab:**
- Current EMK-1/2/3 levels with scarcity indicator (red if below 30%)
- Request emergency resupply form
- Manual stock adjustment with reason field
- Stock movements log (full audit trail — every change recorded)

**Volunteers tab:**
- District 1 roster
- Add volunteer form (name, phone, role: Team Leader or Volunteer)
- Assign volunteer to zone and team number

**Deliveries tab:**
- Start a new delivery run (assign team number and zone)
- Active runs list with departure time
- Mark run complete or abort

**Incidents tab:**
- Report a route block, safety issue, or stock scarcity
- Open incidents list with status (Open / Escalated / Resolved)
- Resolve button with resolution notes

**Radio tab:**
- Submit radio check-in for T0800, T1200, T1600, or T2000
- Status: OK or Issue Reported
- Check-in history for the district

---

## Step 6 — Volunteer Mobile View (V8)

**Login as:** `volunteer1@rema.vn` / `rema1234`

**Navigate to:** Volunteer View (redirected automatically after login)

This is a mobile-optimized layout (max-width 480px). Works well on a phone.

**Three screens via bottom navigation:**

**Assessment:** Same 5-category form as V4, but simplified layout for field use. Live score updates.

**Delivery:** List of households assigned for current run. Confirm delivery, record EMK type, submit receipt.

**Incident:** Quick report form — type, description, submit directly to hub.

**What this demonstrates:**
- Volunteers get a simplified, touch-friendly interface — the same data, less complexity
- All screens connect to the same backend — no separate data system for field workers

---

## Step 7 — User Management (V9)

**Login as:** `admin@rema.vn` / `rema1234`

**Navigate to:** User Management

**What to do:**
- View all active users with role and district
- Create a new user (try creating a HUB_MANAGER for District 2)
- Deactivate a user (data is preserved — login is blocked, audit trail intact)
- Reset a password

**What this demonstrates:**
- Closed user base — no public registration. All accounts provisioned by SUPER_ADMIN.
- User deactivation, never deletion — preserves accountability records
- SUPER_ADMIN accounts are created via seed script only, never via API

---

## Step 8 — Static Visuals

**Navigate to:** Warehouse Layout (V3) and Stakeholder Flowchart (V5) via the sidebar.

**V3 — Warehouse Layout:**
- Central warehouse floor plan (~200 sqm) with pre-labeled dispatch pallet zones
- Sub-warehouse floor plan (~50 sqm) with EMK-1/2/3 zones, check-in table, volunteer area
- Drawn in draw.io, exported as PNG

**V5 — Stakeholder Flowchart:**
- 6-lane swimlane diagram: Red Cross HQ / Hub Managers / Volunteers / Local Authorities / Health Facilities / Logistics Partners
- Phase 1 and Phase 2 flows with decision diamonds
- Shows all 8 pre-flood agreement types and their owners

---

## Step 9 — Operating Protocol (V6)

**Navigate to:** Operating Protocol (V6) via the sidebar — or open the PDF directly.

This is a print-ready 8-page A4 PDF designed for field use. It contains:
- Phase 1 activation checklist (Hours 0–24)
- Phase 2 delivery checklist (Hours 24–48)
- Radio check-in script (4 time slots, fixed format)
- Delivery runsheet template
- Incident log template
- Household assessment form with Vietnamese labels
- Volunteer briefing script outline

**What this demonstrates:**
- Every digital function has a paper equivalent — no single tool is in the critical path
- Hub Managers could run REMA with nothing but this PDF if all digital systems fail

---

## Swagger API Exploration

**URL:** https://rema-medical-logistics.onrender.com/api/docs

The Swagger UI documents all 50+ endpoints across 12 route groups:
- auth, users, alert, districts, stock, households, delivery, route, volunteers, incidents, radio, dashboard, ai

To authenticate in Swagger:
1. `POST /api/auth/login` with email/password → copy the JWT token from the response
2. Click "Authorize" at the top of the Swagger page → paste the token as `Bearer <token>`
3. All authenticated endpoints are now available

**Suggested Swagger demos:**
- `GET /api/status` — public status endpoint (no auth required, aggregate data only)
- `GET /api/dashboard/summary` — full operational picture
- `POST /api/score/household` — submit scoring inputs, see band and EMK recommendation
- `GET /api/stock/status` — all 3 districts stock levels with scarcity flags
- `GET /api/radio/compliance` — check-in compliance rates per district

---

## Running Tests Locally

```bash
cd backend
npm install
npm test
```

Expected output: 113 tests passing across 4 test files:
- `scoring.test.ts` — 59 tests (all 20-point scoring rules + Section C worked examples)
- `stock.utils.test.ts` — 18 tests (scarcity threshold logic)
- `alert.test.ts` — 13 tests (all 8 trigger combinations)
- `route.test.ts` — 23 tests (all 4 delivery mode tiers + boundaries)

---

## Summary: What REMA Proves

By the end of this walkthrough, judges will have seen:

1. A live operational system — not a mockup or prototype
2. The 20-point scoring engine working correctly against the worked examples from Section C
3. Delivery mode tiers enforcing the hard 80cm safety rule
4. Role-based access control separating EC, Hub Manager, Volunteer, and Viewer actions
5. An AI Brief that reads real database state and generates advisory summaries without automating decisions
6. Paper-equivalent backups for every digital function
7. A full audit trail — every stock movement, delivery receipt, and incident is recorded

REMA is a complete humanitarian logistics system, not a concept document.