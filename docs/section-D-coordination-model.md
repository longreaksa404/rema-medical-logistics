# Section D — Coordination Model

## D.1 What This Section Answers

- Who are the actors in REMA's coordination network?
- What is each actor's specific role, and when do they act?
- How do actors communicate across the three phases?
- What happens when coordination breaks down?
- How are conflicts between actors resolved?

---

## D.2 Why Coordination Is Hard in This Context

REMA involves at least five distinct actor types — operating under degraded communications, time pressure, and no shared real-time picture. Three specific tensions arise:

**Authority vs. speed.** Waiting for formal approval from every level adds hours. But acting without coordination creates duplication, gaps, and accountability failures.

**Multiple actors, no single commander.** Red Cross is not a government authority. It cannot legally direct local officials, health facilities, or private logistics partners — it can only coordinate through pre-agreed protocols.

**Information asymmetry.** The Operations Center has the broad picture; Hub Managers have local truth. Volunteers on the ground know things no dashboard captures. The coordination model must push useful information in both directions.

---

## D.3 The Five Actor Groups

```
┌─────────────────────────────────────────────────────────────┐
│           REMA COORDINATION NETWORK                         │
│                                                             │
│  [Red Cross HQ]  ←→  [Local Authorities]                   │
│       │                      │                             │
│  [Hub Managers] ←→  [Health Facilities]                    │
│       │                                                     │
│  [Volunteers]   ←→  [Logistics Partners]                   │
└─────────────────────────────────────────────────────────────┘
```

---

## D.4 Actor 1 — Viet Nam Red Cross (Internal Structure)

Red Cross plays the **system integrator** role — it does not control all actors, but it owns the coordination architecture.

### D.4.1 Operations Center (Red Cross HQ)

**Who:** Emergency Coordinator + 2 Operations Staff
**Location:** Red Cross provincial HQ (above flood level)
**Active from:** Phase 0 trigger watch → end of flood

| Responsibility | How |
|---|---|
| Activate REMA when triggers are met | Emergency Coordinator issues activation order |
| Monitor overall stock levels across all sub-warehouses | REMA dashboard (Google Sheets + SMS updates) |
| Approve cross-district reallocation of stock | Emergency Coordinator decision, communicated by phone/radio |
| Approve emergency resupply requests from Hub Managers | Within 2-hour response window |
| Coordinate with external actors (MoH, civil defense, logistics partners) | Direct phone contact + pre-signed MOUs |
| Maintain consolidated situation report | Updated every 6 hours, shared with all actors |
| Escalate to civil defense when zones become inaccessible | If water exceeds 80cm in any zone |

### D.4.2 Hub Managers (×3, one per district)

**Who:** One experienced Red Cross staff member per district
**Location:** Sub-warehouse site
**Active from:** Phase 1 Hour 3 → end of flood

| Responsibility | How |
|---|---|
| Receive and verify stock from central warehouse | Printed manifest check, sign and report |
| Deploy and supervise volunteer teams | Pre-mapped zone assignments |
| Compile household assessment forms every 4 hours | Paper-based, summarized by SMS to Operations Center |
| Make real-time last-mile routing decisions | Authority granted by Emergency Coordinator |
| Request emergency resupply or boat transfer | Via Operations Center |
| Liaise with ward health worker in their district | Daily check-in at fixed times |
| Log all contingency decisions in writing | Sub-warehouse incident log |

### D.4.3 Volunteer Team Leaders (3–5 per hub)

**Who:** Trained Red Cross volunteers
**Location:** In the field, within their assigned zone
**Active from:** Phase 1 Hour 8 → end of deliveries

| Responsibility | How |
|---|---|
| Lead a team of 3–4 volunteers on assessment and delivery runs | Pre-assigned zone map |
| Complete household assessment forms | 10-question paper form, ~3 min per household |
| Deliver correct EMK type to prioritized households | Prioritized list from Hub Manager |
| Collect signed/thumbprinted delivery receipts | Paper form |
| Report new critical cases not on the list | Verbal report to Hub Manager on return |
| Escalate volunteer safety risk immediately | Direct call to Hub Manager — no delay |

---

## D.5 Actor 2 — Local Authorities

