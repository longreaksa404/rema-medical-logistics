# REMA — Rapid Emergency Medical Access
## Master Strategy Document

**Challenge:** Medical Logistics in a Sinking City | University Track
**Organisation:** Viet Nam Red Cross
**System Name:** REMA (Rapid Emergency Medical Access)
**Vision:** Get the right supplies to the right people, through the right route, at the right time — even when the city stops working.

---

# SECTION 0 — CORE SYSTEM CONCEPT

## System Architecture

REMA uses a three-layer architecture designed around one insight: when roads fail, a central warehouse cannot reach every flooded alley. Pre-positioning supplies closer to at-risk areas — before flooding peaks — is the core logistics decision all other sections build from.

**Layer 1 — Central Warehouse:** Master stock, sourcing coordination, dispatch decisions, data aggregation. Permanent Red Cross facility above flood level. Holds 100% of pre-stock before Phase 1 activates.

**Layer 2 — Sub-Warehouses (×3):** One per affected district, set up inside existing community buildings (ward office, school, health station). Stocked Hours 3–8 before flooding peaks.

**Layer 3 — Last Mile:** Community delivery via volunteer teams on motorbike, bicycle, foot, or boat depending on water depth.

## Five Operating Principles

1. **Pre-position, don't react.** Supplies must be staged before roads close, not after.
2. **Vulnerability first.** Most medically vulnerable receive priority — with transparent, documented criteria.
3. **Redundancy over elegance.** If one route fails, a backup exists. If one tool fails, paper works.
4. **Technology serves people, not the reverse.** Digital tools augment volunteer judgment — they don't replace it.
5. **Every assumption is documented.** Judges and future Red Cross staff must be able to audit why decisions were made.

## Scenario Parameters

- Affected zones: 3 urban low-lying districts
- Flood duration: 5–7 days
- Water depth: 30–80cm
- Critical response window: 24–48 hours
- Organizational capacity: Limited (Red Cross warehouse, transport, volunteers)
- Data quality: Incomplete, delayed, inconsistent
- Budget: Limited — trade-offs are explicit

---

# SECTION A — RESPONSE DESIGN

## Phase 0 — Preparedness (Before the Flood)

REMA operates on a 12-month cycle. Phase 0 happens during dry season (December–April) and is the foundation that makes everything else possible.

**What must exist before Hour 0:**
- Sub-warehouse sites identified, inspected, and agreed with owners
- Agreements signed with boat owners, transport partners, community leaders
- EMKs assembled and stored in central warehouse
- Volunteer teams recruited, trained, and assigned to districts
- Community vulnerability maps updated (elderly, pregnant, disabled, chronically ill)
- Paper forms and printed manifests pre-printed at each sub-warehouse
- Radio equipment tested and channels agreed

**Activation trigger:** Any two of these three conditions met simultaneously:
1. City/provincial flood warning Level 2 or above
2. Rainfall forecast exceeds 100mm in 24 hours
3. Any target district reports street-level flooding

## Phase 1 — Hours 0–24: Activate and Pre-Position

**Hours 0–3:** Operations Center receives trigger. Emergency Coordinator activates. Sub-warehouse managers notified. Central warehouse begins pulling pre-packed EMKs.

**Hours 3–8:** Trucks loaded and dispatched to all 3 sub-warehouses simultaneously. Base allocation by district population (pre-set formula — no discretion). Sub-warehouse managers verify receipt on printed manifest.

**Hours 8–16:** Volunteers deploy on foot/motorbike for rapid community assessment — not delivery yet. 10-question paper form: household size, vulnerable persons, chronic illness, medication needs. Forms returned every 4 hours.

**Hours 16–24:** First demand picture assembled. Transmitted to Operations Center. Emergency Coordinator makes reallocation decision: does any sub-warehouse need more stock before roads close further?

## Phase 2 — Hours 24–48: Deliver, Adapt, Sustain

By Hour 24, roads in low-lying areas are likely impassable by truck. REMA operates primarily from sub-warehouses outward using last-mile modes.

