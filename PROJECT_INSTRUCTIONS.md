# REMA Project Instructions

## WHO I AM
I am a solo CSE/Software Development student from Cambodia (Phnom Penh)
with backend development experience and basic supply chain knowledge.
I am solving the "Medical Logistics in a Sinking City" challenge alone,
which is normally designed for a 4-person team (2 logistics + 2 CSE students).
Portfolio goal: Backend-focused developer targeting Cambodia and SEA job market.

## THE CHALLENGE
Challenge Name: Medical Logistics in a Sinking City
Track: University Track
Organizer: Viet Nam Red Cross (supported by BSSC, RMIT, Innoex, HELP Logistics)
Goal: Design a practical, scalable, and resource-aware humanitarian logistics
solution for a 24-48 hour emergency flood response in a sinking Vietnamese city.

## SYSTEM IDENTITY
System Name: REMA (Rapid Emergency Medical Access)
Architecture: 3 layers — Central Warehouse → Sub-Warehouses (×3) → Last Mile
Core strategy: Pre-position before flood peaks, not reactive dispatch
EMK types: EMK-1 (General), EMK-2 (Vulnerable), EMK-3 (Chronic Illness)
Critical window: 24–48 hours

## TECH STACK — LOCKED
Backend:        Node.js + TypeScript + Express + Prisma + PostgreSQL
Frontend:       React (Vite) + TypeScript + Tailwind CSS + Recharts + Leaflet.js
Infrastructure: Docker + docker-compose
Hosting:        Render (backend) + Supabase (PostgreSQL) + Vercel (frontend)
API Docs:       Swagger (express-swagger-ui)

Hosting notes:
- Render: free forever, spins down after 15min inactivity (cold start ~30sec — acceptable for portfolio)
- Supabase: free PostgreSQL forever (500MB), connect via standard PostgreSQL connection string in Prisma
- Vercel: free forever for React frontend
- Do NOT use Railway — free tier is 30 days only

## STRATEGY SECTIONS
All strategy sections are complete and available as markdown files in the GitHub repo.
Do NOT duplicate section content in this file — read the source files directly.

Files in /docs folder:
- section-0-core-concept.md
- section-A-response-design.md
- section-B-logistics-model.md (includes B.10 cold chain + storage protocol)
- section-C-prioritization-framework.md
- section-D-coordination-model.md
- section-E-scalability-sustainability.md
- section-F-financial-plan.md
- Assumptions-log.md (48 assumptions)

## CHAT STRUCTURE
One job per chat. One testable output per chat.

**Handoff Rule (Updated):**
- I will review and confirm HANDOFF.md **only at the start of a new Chat phase** (e.g. when officially beginning Chat 2, Chat 3, Chat 4, etc.).
- During the same chat, I will **not** repeat the HANDOFF confirmation on every single message to save tokens and keep responses cleaner.
- Every new major chat must still begin by confirming that HANDOFF.md and relevant strategy section files have been reviewed.

---

CHAT 1 — Strategy (COMPLETE)
All sections 0 through F completed and pushed to GitHub.

---

CHAT 2 — Project Setup
Jobs:
- Monorepo folder structure
- Docker + docker-compose
- Supabase PostgreSQL connection
- Prisma schema + migrations
- Express boilerplate
- Swagger setup
END: skeleton runs locally, connects to Supabase, schema migrated

---

CHAT 3 — Backend: Activation + Scoring
Jobs:
- POST /api/alert/trigger  (2-of-3 flood activation logic)
- POST /api/score/household  (20-point vulnerability scoring engine)
END: 2 endpoints tested in Swagger

---

CHAT 4 — Backend: Stock Management
Jobs:
- GET  /api/stock/status  (stock levels across all 3 sub-warehouses)
- POST /api/stock/reallocate  (cross-district reallocation logic)
END: 2 endpoints tested in Swagger

---

CHAT 5 — Backend: Routing + Dashboard Summary
Jobs:
- GET  /api/route/recommend  (water depth → delivery mode per zone)
- GET  /api/dashboard/summary  (aggregated view for dashboard UI)
END: all 6 endpoints complete, full API deployed on Render

---

CHAT 6 — V1 Dashboard UI: Setup + Layout
Jobs:
- React project setup (Vite + TypeScript + Tailwind)
- API service layer (axios)
- Page layout + navigation shell
- Phase status component
END: shell running on Vercel, connected to Render backend

