# REMA — Presentation Slide Outline
## Suggested 10-Slide Structure (15 Minutes)

---

### Slide 1 — Title
**REMA: Rapid Emergency Medical Access**
Viet Nam Red Cross | Medical Logistics in a Sinking City
University Track

*Tagline: "Get the right supplies to the right people, through the right route, at the right time — even when the city stops working."*

---

### Slide 2 — The Real Problem (Not Just Flooding)

**Headline:** This is not a flood. It's an urban breakdown.

Four simultaneous failures:
- **Physical** — Roads flood, warehouses become inaccessible
- **Information** — Demand data is delayed, patchy, unreliable
- **Coordination** — Multiple actors with no shared picture
- **Time** — The 24–48 hour window is when lives are most at risk

*Key point: Reactive logistics fails here because by the time demand is confirmed, roads are already gone.*

---

### Slide 3 — The Core Insight

**Headline:** Pre-position before the flood peaks. Not after.

Visual: Simple timeline showing "Road open → Window closes → Road gone"
→ REMA stocks sub-warehouses in Hours 3–8, before roads deteriorate

Three-layer architecture diagram:
- Layer 1: Central Warehouse
- Layer 2: Sub-Warehouses ×3 (inside existing community buildings)
- Layer 3: Last Mile (motorbike / bicycle / boat)

---

### Slide 4 — What Gets Delivered and To Whom

**Headline:** Three kits for three real need profiles

| Kit | Target | Key contents | Cost |
|---|---|---|---|
| EMK-1 | General household | ORS, wound care, paracetamol, hygiene | $3.60 |
| EMK-2 | Vulnerable (elderly, pregnant, infant, disabled) | EMK-1 + infant formula, vitamins, thermometer | $5.60 |
| EMK-3 | Chronic illness (lost medication access) | 3-day medication supply — MoH cold chain only | $8.20 |

*EMK-3 cold chain rule: never pre-stored at sub-warehouses. Ministry of Health cold storage → transferred within 6 hours of activation.*

---

### Slide 5 — Who Gets Served First (Fairly)

**Headline:** 20-point vulnerability score, written on paper, auditable by anyone

Scoring categories:
1. Medical urgency (max 8 pts) — life-sustaining medication status
2. Household vulnerability (max 5 pts) — infant, pregnant, elderly, disabled
3. Flood exposure (max 4 pts) — water depth at/in household
4. Self-sufficiency (max 2 pts) — food, water, sanitation
5. Isolation (max 1 pt) — cut off from community

Score bands: Critical (15–20) → High (10–14) → Medium (5–9) → Standard (0–4)

*Fairness safeguards: cross-ward assignment, written scores, challenge mechanism, community collection always open*

---

### Slide 6 — Last-Mile Logistics in a Flooded City

**Headline:** Transport mode changes with water depth — automatically

Visual: Water depth ruler with delivery modes:
- 0–30cm: Motorbike
- 30–60cm: Bicycle or foot
- 60–80cm: Small motorized boat
- >80cm: Delivery suspended — volunteer safety hard limit

Delivery team structure: 3 teams × 4 people = 12 per sub-warehouse
Fixed departure times: 7am, 11am, 3pm
Fixed radio check-ins: 8am, 12pm, 4pm, 8pm

*All boat access via pre-signed community agreements — Red Cross doesn't own boats*

---

### Slide 7 — Coordination Model

**Headline:** Red Cross coordinates but cannot command — pre-agreed protocols solve this

Five actor groups:
- **Red Cross HQ (Operations Center):** System integrator, activation, cross-district decisions
- **Hub Managers (×3):** District operations, last-mile routing, volunteer management
- **Volunteers (36):** Assessment + last-mile delivery — local knowledge is a logistics asset
- **Local Authorities:** Site access, community liaison, escalation receiver
- **Logistics Partners:** Contracted trucks, community boats, pharmacy backup

*8 formal/informal agreements must exist before flood season — signed during dry-season Phase 0*

Fallback communications: WhatsApp/SMS primary → Radio at fixed check-in times

---

### Slide 8 — The Live System

**Headline:** REMA is a working operational platform — not a concept document

Screenshot: Operations Dashboard showing phase banner, district cards, stock chart, priority queue

| Component | What it does |
|---|---|
| Operations Dashboard (V1) | Real-time stock, priority queue, incidents, AI Brief |
| Routing Map (V2) | Leaflet map with water depth controls per zone |
| Prioritization Tool (V4) | Live scoring with EMK recommendation |
| Hub Manager Portal (V7) | Stock, volunteers, deliveries, incidents, radio |
| Volunteer Mobile View (V8) | Touch-optimized assessment + delivery + incident |

**AI Brief:** Emergency Coordinator gets a 3-part situation summary from live database data. Advisory only — cannot automate any decision.

**113 automated tests** verify the scoring engine, activation trigger, stock logic, and routing rules match the strategy documents exactly.

---

### Slide 9 — Sustainability and Cost

**Headline:** ~$0.95 per person per year. Designed for Viet Nam Red Cross capacity.

Cost architecture:
- Bucket 1 (one-time setup): ~$1,884
- Bucket 2 (annual preparedness): ~$65,155 — dominated by EMK restocking (91%)
- Bucket 3 (per activation): ~$4,367

3-year total: ~$210,450 | Cost per beneficiary: ~$0.95/person/year

*Why it stays low:*
- Borrow assets (buildings, boats, trucks) — pay per use
- Use existing Red Cross staff — no new permanent positions
- Paper-first technology — Google Sheets + WhatsApp + radio, not custom software

Sustainability: 12-month annual cycle, 11 standardized templates, Operations Manual with paper + digital + USB backup.

Scales to 6 districts with same architecture. Coordination ceiling at 6 = deliberate design limit.

---

### Slide 10 — What We Want Judges to Remember

**Headline:** Three things.

1. **Pre-position before roads close.** Every other decision follows from this.

2. **Vulnerability scoring that anyone can audit.** Written on paper. Challengeable by households. Fairness is not a slogan — it's a documented process.

3. **Technology that serves people, not the reverse.** Every digital function has a paper fallback. The AI Brief is advisory. The system works without internet.

*REMA is not the cheapest solution. It is the right solution — one the Viet Nam Red Cross can actually run, sustain, and repeat.*

---

## Speaker Notes — Timing Guide

| Slide | Time |
|---|---|
| 1 — Title | 30 sec |
| 2 — The real problem | 90 sec |
| 3 — Core insight + architecture | 90 sec |
| 4 — EMK types | 60 sec |
| 5 — Prioritization | 90 sec |
| 6 — Last-mile logistics | 90 sec |
| 7 — Coordination | 90 sec |
| 8 — Live system demo | 2 min (live demo if allowed) |
| 9 — Cost and sustainability | 60 sec |
| 10 — Closing | 30 sec |
| **Total** | **~13 min + 2 min Q&A buffer** |