Local authorities provide **legitimacy, access, and ground-level intelligence** that Red Cross alone cannot obtain.

### D.5.1 Ward People's Committees (Ủy ban nhân dân phường)

**Who:** Ward-level government officials
**Role in REMA:** Community liaison and access facilitators

| What They Provide | When |
|---|---|
| Sub-warehouse site access (school, ward office, community hall) | Phase 0 — formal agreement signed |
| Household registration data for vulnerability mapping | Phase 0 — annual update |
| Loudspeaker announcements about collection points and delivery schedules | Phase 1 and Phase 2 |
| Resolution of community disputes over EMK distribution | On request from Hub Manager |
| Road and route status information | Phase 1 — morning and evening updates to Hub Manager |

> **Assumption D-1:** Ward People's Committees have formal pre-signed agreements with Red Cross for facility use and data sharing before flood season begins. Without this, sub-warehouse setup is legally and practically uncertain.

### D.5.2 District Civil Defense Forces (Lực lượng dân quân tự vệ)

**Who:** District-level emergency response units
**Role in REMA:** Escalation receiver when Red Cross capacity is exceeded

| What They Provide | When |
|---|---|
| Evacuation support when water exceeds 80cm | Triggered by Red Cross escalation |
| Boat assets for zones Red Cross cannot reach | Phase 2 — if Red Cross boats are insufficient |
| Security for collection points if crowd management is needed | On request |
| Information on road closures and bridge status | Ongoing during flood |

> **Assumption D-2:** District civil defense maintains radio contact with Red Cross Operations Center throughout the flood event, using agreed channel frequencies established in Phase 0.

---

## D.6 Actor 3 — Volunteers

Volunteers are REMA's **operational core** — the system physically cannot function without them. They are not support staff; they are the last-mile delivery network.

### Volunteer Structure

```
Hub Manager
    │
    ├── Team Leader A (zone 1) — 3 volunteers
    ├── Team Leader B (zone 2) — 3 volunteers
    └── Team Leader C (zone 3) — 3 volunteers

× 3 sub-warehouses = 36 volunteers total
```

### Volunteer Sourcing

| Source | Number | Notes |
|---|---|---|
| Red Cross trained volunteers (existing) | ~24 | Core team — trained every 6 months |
| Community volunteers (ward-recruited) | ~12 | Recruited in Phase 0, given 1-day orientation |

> **Assumption D-3:** 36 volunteers is the minimum viable number for 3-district simultaneous operations. Red Cross must maintain an active volunteer roster with 20% buffer (45 names) to account for unavailability during flood events.

### What Makes Volunteers Different from Staff

Volunteers are community members — they know local streets, speak the local dialect, and have existing trust relationships with households. This is a deliberate system design choice: **local knowledge is a logistics asset**, not just a nice-to-have. Cross-ward assignment (from Section C) balances this against favoritism risk.

### Volunteer Safety Protocol

| Condition | Protocol |
|---|---|
| Water rises above 60cm mid-run | Team Leader decides: complete current household, return to sub-warehouse |
| Water rises above 80cm | All delivery suspended immediately — volunteers return or shelter in place |
| Volunteer injured or missing | Team Leader calls Hub Manager immediately — Hub Manager calls civil defense |
| Volunteer refuses an assignment | Hub Manager reassigns — no discipline during emergency, debrief afterward |

---

## D.7 Actor 4 — Health Facilities

Health facilities provide **clinical backup** that volunteers and EMKs cannot replace. They are receivers of escalation, not active distributors in REMA's chain.

### D.7.1 Ward Health Stations (Trạm y tế phường)

**Who:** Local primary health facility, typically 2–5 staff
**Role:** Clinical triage and referral point for cases beyond EMK scope

| What They Do in REMA | When |
|---|---|
| Receive referrals from volunteers for cases requiring clinical assessment | Phase 1 and Phase 2 |
| Confirm which chronic illness medications are most urgently needed in their ward | Phase 0 and Phase 1 Hour 0–8 |
| Provide a health worker to support Phase 0 vulnerability mapping | Phase 0 |
| Serve as a secondary collection point if sub-warehouse is inaccessible | Phase 2 contingency |

> **Assumption D-4:** At least one ward health station per district remains operational (above flood level, staffed) throughout the 5–7 day flood event.

