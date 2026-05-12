# REMA — Rapid Emergency Medical Access
## Executive Summary

**Challenge:** Medical Logistics in a Sinking City | University Track
**Organisation:** Viet Nam Red Cross
**Submitted by:** Solo entrant (University Track)

---

## The Problem

Urban flooding in Vietnamese delta cities is not a simple supply problem — it is a compounding breakdown of roads, information, and coordination that happens faster than any reactive system can respond. By the time demand is confirmed, roads are already gone. By the time supplies are packed, sub-districts are already cut off.

REMA is built on one core insight: **you must pre-position supplies before flooding peaks, not after**.

---

## What REMA Does

REMA is a three-layer pre-positioned medical logistics system that delivers Emergency Medical Kits (EMKs) to the right households within 24–48 hours of a flood event, through water depths up to 80cm.

**Three-layer architecture:**
- **Layer 1 — Central Warehouse:** Master stock, 30% reserve, dispatch coordination
- **Layer 2 — Sub-Warehouses (×3):** Staged inside existing community buildings, stocked Hours 3–8 before flooding peaks
- **Layer 3 — Last Mile:** Motorbike (0–30cm) → bicycle/foot (30–60cm) → boat (60–80cm) → suspended above 80cm

**Three EMK types targeting three need profiles:**
- EMK-1 (General): ORS, wound care, paracetamol, hygiene — ~$3.60/unit
- EMK-2 (Vulnerable): All EMK-1 plus infant formula, prenatal vitamins, thermometer — ~$5.60/unit
- EMK-3 (Chronic Illness): 3-day medication bridge supply, glucose strips, syringes — ~$8.20/unit. **Never pre-stored at sub-warehouses** — held at Ministry of Health cold storage, transferred within 6 hours of activation.

**20-point vulnerability scoring** ranks every household across 5 categories: medical urgency (max 8 pts), household vulnerability (5 pts), flood exposure (4 pts), self-sufficiency (2 pts), isolation (1 pt). Scores are written on paper forms, auditable, and challengeable by households.

**Activation trigger:** Any 2 of 3 objective conditions — no single-person decision point.

---

## Why It Works

| Judging Criterion | REMA Response |
|---|---|
| Strategic understanding | Treats flooding as urban breakdown, not a delivery task — 3-layer architecture responds to road failure, not road availability |
| Logistics quality | Pre-packed EMKs, FEFO stock rotation, tiered delivery modes, 3-level contingency, cold chain separation |
| Practical feasibility | Uses existing buildings, community boats, contracted trucks — total annual cost ~$69,500 |
| Coordination & governance | Pre-signed MOUs with 8 actor types before flood season; radio fallback at fixed check-in times |
| Innovation with purpose | AI-powered operational brief for Emergency Coordinator; live scoring engine; routing map with water depth tiers — all with mandatory paper fallbacks |
| Humanitarian value | Vulnerability scoring with fairness safeguards; cross-ward volunteer assignment; score challenge mechanism; no permanent exclusion |

---

## Live System

REMA was built as a fully operational logistics platform — not a presentation deck.

| Component | URL |
|---|---|
| Frontend Application | https://rema-system.vercel.app |
| Backend API | https://rema-medical-logistics.onrender.com |
| API Documentation (Swagger) | https://rema-medical-logistics.onrender.com/api/docs |

**Tech stack:** Node.js + TypeScript + Express + PostgreSQL + React + Tailwind CSS  
**Scale:** 50+ API endpoints, 15 database tables, 9 frontend views, 5 user roles  
**Testing:** 113 automated unit tests across scoring engine, activation trigger, stock logic, and routing rules  
**CI/CD:** GitHub Actions — tests gate every deployment to production

---

## Cost

| Period | Cost (USD) |
|---|---|
| Year 1 (setup + operations + 1 activation) | ~$71,406 |
| Year 2+ (operations + 1 activation) | ~$69,522 |
| Cost per beneficiary per year | ~$0.95 |

EMK restocking dominates at 91% of annual cost — an honest reality of medical supply logistics. The system is designed to run sustainably on existing Red Cross staff with no new permanent positions.

---

## One Number

**~$0.95 per person per year** to deliver pre-positioned, vulnerability-scored emergency medical supplies to 73,500 people across 3 urban districts — through any water depth up to 80cm.