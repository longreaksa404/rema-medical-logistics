# REMA Handoff Document
Last updated: Project scope expanded — Chats 18–21 planned

---

## Current Status

Chat 17 is complete. Project scope has been updated to add three engineering quality
chats (Unit Tests, CI/CD, AI Integration) before final assembly.

**Total remaining chats: 4** — Chat 18, Chat 19, Chat 20, Chat 21.

---

## What Was Completed in the Scope Update Session

### PROJECT_SCOPE.md — Section 13 added
- **13.1 Unit Testing** — Jest + ts-jest, backend utility functions only. 4 test files
  defined: scoring.test.ts, stock.utils.test.ts, alert.test.ts, route.test.ts
- **13.2 CI/CD Pipeline** — GitHub Actions workflow. Triggers on push to main and
  pull requests. Runs tests → triggers Render deploy hook on main. Vercel autodeploys
  from GitHub (no extra CI step needed).
- **13.3 AI Integration** — REMA AI Brief feature. New endpoint POST /api/ai/brief
  (EMERGENCY_COORDINATOR+ only). Reads aggregate dashboard state, calls Anthropic
  Claude API server-side, returns 3-part brief: situation summary, priority alert,
  next step. Advisory only — cannot trigger any system action.
- **13.4 New Assumptions** — Assumptions #50–55 defined, ready to add to
  Assumptions-log.md.

### PROJECT_PLAN.md — Updated
- Chat 18: Unit Tests added with full test case checklist
- Chat 19: CI/CD Pipeline added with step-by-step workflow and manual setup instructions
- Chat 20: AI Integration added with full backend + frontend checklist
- Chat 21: Final Assembly (previously Chat 18) — unchanged content, renumbered
- File structure updated with all new files marked NEW or MODIFIED
- Git commit commands added for all 4 remaining chats

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

## Chat 17 — What Was Delivered (Previous Chat)

### Deliverables produced
- `V6-operating-protocol.pdf` — 8-page professional field reference document
  - Cover page with classification notice, metadata, and contents table
  - Section 1: Phase 1 Activation Checklist (Hours 0–3 / 3–8 / 8–16 / 16–24)
  - Section 2: Phase 2 Adaptive Delivery Checklist
  - Section 3: Radio Check-In Script (08:00 / 12:00 / 16:00 / 20:00)
  - Section 4: Delivery Runsheet Template
  - Section 5: Incident Log Template
  - Section 6: Volunteer Household Assessment Form

### Files to confirm in repo
- `sections/visuals/V6-operating-protocol.pdf`
- `frontend/public/visuals/V6-operating-protocol.pdf`
- `frontend/src/pages/ProtocolPage.tsx` — embeds PDF via iframe or object tag

---

## Next Chat Goal — Chat 18: Unit Tests

### What Chat 18 builds
Install Jest and write pure unit tests for the 4 backend utility files that implement
REMA's locked rules. No database. No HTTP. No Prisma. Pure functions only.

### Files to create
```
backend/jest.config.ts
backend/src/utils/__tests__/scoring.test.ts
backend/src/utils/__tests__/stock.utils.test.ts
backend/src/utils/__tests__/alert.test.ts
backend/src/utils/__tests__/route.test.ts
```

### First steps for Chat 18
1. Read HANDOFF.md + PROJECT_SCOPE.md Section 13.1 + PROJECT_PLAN.md Chat 18 checklist
2. Install Jest in backend/:
   ```bash
   cd backend
   npm install --save-dev jest ts-jest @types/jest
   ```
3. Create jest.config.ts with ts-jest preset
4. Add `"test": "jest"` to backend/package.json scripts
5. Write scoring.test.ts first — it has the most cases and is highest value
6. Run npm test after each file to catch errors early
7. Final: npm test passes with all tests green

### Critical notes for Chat 18
- Do NOT import Prisma in any test file — tests must be pure functions
- The Section C worked example must pass exactly:
  - Household A: 8 pts → MEDIUM
  - Household B: 6 pts → MEDIUM
  - Household C: 9 pts → MEDIUM
  - Household D: 8 pts → MEDIUM
  - Household E: 1 pt → STANDARD
  - Household F: 10 pts → HIGH
- Category 2 cap is 5 points — infant (2) + pregnant (2) = 4, not 5; but
  infant (2) + pregnant (2) + elderly alone (2) = capped at 5, not 6
