## Last Session - Pagination for stock movement endpoints

### What changed
- `backend/src/services/stock.service.ts`
  - Added `PaginatedMovements<T>` interface and `DEFAULT_PAGE_SIZE = 20` constant
  - `getCentralMovements(page, pageSize)` - now paginated, returns `{ data, total, page, pageSize, totalPages }`
  - `getAllMovements(page, pageSize)` - same
  - `getMovementsByDistrict(districtId, page, pageSize)` - same
  - Uses `prisma.$transaction([findMany, count])` for accurate totals

- `backend/src/controllers/stock.controller.ts`
  - `getCentralMovementsHandler` - parses `?page=` and `?pageSize=` query params, defaults to page 1 / size 20, caps pageSize at 100
  - `getMovements` - same
  - `getMovementsByDistrictHandler` - same

- `frontend/src/api/hub.ts`
  - Added `PaginatedResponse<T>` interface
  - `getCentralMovements(page)` - now accepts page param, returns `PaginatedResponse<CentralMovement>`
  - `getMovements(districtId, page)` - same

- `frontend/src/pages/HubPage.tsx`
  - `StockTab` - added `movPage` state, query key includes page, `placeholderData: keepPreviousData`, `useEffect` resets page on district change, prev/next pagination controls under audit log
  - `CentralTab` - added `centralMovPage` state, same pattern

### Current system state
- Backend: pagination changes ready to deploy to Render
- Frontend: pagination UI ready to deploy to Vercel
- DB: no schema changes, no migration needed

### Live URLs
- Frontend: https://rema-system.vercel.app
- Backend: https://rema-medical-logistics.onrender.com
- Swagger: https://rema-medical-logistics.onrender.com/api/docs