**Last-mile delivery tiers:**
- Water 0–30cm → Motorbike with waterproof pannier bags
- Water 30–60cm → Cargo bicycle or wading volunteer with backpack
- Water 60–80cm → Small motorized boat or inflatable raft
- Water >80cm → Delivery suspended; emergency radio contact only

**Delivery priority order:**
1. Critical medical cases (life-sustaining medication needs)
2. High-vulnerability households (elderly alone, pregnant, infants, disabled)
3. General households
4. Community collection points (households capable of self-collection)

---

# SECTION B — LOGISTICS MODEL

## EMK Types

**EMK-1 — General Household Kit** (~5kg, ~$3.60/unit)
ORS sachets (20), water purification tablets (30), basic wound care, paracetamol (20 tablets), antihistamine (10 tablets), hygiene bag (soap, toothbrush, sanitary pads), printed health instruction card in Vietnamese.

**EMK-2 — Vulnerable Household Kit** (~7kg, ~$5.60/unit)
All EMK-1 items plus: infant oral rehydration formula (5 sachets), prenatal vitamins (14 tablets), adult incontinence pads (5), thermometer, blood pressure monitoring card, emergency contact card.

**EMK-3 — Chronic Illness Bridge Kit** (~2kg, ~$8.20/unit)
3-day supply of chronic illness medication (pre-agreed list with Ministry of Health), blood glucose test strips (10), sterile syringes for insulin users (5), referral card to nearest functioning health facility.

**Critical cold chain rule:** EMK-3 is NEVER pre-stored at sub-warehouses. Community buildings cannot maintain 2–8°C. EMK-3 is held at Ministry of Health district cold storage year-round and transferred in insulated cold boxes within 6 hours of REMA activation. Delivered from sub-warehouse within 12 hours of MoH transfer.

## Sourcing

Three-source model: Red Cross pre-stock (primary — EMK-1 and EMK-2), Ministry of Health emergency reserve (EMK-3 medications, activated within 6 hours), pre-agreed commercial suppliers (resupply after Hour 24 if pre-stock runs low).

## Storage

**Pre-event stock allocation:**

| Zone | Households | EMK-1 | EMK-2 | EMK-3 |
|---|---|---|---|---|
| District 1 | 8,000 | 6,000 | 1,500 | 500 |
| District 2 | 6,000 | 4,500 | 1,200 | 300 |
| District 3 | 7,000 | 5,200 | 1,400 | 400 |
| Central reserve (30%) | — | 4,710 | 1,230 | 360 |

**Storage standards:** All EMKs on raised pallets (minimum 30cm off floor), minimum 10cm gap from walls, covered from direct sunlight, ventilated. FEFO (First Expired, First Out) protocol with monthly checks.

## Contingency Plan

**Level 1 — Single route blocked:** Team leader reroutes using pre-printed alternate route. No approval needed.

**Level 2 — Entire zone inaccessible:** Hub Manager requests boat deployment. If no boat available, Operations Center transfers from another sub-warehouse. If transfer takes more than 4 hours, households contacted by phone and directed to nearest collection point.

**Level 3 — Sub-warehouse flooded:** Hub Manager activates backup sub-warehouse (pre-identified in Phase 0). Central warehouse dispatches emergency resupply to backup location.

---

# SECTION C — PRIORITIZATION FRAMEWORK

## Two-Level System

Level 1 (supply priority): EMK-3 first (life-sustaining medication), then EMK-2 (vulnerable households), then EMK-1 (general).

Level 2 (household priority): 20-point vulnerability score assigned during Hours 8–16 assessment.

## 20-Point Scoring System

| Category | Max Points |
|---|---|
| 1. Medical urgency (chronic illness + medication status) | 8 |
| 2. Household vulnerability (infant, pregnant, elderly 65+, disabled) | 5 |
| 3. Flood exposure (water depth at/in household) | 4 |
| 4. Self-sufficiency (food, water, sanitation access) | 2 |
| 5. Isolation (cut off from neighbors/communication) | 1 |