- isInScarcity() at exactly 30% remaining should return true (at-or-below threshold)
- getDeliveryMode(80) should return SUSPENDED — at 80cm is suspended, not BOAT

---

## Chat 19 Preview — CI/CD Pipeline

### What Chat 19 builds
One GitHub Actions workflow file that runs backend tests on every push/PR and
triggers Render redeploy on merge to main.

### File to create
```
.github/workflows/ci.yml
```

### Manual steps needed before Chat 19 (do these now)
1. Go to Render dashboard → your backend service → Settings → Deploy Hook
2. Click "Generate Deploy Hook" — copy the URL
3. Go to GitHub repo → Settings → Secrets and variables → Actions → New secret
4. Name: `RENDER_DEPLOY_HOOK_URL` — paste the URL
5. Confirm Vercel project is connected to GitHub (Vercel dashboard → Settings → Git)

### First steps for Chat 19
1. Read HANDOFF.md + PROJECT_SCOPE.md Section 13.2 + PROJECT_PLAN.md Chat 19 checklist
2. Create `.github/workflows/` directory
3. Write `ci.yml` — trigger, node setup, npm ci, npm test, Render hook curl
4. Push to main → verify pipeline runs green in GitHub Actions tab
5. Add CI badge to README.md

---

## Chat 20 Preview — AI Integration

### What Chat 20 builds
Backend: `POST /api/ai/brief` endpoint — reads dashboard state, calls Anthropic
Claude API, returns 3-part operational brief. EMERGENCY_COORDINATOR+ only.

Frontend: "Generate AI Brief" button on V1 Dashboard (EC and SUPER_ADMIN only),
modal with advisory label, loading and error states.

### Manual step needed before Chat 20
- Add `ANTHROPIC_API_KEY` to Render environment variables
  (Render dashboard → your backend service → Environment → Add environment variable)

### New files Chat 20 creates
```
backend/src/services/ai.service.ts
backend/src/controllers/ai.controller.ts
backend/src/routes/ai.routes.ts
frontend/src/components/AiBriefModal.tsx
frontend/src/api/ai.ts
```

### Files Chat 20 modifies
```
backend/src/app.ts              — register ai.routes
backend/swagger.yaml            — add POST /api/ai/brief docs
frontend/src/pages/DashboardPage.tsx  — add AI Brief button
```

### Hard constraints for Chat 20 (do not compromise)
- API key stored in Render environment variables only — never in frontend bundle
- Prompt contains aggregate counts only — no names, addresses, or household IDs
- "Advisory only — human decision required" label always visible in modal
- AI endpoint is read-only — no database writes in this flow
- If Anthropic API fails: return HTTP 503, frontend shows graceful error message

---

## Chat 21 Preview — Final Assembly

### What Chat 21 builds
Submission package: executive summary, demo guide, assumptions log review,
presentation outline, v1.0.0 git tag.

### Checklist
- Verify all live URLs
- Wire V6 PDF into ProtocolPage.tsx (if not done in Chat 17)
- Write executive summary (1 page)
- Write system demo guide (test account walkthrough)
- Final assumptions log review — confirm #50–55 added
- Presentation slide outline
- Final git tag: v1.0.0
- Submission folder README

---

## Key Decisions Log (all chats)

| Chat | Decision | Choice |
|---|---|---|
| 0 | System name | REMA — Rapid Emergency Medical Access |
| 0 | Architecture | 3-layer: Central Warehouse → Sub-Warehouses → Last Mile |
| 0 | Technology philosophy | Minimal viable tech with full paper fallback |
| 4 | Scoring engine | Exact 20-point system from Section C — locked |
| 4 | Activation trigger | Exactly 2 of 3 conditions — no exceptions |
| 5 | Scarcity threshold | Below 30% of original allocation |
| 5 | Reserve policy | 30% held at central warehouse after dispatch |
| 6 | Safety hard limit | Delivery suspended above 80cm water depth |
| 7.6 | Frontend architecture | Single unified React app (Option A) |
| 7.6 | SUPER_ADMIN creation | Seed script only — never via API |
| 7.6 | User deletion policy | Deactivate only — never delete, preserve audit trail |
| Scope update | Test scope | Backend utility functions only — no integration, no E2E |
| Scope update | CI scope | Test + Render deploy hook only — no staging, no Docker build |
| Scope update | AI scope | Server-side only, aggregate data only, advisory only |
| Scope update | AI model | claude-sonnet-4-20250514 |