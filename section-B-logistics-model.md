# Section B — Logistics Model

## B.1 What This Section Answers

- Where do supplies come from? (Sourcing)
- How are they stored and staged? (Storage)
- How do they move through REMA's three layers? (Transport)
- How does last-mile delivery work in a flooded city? (Last-Mile)
- What happens when a route fails? (Contingency)

---

## B.2 What Goes Inside an EMK

REMA uses **three EMK types**, each targeting a different need:

### EMK-1 — General Household Kit
Target: Average household with no special medical needs  
Pack size: 1 box, ~5kg, fits in a backpack

| Item | Quantity |
|---|---|
| Oral Rehydration Salts (ORS) sachets | 20 sachets |
| Water purification tablets | 30 tablets |
| Basic wound care (bandages, antiseptic, gauze) | 1 set |
| Paracetamol (500mg) | 20 tablets |
| Antihistamine tablets | 10 tablets |
| Waterproof hygiene bag (soap, toothbrush, sanitary pads) | 1 set |
| Printed health instruction card (Vietnamese) | 1 card |

### EMK-2 — Vulnerable Household Kit
Target: Households with elderly, pregnant women, infants, or disabled persons  
Pack size: 1 box, ~7kg

| Item | Quantity |
|---|---|
| All items in EMK-1 | Full set |
| Infant oral rehydration formula | 5 sachets |
| Prenatal vitamins | 14 tablets |
| Adult incontinence pads | 5 pads |
| Thermometer | 1 |
| Blood pressure monitoring card + instructions | 1 set |
| Emergency contact card (nearest health facility, Red Cross hotline) | 1 card |

### EMK-3 — Chronic Illness Bridge Kit
Target: Households with a member who has lost access to regular medication  
Pack size: 1 small sealed bag, ~2kg

| Item | Quantity |
|---|---|
| 3-day supply of common chronic illness medication (pre-approved list) | 1 course |
| Blood glucose test strips | 10 strips |
| Sterile syringes (for insulin users) | 5 units |
| Referral card to nearest functioning health facility | 1 card |

> **Assumption B-1:** EMK-3 medication contents are pre-approved by Vietnam's Ministry of Health and are legally dispensable by trained Red Cross volunteers without a prescription during a declared emergency.

> **Assumption B-2:** EMK quantities are calculated for a 3-day supply per household. After 72 hours, either the flood recedes enough for normal supply chains to partially resume, or government health authorities take over extended medical support.

---

## B.3 Sourcing — Where Supplies Come From

REMA uses a **three-source model**:

| Source | What It Provides | When Used |
|---|---|---|
| Red Cross pre-stock | EMK-1 and EMK-2 items stored year-round in central warehouse | Primary source — used first |
| Ministry of Health emergency reserve | EMK-3 medications and medical equipment | Activated within 6 hours of Phase 1 trigger |
| Pre-agreed commercial suppliers (pharmacies, distributors) | Resupply of any item running low after Hour 24 | Backup — activated only if pre-stock is insufficient |

> **Assumption B-3:** A formal agreement exists between Viet Nam Red Cross and the Ministry of Health for emergency medication release during declared flood events.

> **Assumption B-4:** At least two commercial pharmacy distributors have pre-signed agreements with Red Cross to provide emergency resupply within 12 hours at pre-agreed prices.

### Stock Calculation (Pre-Event)

| Zone | Estimated Households | EMK-1 | EMK-2 | EMK-3 |
|---|---|---|---|---|
| District 1 (sub-warehouse 1) | 8,000 | 6,000 | 1,500 | 500 |
| District 2 (sub-warehouse 2) | 6,000 | 4,500 | 1,200 | 300 |
| District 3 (sub-warehouse 3) | 7,000 | 5,200 | 1,400 | 400 |
| **Central warehouse reserve (30%)** | — | 4,710 | 1,230 | 360 |