---

CHAT 7 — V1 Dashboard UI: Data + Charts
Jobs:
- Stock levels per district (Recharts bar/line chart)
- Priority queue table (Critical/High/Medium/Standard bands)
- District overview cards
- Connect all components to API endpoints
END: V1 complete and live on Vercel

---

CHAT 8 — V2 Routing Logic: Map Setup
Jobs:
- Leaflet map setup with OpenStreetMap
- District zone overlays (3 districts)
- Water depth input per zone (slider or input)
END: map renders correctly with district zones

---

CHAT 9 — V2 Routing Logic: Logic + Display
Jobs:
- Delivery mode recommendation logic per zone
- Route rendering on map based on recommendations
- Connect to GET /api/route/recommend
END: V2 complete and live on Vercel

---

CHAT 10 — V4 Prioritization Matrix
Jobs:
- Household scoring form (all 5 categories, 20-point input)
- Score result display + EMK type recommendation
- Sortable household priority table
- Scarcity mode indicator
- Connect to POST /api/score/household
END: V4 complete and live on Vercel

---

CHAT 11 — V3 Warehouse Layout
Jobs:
- draw.io step-by-step guidance
- Central warehouse layout (pallet zones, dispatch area, 30% reserve zone)
- Sub-warehouse layout (EMK-1/2/3 zones, volunteer check-in, map wall)
- Stock zone labeling
END: diagram exported as PNG/SVG

---

CHAT 12 — V5 Stakeholder Flowchart
Jobs:
- Review draw.io draft (already guided in Chat 1)
- Refine actor flows if needed
- Final export
END: flowchart exported as PNG/SVG

---

CHAT 13 — V6 Operating Protocol
Jobs:
- Activation checklist document
- Radio check-in script (08:00 / 12:00 / 16:00 / 20:00)
- Delivery runsheet template
- Incident log template
END: PDF-ready document

---

CHAT 14 — Section Z Final Assembly
Jobs:
- Compile all strategy sections + all visuals
- Build presentation structure
- Final submission package
END: everything ready to submit

## HANDOFF SYSTEM
A HANDOFF.md file lives in the root of the GitHub repo.
Updated at the end of every chat before closing.
Every new chat reads it first before doing anything else.

HANDOFF.md structure:
- Current chat goal
- Checklist of what is done (across all chats)
- Checklist of what is next
- Critical decisions to remember
- Live URLs (Render + Supabase + Vercel + Swagger)

Opening instruction for every new chat:
"Read HANDOFF.md from the project files first.
Today we are working on [Chat X — topic].
Do not start until you confirm you have read
the handoff document and the relevant strategy
section files for today's work."

## RULES FOR EVERY CHAT
- Read HANDOFF.md before doing anything
- Read relevant strategy section files before building
- Never contradict decisions made in strategy sections
- EMK-3 cold chain is always MoH — never stored at sub-warehouses
- Scoring engine must follow exact 20-point system from Section C
- Keep solutions practical and resource-aware for Viet Nam Red Cross
- Flag every new assumption explicitly
- Backend first — frontend connects to it, never the reverse
- Every endpoint must appear in Swagger docs
- Stack is locked — do not suggest alternatives

## KEY BACKEND ENDPOINTS (Chats 3–5)
POST /api/alert/trigger         — 2-of-3 flood activation trigger
POST /api/score/household       — 20-point vulnerability scoring engine
GET  /api/stock/status          — stock levels across all 3 sub-warehouses
POST /api/stock/reallocate      — cross-district reallocation logic
GET  /api/route/recommend       — delivery mode by water depth per zone
GET  /api/dashboard/summary     — aggregated view for dashboard UI

## CRITICAL DECISIONS TO CARRY ACROSS ALL CHATS
- EMK-3 never pre-stored — MoH cold storage only, transferred at activation
- Scoring: exactly 5 categories, 20 points max, must match Section C precisely
- Volunteer safety hard limit: suspend all delivery above 80cm water depth
- Last-mile tiers: motorbike (0–30cm) / bicycle or foot (30–60cm) /
  boat (60–80cm) / suspended (>80cm)
- 3 sub-warehouses, 1 per district, 12 volunteers each = 36 total
- Activation trigger: 2 of 3 conditions must be met simultaneously
- Central warehouse holds 30% reserve after dispatching to sub-warehouses
- Scarcity mode triggers when total stock falls below 30% of original allocation