### D.7.2 District Hospital

**Who:** District-level hospital, higher clinical capacity
**Role:** Emergency escalation endpoint for severe cases

| What They Do in REMA | When |
|---|---|
| Receive patients escalated from ward health stations | As cases arise |
| Coordinate with MoH on emergency medication reserve activation | Phase 1 — if EMK-3 supply is critically low |
| Provide contact information for all referral cards included in EMK-3 kits | Phase 0 |

---

## D.8 Actor 5 — Logistics Partners

Logistics partners provide **transport and supply capacity** that Red Cross does not own and cannot afford to own year-round.

### D.8.1 Truck and Transport Contractors

**Role:** Layer 1 → Layer 2 transport (central warehouse to sub-warehouses)

| Agreement Type | Details |
|---|---|
| Pre-signed emergency contract | Fixed price per truck-trip, activated within 2 hours of Phase 1 trigger |
| Minimum fleet required | 3 trucks for simultaneous dispatch to all 3 sub-warehouses |
| Backup provision | Contractor must provide a second driver if primary is unavailable |

> **Assumption D-5:** At least one logistics contractor has a pre-signed emergency transport agreement with Red Cross, with guaranteed availability during declared flood events at a fixed rate.

### D.8.2 Boat Owners and Community Watercraft Operators

**Role:** Layer 2 → Layer 3 last-mile delivery in flooded zones

| Agreement Type | Details |
|---|---|
| Community agreement (informal MOU) | Boat owner provides boat + operator for up to 8 hours/day during flood |
| Compensation | Fixed daily rate, paid within 7 days of flood end |
| Minimum per district | 2 boats per sub-warehouse (6 total) |

> **Assumption D-6:** Boat owners in each district are identified and agreements are confirmed annually during Phase 0. Red Cross does not own boats — community asset agreements are the only viable model given budget constraints.

### D.8.3 Commercial Pharmacy Distributors

**Role:** Emergency resupply of EMK items if pre-stock is exhausted

| Agreement Type | Details |
|---|---|
| Pre-signed supply agreement | Fixed emergency price list; no negotiation during flood |
| Activation trigger | Hub Manager reports stock below 20% to Operations Center |
| Delivery window | Within 12 hours to central warehouse; Red Cross redistributes from there |

---

## D.9 Communication Architecture

### Primary Communication Channels

| Link | Primary Channel | Backup Channel |
|---|---|---|
| Operations Center ↔ Hub Manager | WhatsApp voice/text | Radio (fixed check-in times) |
| Hub Manager ↔ Volunteer Team Leader | Phone call / SMS | In-person at sub-warehouse |
| Operations Center ↔ Local Authorities | Phone | Pre-agreed radio channel |
| Operations Center ↔ MoH / Civil Defense | Phone | Official liaison contact (pre-registered) |
| Hub Manager ↔ Ward Health Station | Phone | In-person visit |

### Fixed Radio Check-In Schedule (when internet/phone fails)

| Time | Who Reports to Whom | Content |
|---|---|---|
| 08:00 | All Hub Managers → Operations Center | Stock levels, overnight incidents, morning plan |
| 12:00 | All Hub Managers → Operations Center | Delivery progress, new critical cases, route issues |
| 16:00 | All Hub Managers → Operations Center | Afternoon delivery summary, resupply needs |
| 20:00 | All Hub Managers → Operations Center | End-of-day stock count, next-day plan |

> **Assumption D-7:** Red Cross maintains at least 4 functioning handheld radios (one per sub-warehouse + one at Operations Center) with charged batteries and shared frequency pre-programmed before flood season.

### Information Aggregation Flow

```
Volunteers (paper forms, every 4h)
        ↓
Hub Manager (SMS/WhatsApp summary)
        ↓
Operations Center (REMA dashboard update)
        ↓
Emergency Coordinator (reallocation / resupply decision)
        ↓
Hub Manager (instruction by phone/radio)
        ↓
Volunteers (updated delivery list)
```

---

## D.10 Coordination Failure Protocols

### Failure 1 — Hub Manager Unreachable

**Trigger:** Operations Center cannot reach a Hub Manager for >2 hours