> **Assumption B-5:** District household counts estimated from Vietnam's General Statistics Office ward-level census data, adjusted by a 15% buffer for undercounting in informal settlements. EMK-2 covers ~20% of households and EMK-3 covers ~7% based on Vietnam's national chronic illness prevalence data.

---

## B.4 Storage — How Stock Is Held Across Three Layers

### Layer 1 — Central Warehouse

- Permanent Red Cross facility, located above flood level
- Holds 100% of pre-stock before Phase 1 activates
- Organized into pre-labeled dispatch pallets — one pallet per sub-warehouse, pre-sorted by EMK type
- Maintains 30% reserve after dispatching to sub-warehouses
- Managed by Warehouse Manager + 2 staff
- Storage requirement: approximately 200–250 square meters

> **Assumption B-6:** The central warehouse remains dry throughout a 5–7 day flood event with water levels up to 80cm. This is the single highest infrastructure risk and must be verified during Phase 0.

### Layer 2 — Sub-Warehouses (×3)

- Temporary setup inside existing community buildings (ward office, school, health station)
- Each requires approximately 40–60 square meters of dry floor space
- Stock laid out on raised pallets or tables — never directly on the floor
- Managed by one Hub Manager + one inventory volunteer
- Printed stock ledger maintained and updated every 4 hours

**Sub-warehouse setup checklist (Phase 1, Hours 3–8):**
1. Receive EMK pallets from central warehouse truck
2. Verify count against printed dispatch manifest
3. Separate EMK-1, EMK-2, EMK-3 into clearly labeled zones
4. Set up volunteer check-in table at entrance
5. Post printed district map with delivery zones on wall
6. Confirm radio/phone contact with Operations Center

### Layer 3 — Volunteer Carry Capacity (Last Mile)

| Delivery Mode | Carry Capacity | EMKs Per Trip |
|---|---|---|
| Volunteer on foot (backpack) | ~10kg | 2× EMK-1 or 1× EMK-2 |
| Motorbike with pannier bags | ~25kg | 5× EMK-1 or 3× EMK-2 |
| Cargo bicycle | ~20kg | 4× EMK-1 or 2× EMK-2 |
| Small motorized boat | ~150kg | 30× EMK-1 or 20× EMK-2 |

---

## B.5 Transport — Moving Stock Through the Three Layers

### Layer 1 → Layer 2 (Central Warehouse to Sub-Warehouses)

Mode: Truck convoy  
Timing: Phase 1, Hours 3–8 — must complete before roads deteriorate  
Route principle: Highest-elevation roads, not shortest routes

| Route Decision Rule | Reason |
|---|---|
| Avoid roads below 1.5m elevation | These flood first |
| Prefer concrete roads over asphalt | Asphalt degrades faster under flood pressure |
| Send convoy of 2+ trucks together | If one breaks down, the other completes delivery |
| Hub Manager confirms receipt within 30 minutes of arrival | Ensures no delivery is lost without record |

> **Assumption B-7:** Red Cross has access to at least 3 trucks (owned or contracted) for initial dispatch. If only 1–2 are available, sub-warehouses are stocked sequentially starting with the highest-risk district.

### Layer 2 → Layer 3 (Sub-Warehouse to Households)

Mode tiered by water depth:

```
Water 0–30cm   →   Motorbike
Water 30–60cm  →   Cargo bicycle or volunteer on foot
Water 60–80cm  →   Small motorized boat
Water >80cm    →   Delivery suspended, escalate to civil defense
```

**Delivery team structure per sub-warehouse:**
- 3 volunteer teams of 4 people each = 12 volunteers per sub-warehouse
- Each team assigned to one delivery zone (pre-mapped ward boundaries)
- Teams depart at fixed times: 7am, 11am, 3pm
- Return to sub-warehouse to restock and report between runs

---

## B.6 Last-Mile Delivery Model

### How a Delivery Run Works

