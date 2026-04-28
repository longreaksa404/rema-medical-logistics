# REMA — Rapid Emergency Medical Access

**Challenge:** Medical Logistics in a Sinking City  
**Track:** University Track  
**Organizer:** Viet Nam Red Cross (supported by BSSC, RMIT, Innoex, HELP Logistics)

---

## What Is This?

REMA is a practical, scalable humanitarian logistics system designed to deliver essential medical supplies to flood-affected urban communities in Vietnam within 24–48 hours of a flood event.

- **Architecture:** 3 layers — Central Warehouse → Sub-Warehouses (×3) → Last-Mile Delivery
- **Core strategy:** Pre-position before flood peaks, not reactive dispatch
- **EMK types:** EMK-1 (General), EMK-2 (Vulnerable), EMK-3 (Chronic Illness)

---

## Project Structure

```
rema/
├── backend/          # Node.js + TypeScript + Express + Prisma
│   ├── prisma/       # Schema and migrations
│   └── src/
│       ├── controllers/
│       ├── routes/
│       ├── services/
│       ├── middleware/
│       ├── utils/
│       └── types/
├── frontend/         # React + Vite + TypeScript + Tailwind
├── docs/             # Strategy sections (markdown)
└── scripts/          # Utility scripts
```

---

## Quick Start

```bash
# 1. Install dependencies
cd backend && npm install

# 2. Copy env file and fill in your Supabase connection string
cp .env.example .env

# 3. Run migrations
npm run migrate

# 4. Start dev server
npm run dev
```

API docs available at: `http://localhost:3000/api/docs`

---

## Live URLs

| Service | URL | Status |
|---|---|---|
| Backend API | https://rema-medical-logistics.onrender.com | ✅ Live |
| Swagger Docs | https://rema-medical-logistics.onrender.com/api/docs | ✅ Live |
| Frontend | https://rema-frontend-delta.vercel.app | ✅ Live |