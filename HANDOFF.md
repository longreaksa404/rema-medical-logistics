# REMA Handoff Document
Last updated: Chat 7.5 complete

## Current Chat Goal
Chat 7.5 — Cache + Polling Architecture — COMPLETE

## What Was Completed This Chat

### New file
- [x] `backend/src/utils/stock.utils.ts` — extracts `isInScarcity` to break circular dep

### Modified files
- [x] `dashboard.service.ts` — `getDistrictDashboard` now cached 10s (was uncached)
- [x] `alert.service.ts` — `invalidateCache()` called on auto-activation and phase advance
- [x] `stock.service.ts` — targeted cache invalidation on `dispatchStock` and `reallocateStock`

### Architecture decision
- `adjustStock` and `recordDelivery` deliberately NOT invalidating cache — high-frequency
  operations; 15s TTL acceptable, prevents thrashing during active flood operations
- Circular dependency resolved: `isInScarcity` moved to `utils/stock.utils.ts`;
  `stock.service.ts` re-exports it so no other files needed changing

## Files to Copy Into Your Repo (download from outputs)

| File | Destination |
|---|---|
| `dashboard.service.ts` | `backend/src/services/dashboard.service.ts` (REPLACE) |
| `alert.service.ts` | `backend/src/services/alert.service.ts` (REPLACE) |
| `stock.service.ts` | `backend/src/services/stock.service.ts` (REPLACE) |
| `stock.utils.ts` | `backend/src/utils/stock.utils.ts` (NEW) |

## Critical Decisions Made This Chat

1. **10s TTL for district dashboard, 15s for summary** — district dashboards update more
   frequently (stock, incidents, runs) but don't need real-time. 10s is a good balance.
   Summary is a heavier query and 15s is acceptable.

2. **Targeted invalidation for stock, full clear for phase** — stock changes affect specific
   districts; phase changes affect the entire dashboard state. Different strategies for each.

3. **`isInScarcity` moved to utils** — Node.js handles circular imports but they can cause
   initialization ordering bugs in TypeScript with strict mode. Cleaner to extract.

4. **`adjustStock` and `recordDelivery` don't invalidate** — deliberate decision. During
   an active flood event, these run constantly (every delivery receipt). Invalidating on
   every delivery would make caching useless. The 15s window means the dashboard lags
   slightly on delivery counts — acceptable tradeoff.

## What Is Next — Chat 8: Frontend Auth + Dashboard Setup

1. React project setup (Vite + TypeScript + Tailwind CSS) inside `frontend/`
2. Environment config (`.env` with Render backend URL)
3. API service layer (axios instance + JWT interceptor)
4. Auth context (store JWT, current user, logout)
5. Login page (V0) — form + error handling
6. Role-based redirect after login
7. Protected route wrapper
8. Navigation sidebar (links by role)
9. Dashboard shell layout (header + sidebar + content area)
10. Phase status banner component (Phase 0/1/2)
11. Deploy to Vercel
12. Add 30-second polling interval (useEffect + setInterval)
13. Manual refresh button for Operations Center users
14. "Last updated" timestamp on dashboard

## Live URLs
- Backend API: not yet deployed (Render deployment pending)
- Frontend: not yet started
- Swagger docs: not yet deployed
- Supabase DB: rema-medical-logistics (Singapore, ref: vkrtqhiymbbdgmtybjrm)