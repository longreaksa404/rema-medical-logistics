# REMA Handoff Document
Last updated: Chat 19 complete

---

## Current Status

Chat 19 is complete. GitHub Actions CI/CD pipeline is live.

**Total remaining chats: 2** — Chat 20, Chat 21.

---

## What Was Completed in Chat 19

### Files created
- `.github/workflows/ci.yml` — GitHub Actions workflow: runs tests on push/PR, triggers Render deploy on main merge only
- README.md updated — CI badge added, CI/CD setup section documented

### Pipeline behavior
- **Pull requests:** test job runs (Node 20, npm ci, npm test) — PR blocked if tests fail
- **Push to main:** test job runs first, then deploy job curls Render hook — only if tests pass
- **Vercel:** autodeploys from GitHub main — no extra CI step needed

### GitHub secret required
- `RENDER_DEPLOY_HOOK_URL` — must be set manually in GitHub → Settings → Secrets → Actions

### Key constraint verified
- No DATABASE_URL or JWT_SECRET needed in GitHub — tests are pure functions (no Prisma, no HTTP)

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

## Next Chat Goal — Chat 20: AI Integration (REMA AI Brief)

### What Chat 20 builds
**Backend:** `POST /api/ai/brief` (EMERGENCY_COORDINATOR+ only). Reads dashboard aggregate state (no PII), calls Anthropic Claude API server-side, returns 3-part operational brief.
**Frontend:** "Generate AI Brief" button on V1 Dashboard (EC + SUPER_ADMIN only), modal with mandatory "Advisory only" label.

### Manual step needed BEFORE Chat 20
- Add `ANTHROPIC_API_KEY` to Render environment variables (Render dashboard → your service → Environment)

### First steps for Chat 20
1. Read HANDOFF.md + PROJECT_SCOPE.md Section 13.3 + PROJECT_PLAN.md Chat 20 checklist
2. `npm install @anthropic-ai/sdk` inside `backend/`
3. Add `ANTHROPIC_API_KEY=` placeholder to `backend/.env.example`
4. Create `backend/src/services/ai.service.ts`
5. Create `backend/src/controllers/ai.controller.ts`
6. Create `backend/src/routes/ai.routes.ts`
7. Register routes in `app.ts`
8. Update Swagger
9. Deploy and test endpoint via Swagger as coordinator@rema.vn
10. Frontend: add button to DashboardPage.tsx + create AiBriefModal.tsx
11. Deploy frontend and test end-to-end

### Critical notes for Chat 20
- Model: `claude-sonnet-4-20250514` — exactly as specified in PROJECT_SCOPE.md
- No PII in prompt — aggregate counts only (phase, stock totals, band counts, incident counts, radio %)
- max_tokens: 400 (as per scope)
- HTTP 503 with clear message if Anthropic API unavailable — frontend shows fallback, does not crash
- "Advisory only — human decision required" label must always be visible in the modal (red/amber)
- Button visible ONLY to EMERGENCY_COORDINATOR and SUPER_ADMIN — not HUB_MANAGER, not VIEWER

---

## Chat 21 Preview — Final Assembly

Submission package: executive summary, demo guide, strategy sections compiled, v1.0.0 tag.

---

## Key Decisions Log

| Chat | Decision | Choice |
|---|---|---|
| 18 | Test scope | Backend utility functions only — no Prisma, no HTTP, no database |
| 18 | Route test strategy | Extracted `route.utils.ts` pure helper to avoid Prisma import in tests |
| 18 | Scarcity boundary | `isInScarcity` uses strict `< 0.3` — exactly 30% is NOT scarce; 29.9% IS scarce |
| 19 | Two-job pipeline | `test` and `deploy` as separate jobs with `needs: test` — deploy never runs if tests fail |
| 19 | PR guard | `if: github.event_name == 'push'` on deploy job — Render hook only fires on main merge, not PR |
| 19 | curl -f flag | Non-zero exit if Render rejects request — pipeline goes red, not silent green |
| 19 | No DB secrets in CI | Unit tests are pure functions — DATABASE_URL and JWT_SECRET not needed in GitHub |