**Category 1 detail:** Life-sustaining medication run out or <24h remaining = 8 pts. Medication low (1–2 days) = 5 pts. Adequate = 2 pts. No chronic illness = 0 pts.

**Category 2 detail:** Infant under 2 = +2, Pregnant = +2, Elderly 65+ alone = +2, Disabled = +2. Capped at 5 regardless of combinations.

**Score bands:**
- 15–20 → Critical: deliver in current run
- 10–14 → High: deliver same day
- 5–9 → Medium: deliver within 48 hours
- 0–4 → Standard: community collection point

**Tiebreakers (applied in order):**
1. Higher Category 1 score wins
2. Infant under 6 months wins
3. First assessment form submitted wins

## Fairness Safeguards

- Written scores on physical forms — auditable by anyone
- Cross-ward volunteer assignment — reduces favoritism
- Community collection points always open regardless of score
- Household score challenge mechanism — Hub Manager reviews on request
- No permanent exclusion — Standard band = collection point, not no delivery

---

# SECTION D — COORDINATION MODEL

## Actor Groups

**Red Cross Operations Center:** System integrator. Activates REMA, monitors all sub-warehouses, approves cross-district reallocation, coordinates with MoH/civil defense, escalates when zones become inaccessible.

**Hub Managers (×3):** District operations. Receive and verify stock, deploy volunteers, compile assessment forms, make routing decisions, request resupply.

**Volunteer Team Leaders (3 per hub):** Lead teams of 3 volunteers on assessment and delivery runs. Complete household forms, collect signed receipts, report critical cases.

**Ward People's Committees:** Provide sub-warehouse site access, household registration data, loudspeaker announcements, road status information.

**District Civil Defense:** Evacuation support above 80cm, boat assets if Red Cross boats insufficient, road closure information.

**Volunteers (36 total):** REMA's operational core. 24 Red Cross trained + 12 community volunteers. Local knowledge is a logistics asset.

**Ward Health Stations:** Receive clinical referrals from volunteers, confirm medication needs in their ward, serve as secondary collection points if needed.

**Logistics Partners:** Contracted trucks (2-hour activation window, minimum 3 vehicles), community boat owners (daily rate during flood, 2 per sub-warehouse minimum), pharmacy distributors (emergency resupply within 12 hours).

## Communication Architecture

Primary: WhatsApp/SMS for all links
Backup: Radio at fixed check-in times — 08:00, 12:00, 16:00, 20:00

Information flows upward from volunteers (paper forms every 4h) → Hub Manager (SMS summary) → Operations Center (dashboard update) → Emergency Coordinator (decision) → Hub Manager (instruction) → Volunteers (updated list).

## Pre-Flood Agreements Required

8 agreements must be signed before flood season: sub-warehouse site access, household data sharing, emergency transport, boat access, emergency medication release (MoH), commercial resupply, radio frequency allocation, volunteer terms.

---

# SECTION E — SCALABILITY AND SUSTAINABILITY

## 12-Month Annual Cycle

REMA is not just a flood response — it is a year-round operational cycle.

**Post-flood (November–December):** After-action report, stock audit, receipt reconciliation, volunteer debrief.

**Dry season (December–April):** All MOUs renewed, sub-warehouse sites re-inspected, volunteer roster updated, EMK stock replenished, paper forms reprinted, radio tested, vulnerability maps updated.

**Flood season (May–November):** Passive monitoring mode, then activation.

## Standardization

11 templates in the REMA Standard Package: Sub-Warehouse Setup Checklist, Household Assessment Form, Delivery Receipt Form, Stock Ledger Template, Incident Log Template, Volunteer Briefing Script, Radio Check-In Script, Post-Flood Reconciliation Form, After-Action Report Template, MOU Template (Sub-Warehouse), MOU Template (Boat Owner).

All templates stored in three formats: printed hard copies at each sub-warehouse, shared Google Drive folder, USB drive at central warehouse.

## Scaling

