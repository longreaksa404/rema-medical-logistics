# REMA Handoff Document
Last updated: Chat 8 complete

## Current Chat Goal
Chat 8 — Frontend Auth + Dashboard Setup — COMPLETE

## What Was Completed This Chat

### New files created (frontend/src/)
- api/client.ts — Axios instance with JWT interceptor + 401 auto-redirect
- api/auth.ts — login, logout, me, changePassword
- api/cache.ts — localStorage cache with TTL + stale detection
- api/dashboard.ts — getSummary, getSummaryCached, getDistrictDashboard
- context/AuthContext.tsx — JWT storage, rehydration, login/logout, isRole helper
- components/ProtectedRoute.tsx — role-aware route guard
- components/AppShell.tsx — sidebar + outlet wrapper
- components/Sidebar.tsx — role-based nav links, user info, logout
- components/DashboardLayout.tsx — sticky header, 30s polling, manual refresh, last-updated
- components/PhaseBanner.tsx — phase 0/1/2 with trigger conditions display
- pages/LoginPage.tsx — form, error handling, dark industrial aesthetic
- pages/DashboardPage.tsx — stale-while-revalidate, skeleton, phase banner, district cards, incidents
- pages/ChangePasswordPage.tsx — any auth user, validates current password
- pages/PlaceholderPages.tsx — stubs for Chat 10–14 routes
- App.tsx, main.tsx, index.css, tailwind.config.js, vite.config.ts, vercel.json, .env.example

### Key issues resolved this chat
- Tailwind v4 vs v3 conflict — downgraded to tailwindcss@3
- verbatimModuleSyntax required import type for all type-only imports
- font-600/700/800 replaced with font-semibold/bold/extrabold (Tailwind v3 naming)
- postcss.config.js was missing — created manually
- vite-env.d.ts was missing — created for CSS + import.meta.env support
- tsconfig.node.json needed composite:true and noEmit:false
- VITE_API_URL set in Vercel environment variables

### Architecture decisions locked
- Dark industrial aesthetic — Syne + JetBrains Mono fonts
- Auth state in React Context + localStorage (token + user JSON)
- Stale-while-revalidate pattern — localStorage cache (5 min TTL), show instantly, revalidate in background
- 30-second auto-poll via setInterval (silent, no spinner)
- Manual refresh button with spinner for explicit user refresh
- vercel.json rewrites for SPA routing
- Tailwind v3 (not v4) — locked for this project
- UptimeRobot recommended to keep Render backend warm (free, pings /api/health every 5 min)
- Redis not used — overkill for this scale, localStorage cache solves the UX problem

## Live URLs
- Backend API: https://rema-medical-logistics.onrender.com
- Swagger docs: https://rema-medical-logistics.onrender.com/api/docs
- Frontend: https://rema-frontend-delta.vercel.app
- Supabase DB: rema-medical-logistics (Singapore, ref: vkrtqhiymbbdgmtybjrm)

## Test Accounts (all passwords: rema1234)
| Email | Role | District |
|---|---|---|
| admin@rema.vn | SUPER_ADMIN | — |
| coordinator@rema.vn | EMERGENCY_COORDINATOR | — |
| hub1@rema.vn | HUB_MANAGER | District 1 |
| hub2@rema.vn | HUB_MANAGER | District 2 |
| hub3@rema.vn | HUB_MANAGER | District 3 |
| volunteer1@rema.vn | VOLUNTEER | District 1 |
| viewer@rema.vn | VIEWER | — |

## Next Chat Goal — Chat 9: Frontend V1 Dashboard Data + Charts

### What Chat 9 builds
- Stock levels bar chart per district (EMK-1, EMK-2, EMK-3) using Recharts
- Household priority queue table connected to GET /api/households/priority-queue
- District detail drill-down view
- Polish dashboard spacing and layout
- Possibly: delivery run list, radio compliance indicator

### First steps for Chat 9
1. cd frontend && npm install recharts
2. Read HANDOFF.md, PROJECT_SCOPE.md, PROJECT_PLAN.md
3. Build StockChart component using Recharts BarChart
4. Build PriorityQueueTable component
5. Wire both into DashboardPage