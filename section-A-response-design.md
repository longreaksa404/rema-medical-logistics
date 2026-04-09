# Section A — Response Design

## A.1 What This Section Answers

- What does REMA do **before the flood** (Phase 0)?
- What does REMA do in the **first 24 hours** (Phase 1)?
- What changes in the **next 24–48 hours** (Phase 2)?
- What decisions are made first, and **by whom**?

---

## A.0 — Phase 0: Preparedness (Before the Flood)

> Without Phase 0, Phase 1 is impossible. You cannot pre-position supplies that don't exist. You cannot activate sub-warehouses that were never identified. You cannot call volunteers who were never trained.

This phase happens during **non-emergency periods** — weeks and months before any flood event.

### What Must Exist Before Hour 0

| Preparedness Task | Responsible | Timing |
|---|---|---|
| Sub-warehouse sites identified, inspected, and agreed with site owners | Emergency Coordinator + Local Authorities | Annual dry-season review |
| Agreements signed with boat owners, transport partners, community leaders | Red Cross Partnerships Officer | Renewed annually |
| Emergency Medical Kits (EMKs) assembled and stored in central warehouse | Warehouse Manager | Restocked after each flood season |
| Volunteer teams recruited, trained, and assigned to districts | Hub Managers | Training every 6 months |
| Community vulnerability maps updated (elderly, pregnant, disabled, chronically ill) | Volunteers + Ward Health Workers | Updated annually |
| Paper forms and printed manifests pre-printed and stored at each sub-warehouse | Hub Managers | Before each flood season |
| Radio equipment tested and channels agreed | Operations Center | Monthly test |
| Flood warning monitoring protocol active | Emergency Coordinator | Continuous (automated alert subscription) |

### The Trigger Watch Period

When flood season begins (May–November in southern Vietnam), REMA enters **passive monitoring mode**:

- Emergency Coordinator subscribes to VNHMDS automated alerts
- Warehouse team checks stock — are EMKs at minimum threshold?
- Sub-warehouse managers do a site check — are locations accessible and dry?
- Volunteer team leaders confirm contact lists are current

> **Assumption A-0:** REMA assumes a defined flood season exists and that preparedness activities are funded during the preceding dry season. If Red Cross has no dry-season preparedness budget, Phase 0 cannot happen — this is the single biggest organizational risk to the entire system.

---

## A.2 The Two-Phase Response Logic

| | Phase 1 (Hours 0–24) | Phase 2 (Hours 24–48) |
|---|---|---|
| **City condition** | Roads degrading, water rising | Roads partially cut off, water stabilizing |
| **Primary goal** | Activate, pre-position, assess | Deliver, adapt, sustain |
| **Data quality** | Very low — incomplete demand picture | Improving — volunteer reports coming in |
| **Decision style** | Protocol-driven (pre-planned) | Judgment-driven (adaptive) |

---

## A.3 Phase 1 — Hours 0 to 24: Activate and Pre-Position

### Trigger Conditions

REMA Phase 1 activates when **any two** of the following are confirmed:

- City/provincial flood warning issued (Level 2 or above)
- Rainfall forecast exceeds 100mm in 24 hours
- Any target district reports street-level flooding

> **Assumption A-1:** VNHMDS provides 12–24 hour advance flood warnings with reasonable reliability for urban areas. This gives REMA a pre-flood activation window.

### Hour-by-Hour Actions

**Hours 0–3: Alert and Mobilize**
- Red Cross Operations Center receives trigger signal
- Emergency Coordinator activates REMA protocol (single decision-maker at this stage)
- All sub-warehouse managers notified via phone/SMS
- Volunteer team leaders in each district put on standby
- Central warehouse team begins pulling pre-packed EMKs

> **Assumption A-2:** Pre-packed EMKs exist in the central warehouse at all times, assembled during non-emergency periods.