1. Operations Center calls the backup contact (a second-in-command volunteer at that sub-warehouse, pre-designated)
2. If still unreachable, Operations Center dispatches a staff member physically to the sub-warehouse
3. Hub Manager authority temporarily assumed by Emergency Coordinator until contact restored

### Failure 2 — Volunteer Team Does Not Return

**Trigger:** A volunteer team is >2 hours overdue from a delivery run

1. Hub Manager calls Team Leader — if no answer, calls individual volunteers
2. If no contact after 30 minutes, Hub Manager contacts civil defense and reports team location and last known route
3. Remaining volunteer teams do not deploy until situation is resolved

### Failure 3 — Local Authority Withdraws Access to Sub-Warehouse Site

**Trigger:** Ward official revokes access to community building mid-operation

1. Hub Manager contacts Operations Center immediately
2. Emergency Coordinator calls district-level authority (higher than ward) to resolve
3. Hub Manager activates backup sub-warehouse location (pre-identified in Phase 0)
4. Volunteers redirected to new location via SMS/phone

### Failure 4 — Logistics Partner Fails to Deliver

**Trigger:** Truck contractor does not arrive within agreed window

1. Operations Center contacts backup contractor (second pre-signed agreement)
2. If no backup available, Operations Center contacts civil defense for vehicle support
3. Sub-warehouses stocked sequentially by priority district if only 1–2 trucks available

---

## D.11 Pre-Flood Coordination Requirements (Phase 0)

All coordination depends on agreements made **before** the flood. This is the minimum set:

| Agreement | Parties | Form | Renewed |
|---|---|---|---|
| Sub-warehouse site access | Red Cross + Ward People's Committee | Signed MOU | Annually |
| Household data sharing | Red Cross + Ward People's Committee | Data agreement | Annually |
| Emergency transport | Red Cross + Logistics Contractor | Emergency contract | Annually |
| Boat access | Red Cross + Community boat owners | Informal MOU + daily rate | Annually |
| Emergency medication release | Red Cross + Ministry of Health | Formal agreement | As required by MoH policy |
| Commercial resupply | Red Cross + Pharmacy distributors | Supply agreement + price list | Annually |
| Radio frequency allocation | Red Cross + Civil Defense | Frequency agreement | Annually |
| Volunteer terms | Red Cross + Community volunteers | Volunteer registration form | Each flood season |

> **Assumption D-8:** Red Cross has a dedicated Partnerships Officer (or equivalent) responsible for maintaining and renewing all pre-flood agreements during dry season. If this role does not exist, Phase 0 coordination tasks fall to the Emergency Coordinator — creating an unacceptable workload concentration.

---

## D.12 Key Decisions Summary

| Decision | Choice Made |
|---|---|
| Coordination model | Pre-agreed protocol network, not command hierarchy |
| Red Cross role | System integrator — coordinates but does not command external actors |
| Local authority role | Site access + community liaison + escalation receiver |
| Volunteer role | Operational core — assessment and last-mile delivery |
| Health facility role | Clinical backup and escalation endpoint, not distributor |
| Logistics partner role | Transport and resupply capacity on pre-agreed contracts |
| Communication primary | WhatsApp / SMS |
| Communication backup | Radio at fixed check-in times (08:00, 12:00, 16:00, 20:00) |
| Coordination failure response | Pre-designated backup contacts + backup locations for all critical nodes |
| Pre-flood requirement | 8 formal/informal agreements must be in place before flood season |

---

## Section Summary

**Key Decisions:**
- Red Cross acts as system integrator, not commander — coordination through pre-agreed protocols and MOUs, not legal authority
- Five actor groups: Red Cross internal, local authorities, volunteers, health facilities, logistics partners
- All external actor relationships depend on Phase 0 agreements — 8 agreements must exist before flood season
- Communication: WhatsApp/SMS primary, radio at fixed check-ins (08:00/12:00/16:00/20:00) as fallback
- Volunteers are the operational core — 36 minimum across 3 districts
- Health facilities are escalation endpoints, not distributors
- Four explicit coordination failure protocols

**Visuals This Section Informs:**
- V5 — Stakeholder Flowchart (primary)
- V6 — Operating Protocol (radio schedule, failure protocols)
- V1 — Dashboard Mockup (information aggregation flow)
