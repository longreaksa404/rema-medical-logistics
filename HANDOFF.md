# REMA Handoff Document
Last updated: Chat 18 complete

---

## Current Status

Chat 18 is complete. Unit tests pass: 4 suites, 113 tests, all green.

**Total remaining chats: 3** — Chat 19, Chat 20, Chat 21.

---

## What Was Completed in Chat 18

### Files created
- `backend/jest.config.ts` — ts-jest config, types: ['jest', 'node']
- `backend/src/utils/route.utils.ts` — NEW pure helper (extracted from route.service.ts to avoid Prisma import in tests)
- `backend/src/utils/__tests__/scoring.test.ts` — 59 tests covering all 5 categories, all 3 score bands, EMK logic, 6 worked examples
- `backend/src/utils/__tests__/stock.utils.test.ts` — 18 tests covering scarcity threshold, zero-total guard, real REMA stock values
- `backend/src/utils/__tests__/alert.test.ts` — 13 tests covering all 8 boolean combinations of the 2-of-3 activation rule
- `backend/src/utils/__tests__/route.test.ts` — 23 tests covering all 4 delivery tiers and all 3 tier boundaries

### package.json change needed
Add to `backend/package.json` scripts:

```bash
"test": "jest",
"test:coverage": "jest --coverage"
```

### devDependencies installed
```bash
npm install --save-dev jest ts-jest @types/jest
```

### Bug found in scoring.ts (minor)
`WORKED_EXAMPLE_CASES` has Household A with `expectedEmk: 'EMK1'` — should be `'EMK2'`. The scoring engine is correct; the constant has a documentation error. Fix in `scoring.ts` line for Household A.

### Test results (verified in CI-like environment)

```bash
Test Suites: 4 passed, 4 total
Tests:       113 passed, 113 total
Snapshots:   0 total
```

---

## Live URLs
| Service | URL |
|---|---|
| Backend API | https://rema-medical-logistics.onrender.com |
| Swagger docs | https://rema-medical-logistics.onrender.com/api/docs |
| Frontend | https://rema-frontend-delta.vercel.app |
| Database | Supabase PostgreSQL — rema-medical-logistics (Singapore) |

---

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

---

## Next Chat Goal — Chat 19: CI/CD Pipeline

### What Chat 19 builds
One GitHub Actions workflow file: runs backend tests on every push/PR, triggers Render redeploy on merge to main.

### Manual steps needed BEFORE Chat 19 (do these now)
1. Go to Render dashboard → your backend service → Settings → Deploy Hook
2. Click "Generate Deploy Hook" — copy the URL
3. Go to GitHub repo → Settings → Secrets and variables → Actions → New secret
4. Name: `RENDER_DEPLOY_HOOK_URL` — paste the URL
5. Confirm Vercel project is connected to GitHub (Vercel dashboard → Settings → Git)

### First steps for Chat 19
1. Read HANDOFF.md + PROJECT_SCOPE.md Section 13.2 + PROJECT_PLAN.md Chat 19 checklist
2. Create `.github/workflows/` directory
3. Write `ci.yml` — trigger on push/PR, node setup, npm ci, npm test, Render curl
4. Push to main → verify pipeline green in GitHub Actions tab
5. Add CI badge to README.md

### Critical notes for Chat 19
- The workflow must `cd backend` before `npm ci` and `npm test` — the lockfile is in backend/, not root
- The Render deploy hook curl should only run on `push` to main, NOT on pull_request
- No DATABASE_URL or JWT_SECRET needed in GitHub secrets — tests are pure functions
- Vercel autodeploys from GitHub automatically — no extra CI step needed for frontend

---

## Chat 20 Preview — AI Integration

### What Chat 20 builds
Backend: `POST /api/ai/brief` (EMERGENCY_COORDINATOR+ only). Reads dashboard state, calls Anthropic Claude API server-side, returns 3-part brief.
Frontend: "Generate AI Brief" button on V1 Dashboard (EC + SUPER_ADMIN only), modal with advisory label.

### Manual step needed before Chat 20
- Add `ANTHROPIC_API_KEY` to Render environment variables

---

## Chat 21 Preview — Final Assembly

Submission package: executive summary, demo guide, v1.0.0 tag.

---

## Key Decisions Log (Chat 18 additions)

| Chat | Decision | Choice |
|---|---|---|
| 18 | Test scope | Backend utility functions only — no Prisma, no HTTP, no database |
| 18 | Route test strategy | Extracted `route.utils.ts` pure helper to avoid Prisma import in tests |
| 18 | Household A EMK | Scoring engine correctly returns EMK2 (cat2=2 triggers vulnerability rule); `WORKED_EXAMPLE_CASES` constant has a minor documentation error (EMK1) — fix recommended |
| 18 | Scarcity boundary | `isInScarcity` uses strict `< 0.3` — exactly 30% is NOT scarce; 29.9% IS scarce |