```
1. Team Leader collects household list from Hub Manager
   (prioritized list from volunteer assessment forms — see Section C)

2. Team loads EMKs onto transport mode

3. Team follows pre-mapped route for their zone

4. At each household:
   - Confirm household identity (name + address on list)
   - Deliver correct EMK type (EMK-1, 2, or 3)
   - Household signs or thumbprints printed receipt
   - Volunteer notes any new critical cases not on the list

5. Return to sub-warehouse:
   - Submit signed receipts to Hub Manager
   - Report new critical cases verbally
   - Restock for next run if needed
```

### Community Collection Points

For neighborhoods where water is below 30cm and households are mobile, REMA sets up a fixed location where residents collect their EMK — conserving volunteer capacity for areas where door-to-door delivery is truly necessary.

> **Assumption B-8:** A household is considered capable of self-collection if no member falls into a high-vulnerability category AND water depth in their street is below 30cm.

---

## B.7 Contingency Plan — When Routes Fail

### Level 1 — Single Route Blocked

**Situation:** One delivery route within a zone is impassable.  
**Response:**
- Volunteer team reroutes using alternate path on their pre-printed zone map (all zone maps include 2 alternate routes)
- No approval needed — team leader decides on the spot
- Blockage reported to Hub Manager at next check-in

### Level 2 — Entire Zone Inaccessible

**Situation:** An entire delivery zone cannot be reached by any surface route.  
**Response:**
- Hub Manager requests boat deployment from sub-warehouse boat allocation
- If no boat available, Hub Manager contacts Operations Center to request boat transfer from another sub-warehouse
- If boat transfer takes more than 4 hours, affected households are contacted by phone and directed to nearest community collection point if safely possible
- Operations Center logs zone as "inaccessible" and escalates to local civil defense

### Level 3 — Sub-Warehouse Itself Inaccessible or Flooded

**Situation:** The sub-warehouse building floods or becomes unreachable.  
**Response:**
- Hub Manager activates **backup sub-warehouse location** — a second site pre-identified during Phase 0
- Central warehouse dispatches emergency resupply to backup location
- All volunteer teams in that district are notified of new pickup point via SMS or pre-agreed radio channel
- Operations Center updates dashboard to reflect new sub-warehouse location

> **Assumption B-9:** Each district has a pre-identified backup sub-warehouse location confirmed during Phase 0.

---

## B.8 Accountability and Transparency Controls

| Control | Mechanism |
|---|---|
| Every EMK dispatched is recorded | Printed manifest signed at central warehouse + sub-warehouse |
| Every household delivery is receipted | Signed or thumbprinted delivery receipt |
| Every stock movement is logged | Sub-warehouse ledger updated every 4 hours |
| Every route change or contingency activation is reported | Hub Manager logs in writing, Operations Center notified |
| End-of-day stock count | Hub Manager submits remaining inventory count each evening |
| Post-flood audit | All manifests, receipts, and ledgers collected and digitized within 7 days of flood end |

---

## B.9 Key Decisions Summary

| Decision | Choice Made |
|---|---|
| EMK types | Three types: General (EMK-1), Vulnerable (EMK-2), Chronic Illness (EMK-3) |
| Sourcing model | Three sources: Red Cross pre-stock (primary), Ministry of Health reserve, commercial backup |
| Central warehouse reserve | 30% held back after sub-warehouse dispatch |
| Sub-warehouse setup | Inside existing community buildings, 40–60sqm, raised pallets |
| Transport Layer 1→2 | Truck convoy, highest-elevation routes, Hours 3–8 |
| Transport Layer 2→3 | Tiered by water depth: motorbike / bicycle / boat |
| Delivery team structure | 3 teams × 4 volunteers per sub-warehouse, fixed departure times |
| Accountability | Printed manifests + signed household receipts + 4-hourly ledger updates |
| Contingency levels | Three levels: single route / full zone / sub-warehouse itself |
| Backup sub-warehouse | Pre-identified during Phase 0 for each district |
