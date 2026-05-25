## Last Session Changes

### Bug Fix 1 — Delivery stock deduction (mixed kit households)
- `backend/src/services/delivery.service.ts` — `createDeliveryReceipt` now accepts
  `kits: Array<{ emkType, quantity }>` instead of single emkType+quantity.
  Loops `recordDelivery` once per kit type before transaction, so EMK3 and EMK1
  deduct from separate stock buckets correctly.
- `backend/src/controllers/delivery.controller.ts` — `addReceipt` normalises both
  call shapes: new `kits[]` array or legacy `emkType + quantity` single.
- `frontend/src/pages/VolunteerPage.tsx` — `deliverMutation` in DeliverTab now
  builds `kits[]` from `emk3Quantity`, `emk2Quantity`, `emk1Quantity` fields.
  Falls back to `recommendedEmk x1` for households assessed before quantity fields.

### Bug Fix 2 — EMK quantity calculation (EMK2 skipped when EMK3 present)
- `backend/src/utils/scoring.ts` — `calculateEmkQuantity`: removed wrong condition
  `emk3 === 0` from EMK2 assignment. EMK3 and EMK2 are independent needs.
- `frontend/src/utils/scoring.ts` — same fix, files must stay identical.
- Result: household with chronic illness patient + vulnerable member now correctly
  gets both EMK3 and EMK2, not just EMK3 + extra EMK1s.

## Current System State
- Backend: https://rema-medical-logistics.onrender.com
- Frontend: https://rema-system.vercel.app
- All 125 unit tests passing (check scoring.test.ts case F emkQuantity assertion)