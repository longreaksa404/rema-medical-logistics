## Last Session — Household Size + EMK Quantity Feature

### What changed
- `backend/src/utils/scoring.ts` — added householdSize, chronicIllCount,
  hasVulnerableMember to ScoreInput; added EmkQuantity interface;
  added calculateEmkQuantity(); scoreHousehold now returns emkQuantity
- `backend/src/utils/__tests__/scoring.test.ts` — 20 new quantity tests,
  133 total passing
- `backend/prisma/schema.prisma` — added householdSize, chronicIllCount,
  emk1Quantity, emk2Quantity, emk3Quantity, totalEmkQuantity to Household
- Migration: add_household_size_and_emk_quantity
- `backend/src/services/household.service.ts` — createHousehold and
  updateHousehold persist quantity fields; updateHousehold falls back to
  stored values on partial update
- `backend/src/controllers/household.controller.ts` — accepts new fields
  in POST /api/households and POST /api/score/household
- `backend/swagger.yaml` — added EmkQuantity schema, updated HouseholdScore
  and HouseholdDetail
- `frontend/src/utils/scoring.ts` — added EmkQuantity, new ScoreInput fields,
  calculateEmkQuantity(), scoreHousehold returns emkQuantity
- `frontend/src/api/households.ts` — Household and CreateHouseholdPayload
  updated with new fields
- `frontend/src/pages/VolunteerPage.tsx` — householdSize stepper,
  chronicIllCount stepper, EmkQuantityBadge component, live kit preview
  in score panel and household size card, kit breakdown in deliver queue,
  delivery receipt uses totalEmkQuantity not hardcoded 1

### Current system state
- Backend: running locally, all 133 tests passing
- Frontend: working, quantity preview live in Volunteer assess tab
- DB: migration applied

### Live URLs
- Frontend: https://rema-system.vercel.app
- Backend: https://rema-medical-logistics.onrender.com
- Swagger: https://rema-medical-logistics.onrender.com/api/docs