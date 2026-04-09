# Section 0 - Core System Concept

### **0.1. System name: REMA (Rapid Emergency Medical Access)**

### **0.2. System Architecture — The Three Layers**

```
┌─────────────────────────────────────────────────────┐
│  LAYER 3 — LAST MILE                                │
│  Community delivery points, volunteer runners,      │
│  boat/motorbike teams in flooded neighborhoods      │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  LAYER 2 — STAGING HUBS (Forward Bases)             │
│  3–4 pre-identified elevated staging sites          │
│  per affected district, stocked before floods hit   │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  LAYER 1 — CENTRAL WAREHOUSE                        │
│  Master stock, sourcing coordination,               │
│  dispatch decisions, data aggregation               │
└─────────────────────────────────────────────────────┘
```

### **0.3. The Five Operating Principles**

Every design decision across Sections A–F must respect these principles:

1. **Pre-position, don't react.** Supplies must be staged before roads close, not after.
2. **Vulnerability first.** When resources are scarce, the most medically vulnerable receive priority — with transparent, documented criteria.
3. **Redundancy over elegance.** If one route fails, a backup exists. If one tool fails, paper works. Simplicity is reliability.
4. **Technology serves people, not the reverse.** Digital tools (a lightweight dashboard, SMS reporting) augment volunteer judgment — they don't replace it.
5. **Every assumption is documented.** Judges and future Red Cross staff must be able to audit why decisions were made.

### 0.4. Scenario Parameters

These are fixed for all subsequent sections — nothing may contradict them:

| Parameter | Value |
| --- | --- |
| Affected zones | 3–4 urban low-lying districts |
| Flood duration | 5–7 days |
| Water depth | 30–80 cm |
| Response window | 24–48 hours (critical phase) |
| Org capacity | Limited (Red Cross): warehouse, transport, volunteers |
| Data quality | Incomplete, delayed, inconsistent |
| Budget | Limited — trade-offs are explicit |

### 0.5. Technology Stack

Tools chosen for low cost, offline resilience, and ease of training:

| Function | Tool |
| --- | --- |
| Demand collection | SMS / WhatsApp from ward volunteers |
| Route status updates | Volunteer radio + simple web form |
| Supply tracking | Google Sheets (master) + printed manifests (backup) |
| Prioritization scoring | Pre-printed triage forms + offline scoring app |
| Coordination dashboard | Lightweight web dashboard (designed in Section V1) |

All tools have a **manual paper fallback**. No function is solely dependent on internet connectivity.
