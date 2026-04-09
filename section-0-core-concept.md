# Section 0 — Core System Concept

## 0.1 System Name & Vision

**System Name: REMA (Rapid Emergency Medical Access)**

> *"Get the right supplies to the right people, through the right route, at the right time — even when the city stops working."*

REMA is the Viet Nam Red Cross's adaptive medical logistics framework for recurrent urban flood response. Designed to function under degraded infrastructure, incomplete data, and limited organizational capacity.

---

## 0.2 The Core Problem This System Solves

The challenge is not simply "flooding." It is a compounding urban breakdown:

| Layer | What Breaks |
|---|---|
| Physical | Roads flood, warehouses become inaccessible, drainage fails |
| Information | Demand data is delayed, patchy, or unreliable |
| Coordination | Multiple actors act without a shared picture |
| Time | The 24–48 hour window is when lives are most at risk |

---

## 0.3 System Architecture — The Three Layers

```
┌─────────────────────────────────────────────────────┐
│  LAYER 3 — LAST MILE                                │
│  Community delivery points, volunteer runners,      │
│  boat/motorbike teams in flooded neighborhoods      │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  LAYER 2 — SUB-WAREHOUSES (×3)                      │
│  One per affected district, set up inside existing  │
│  community buildings, stocked before floods peak    │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  LAYER 1 — CENTRAL WAREHOUSE                        │
│  Master stock, sourcing coordination,               │
│  dispatch decisions, data aggregation               │
└─────────────────────────────────────────────────────┘
```

**Why three layers?** When roads fail, a single central warehouse cannot reach every flooded alley. Pre-positioning supplies closer to at-risk areas — before flooding peaks — is the core logistics insight all other sections build from.

---

## 0.4 The Five Operating Principles

1. **Pre-position, don't react.** Supplies must be staged before roads close, not after.
2. **Vulnerability first.** Most medically vulnerable receive priority — with transparent, documented criteria.
3. **Redundancy over elegance.** If one route fails, a backup exists. If one tool fails, paper works.
4. **Technology serves people, not the reverse.** Digital tools augment volunteer judgment — they don't replace it.
5. **Every assumption is documented.** Judges and future Red Cross staff must be able to audit why decisions were made.

---

## 0.5 Scenario Parameters (Locked In)

| Parameter | Value |
|---|---|
| Affected zones | 3–4 urban low-lying districts |
| Flood duration | 5–7 days |
| Water depth | 30–80 cm |
| Response window | 24–48 hours (critical phase) |
| Org capacity | Limited (Red Cross): warehouse, transport, volunteers |
| Data quality | Incomplete, delayed, inconsistent |
| Budget | Limited — trade-offs are explicit |

---

## 0.6 Technology Stack

| Function | Tool |
|---|---|
| Demand collection | SMS / WhatsApp from ward volunteers |
| Route status updates | Volunteer radio + simple web form |
| Supply tracking | Google Sheets (master) + printed manifests (backup) |
| Prioritization scoring | Pre-printed triage forms + offline scoring app |
| Coordination dashboard | Lightweight web dashboard (designed in Section V1) |

All tools have a **manual paper fallback**. No function is solely dependent on internet connectivity.

---

## 0.7 Key Decisions Summary

| Decision | Choice Made |
|---|---|
| System name | REMA (Rapid Emergency Medical Access) |
| Core architecture | 3-layer: Central Warehouse → Sub-Warehouses → Last Mile |
| Fundamental strategy | Pre-positioning before flood peaks, not reactive dispatch |
| Technology philosophy | Minimal viable tech with full paper fallback |
| Number of affected zones | 3 districts (lower bound of scenario) |
| Critical response window | 24–48 hours |