Same architecture scales to 4–6 districts: add one sub-warehouse per district, scale volunteers proportionally (12 per sub-warehouse), pre-sign additional truck and boat contracts.

Coordination ceiling at 6 districts — beyond this, a second coordination tier (Zone Coordinator) is required. This is a deliberate design boundary, not a failure.

## Cost Philosophy

Own nothing you can borrow. Standardize everything you repeat. Digitize only what paper cannot do.

Sustainability limits acknowledged honestly: no dry-season budget = system fails; chronic volunteer attrition = organizational problem; MoH medication supply failure = policy problem above Red Cross authority.

---

# SECTION F — FINANCIAL PLAN

## Budget Architecture

**Bucket 1 — One-time setup:** $1,884 (radio handsets, storage containers, training, equipment)

**Bucket 2 — Annual preparedness:** ~$65,155 (EMK restocking dominates at 91%)
- Hub Manager stipends: $240
- Volunteer training (×2): $760
- EMK restocking (70% of full stock): $63,053
- Administrative and operational: $452 + contingency

**Bucket 3 — Per activation (7-day, 3-district):** ~$4,367
- Human resources (36 volunteers + 3 Hub Managers + OC staff): $2,142
- Transport Layer 1→2: $400
- Last-mile transport: $450
- Operational supplies + meals: $805 + contingency

## Full Cost Summary

| Year | Cost (USD) |
|---|---|
| Year 1 (setup + operations + activation) | ~$71,406 |
| Year 2+ (operations + activation) | ~$69,522 |
| 3-year total | ~$210,450 |
| Cost per beneficiary (full annual) | ~$0.95/person/year |

## Funding Strategy

| Source | What it covers |
|---|---|
| Red Cross provincial budget | Training, admin, Hub Manager stipends |
| Red Cross national grants | EMK restocking (primary application) |
| IFRC support | One-time setup costs |
| Ministry of Health co-funding | EMK-3 medication costs |
| Corporate CSR (Vietnamese) | Per-activation costs |
| Ward People's Committees (in-kind) | Sub-warehouse facility at no cost |

## Non-Negotiable Budget Lines

EMK-3 medication restocking, volunteer training, radio equipment maintenance, Hub Manager activation stipends.

---

# ASSUMPTIONS LOG SUMMARY

49 documented assumptions covering all strategic and operational decisions. Key assumptions:

- A-1: VNHMDS provides 12–24h advance warnings with reasonable reliability
- B-12: EMK-3 medications pre-approved by MoH for volunteer distribution during declared emergencies
- B-20: EMK-3 stored at MoH cold storage year-round — not at sub-warehouses
- C-3: Ward loudspeaker system exists for scarcity mode public announcements
- D-1: Ward People's Committees have pre-signed MOUs before flood season
- E-1: Red Cross allocates dry-season preparedness budget separate from flood response budget
- F-3: 70% EMK consumption rate per activation is the planning assumption
- F-7: EMK restocking requires MoH or national Red Cross co-funding

Full assumptions log available in `docs/Assumptions-log.md` (56 assumptions including engineering additions).

---

# ENGINEERING ADDITIONS (Chat 18–20)

## Unit Tests (113 tests)
Jest + ts-jest testing pure utility functions — the locked rules of REMA:
- scoring.test.ts: 59 tests verifying all 20-point scoring rules including Section C worked examples
- stock.utils.test.ts: 18 tests for scarcity threshold logic
- alert.test.ts: 13 tests for all 8 activation trigger combinations
- route.test.ts: 23 tests for all 4 delivery mode tiers and boundaries

## CI/CD Pipeline
GitHub Actions: tests gate every deployment. PRs blocked if tests fail. Render autodeploys on main merge only after tests pass.

## AI Brief
Emergency Coordinator dashboard feature. Reads aggregate database state, generates 3-part operational brief (Situation Summary, Priority Alert, Recommended Next Step). Advisory only — cannot trigger any system action. No PII in prompt. Graceful degradation to HTTP 503 if unavailable.