**Hours 3–8: Load and Dispatch to Sub-Warehouses**
- Trucks loaded at central warehouse
- Convoy dispatched to all 3 sub-warehouse sites simultaneously
- Each sub-warehouse receives a base allocation calculated by district population size — not real-time demand (data doesn't exist yet)
- Sub-warehouse managers verify receipt and log inventory on printed manifest

> **Assumption A-3:** All 3 sub-warehouse sites are pre-identified, elevated, and accessible by truck during early-stage flooding (water <30cm at sub-warehouse location). Selection is done during Phase 0.

**Hours 8–16: Sub-Warehouses Receive Stock, Volunteers Deploy**
- Sub-warehouses now operational
- Volunteer teams dispatched on foot or motorbike
- Primary task: **rapid community assessment** — not delivery yet
- Volunteers use a simple 10-question paper form: household size, elderly/pregnant/disabled persons, chronic illness, current medication needs
- Forms returned to sub-warehouse coordinator every 4 hours

**Hours 16–24: First Demand Picture Assembled**
- Sub-warehouse coordinators compile volunteer assessment forms
- First demand estimates transmitted to Operations Center (WhatsApp voice note or SMS if internet is down)
- Operations Center updates REMA dashboard with district-level demand estimates
- Emergency Coordinator makes **reallocation decision**: does any sub-warehouse need more stock before roads close further?
- If yes → emergency resupply convoy dispatched before Hour 24

### Who Decides What in Phase 1

| Decision | Decision-Maker | Constraint |
|---|---|---|
| Activate REMA | Emergency Coordinator | Requires 2 of 3 triggers |
| Base stock allocation per sub-warehouse | Pre-set formula (population-based) | No discretion — protocol only |
| Volunteer deployment zones | Hub Manager | Based on pre-mapped ward boundaries |
| Emergency reallocation at Hour 16–24 | Emergency Coordinator | Based on first demand report |
| Route changes if road blocked | Hub Manager | Notify Operations Center within 1 hour |

---

## A.4 Phase 2 — Hours 24 to 48: Deliver, Adapt, Sustain

By Hour 24, roads in low-lying areas are likely impassable by truck. REMA now operates primarily from sub-warehouses outward using **last-mile modes**.

### Last-Mile Delivery Modes

| Water Depth | Delivery Mode |
|---|---|
| 0–30 cm | Motorbike with waterproof pannier bags |
| 30–60 cm | Cargo bicycle or wading volunteer with backpack |
| 60–80 cm | Small motorized boat or inflatable raft |
| >80 cm | Delivery suspended; emergency radio contact only |

> **Assumption A-4:** Each sub-warehouse has access to at least 2 small boats or rafts via pre-agreed agreement with local community partners (fishermen, boat owners). Arranged during Phase 0.

### Delivery Priority Order

1. **Critical medical cases** — life-sustaining medication needs (insulin, heart medication)
2. **High-vulnerability households** — elderly alone, pregnant women, infants, people with disabilities
3. **General households** — basic hygiene kits, ORS, wound care
4. **Community collection points** — for households capable of self-collection

### Adaptive Decisions in Phase 2

Hub Managers now have authority to:
- Redirect stock between delivery teams based on real-time volunteer reports
- Open an unplanned community collection point if a neighborhood is safely reachable but not on the original route
- Request emergency resupply from central warehouse (Operations Center approves within 2 hours)
- Suspend delivery to an area and escalate if volunteer safety risk is too high

> **Assumption A-5:** Volunteer safety is a hard constraint. If water exceeds 80cm, delivery is suspended and the area is escalated to local civil defense authorities for evacuation support.

---

## A.5 Decision Authority Map

```
OPERATIONS CENTER (Red Cross HQ)
│
│── Emergency Coordinator
│     Phase 1: All activation decisions
│     Phase 2: Resupply approvals, cross-district reallocation
│
└── 3× Hub Managers (one per district)
      Phase 1: Volunteer deployment, form collection
      Phase 2: Last-mile routing, adaptive delivery decisions
            │
            └── Volunteer Team Leaders (3–5 per hub)
                  Household assessment, direct delivery
                  Escalate safety issues to Hub Manager
```

---

## A.6 Information Flow

```
Volunteers → (paper forms every 4h) → Hub Manager
Hub Manager → (SMS/WhatsApp summary) → Operations Center
Operations Center → (dashboard update) → Emergency Coordinator
Emergency Coordinator → (resupply or reallocation order) → Hub Manager
```

**Manual backup:** If digital fails, paper forms are physically transported. If phone fails, pre-agreed radio check-ins at fixed hours (8am, 12pm, 4pm, 8pm).

---

## A.7 Key Decisions Summary

| Decision | Choice Made |
|---|---|
| Activation trigger | 2 of 3 conditions met |
| Phase 1 strategy | Protocol-driven pre-positioning using population-based formula |
| Phase 2 strategy | Judgment-driven adaptive last-mile delivery from sub-warehouses |
| First 8 hours priority | Dispatch to sub-warehouses, not direct delivery |
| Hours 8–16 priority | Community assessment before delivery |
| Last-mile modes | Motorbike / bicycle / boat tiered by water depth |
| Volunteer safety rule | Suspend delivery above 80cm, escalate to civil defense |
| Decision authority | Emergency Coordinator (strategic) + Hub Managers (operational) |
| Info flow backup | Radio check-ins at fixed hours if phone/internet fails |
