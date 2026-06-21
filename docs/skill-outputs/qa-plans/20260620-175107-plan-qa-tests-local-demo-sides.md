# plan-qa-tests: local demo sides

- Date: 2026-06-20
- Project: CodeSentinel
- Request: Plan QA for the local two-sided demo: CTO dashboard plus vibe coder simulated Claude Code events.
- Sources:
  - `docs/DEMO.md`
  - `docs/INTEGRATION.md`
  - `docs/skill-outputs/architecture/20260620-164432-design-technical-architecture-cto-first-mvp.md`
  - `package.json`
  - `scripts/demo-finance-risk.sh`
  - `scripts/demo-support-risk.sh`
  - `app/api/ingest/route.ts`
  - `app/api/sessions/route.ts`
  - `components/dashboard/*`
  - `lib/*`
- Coverage: QA plan only. No QA execution is claimed here.

## QA Target

- Feature/change: Local demo environment that shows CodeSentinel from both sides.
- CTO job: Open dashboard, see expected employees, see live sessions and flags.
- Vibe coder job: Simulated Claude Code event posts to `/api/ingest` with an employee API key.
- Surfaces:
  - Browser dashboard at `/`
  - `GET /api/sessions`
  - `POST /api/ingest`
  - `npm run demo:finance`
  - `npm run demo:support`
  - `npm run demo:sessions`
- Existing test stack:
  - `npm run build`
  - manual curl/script smoke checks
  - no unit test runner yet

## Related Outcomes / Rubrics

| Artifact | Relevant outcomes/rubric points incorporated | Notes |
|---|---|---|
| Architecture plan | CTO-first, seeded employees, Risk Engine, hook detection, in-memory store | Treated as expected behavior |
| `docs/DEMO.md` | Start-to-finish presenter flow | Used for E2E demo path |
| `docs/INTEGRATION.md` | Seeded keys, hook config, blocking toggle | Used for API/contract checks |

## Risk Registry

| Risk ID | Narrative summary | Attack vectors | Severity | Likelihood |
|---|---|---|---|---|
| R-1 | Six months later, the team demos the CTO dashboard but expected employees do not appear before any sessions. | ui/accessibility, data-integrity | High | Medium |
| R-2 | Finance and Support scripts post successfully but classify the wrong employee, role, category, severity, or action. | data-integrity, input/edge | High | Medium |
| R-3 | Missing or invalid hook auth still writes sessions, making the security story false. | security, data-integrity | High | Medium |
| R-4 | The dashboard claims missing-hook detection, but only active sessions are visible. | ui/accessibility, product-risk | High | Medium |
| R-5 | Blocking mode is described but `PreToolUse` does not return Claude's deny payload when enabled. | dependency, contract | Medium | Medium |
| R-6 | The demo cannot be repeated cleanly because in-memory state, ports, or scripts are unclear. | deploy/ops | Medium | High |
| R-7 | A superficial implementation hardcodes dashboard text but does not prove the ingest -> store -> dashboard loop. | anti-cheat, data-integrity | High | Medium |
| R-8 | UI looks fine on desktop but the left rail/dashboard is unusable on small screens or with keyboard navigation. | ui/accessibility | Medium | Medium |

## Test Layer Matrix

| Layer | Test name | Risk IDs | Evidence/pass signal | Existing/new | Command/path |
|---|---|---|---|---|---|
| Static/build | App builds with demo routes, dashboard components, and lib modules | R-6 | Exit code 0; `/`, `/api/ingest`, `/api/sessions` listed | Existing | `npm run build` |
| API contract | CTO opens sessions feed and sees two expected employees before any hook event | R-1, R-4 | JSON has `employees.length=2`; both `connectionStatus=not_connected`; `sessions=[]` | Existing/manual | `npm run demo:sessions` after fresh server start |
| API contract | Finance vibe coder event creates Finance session with critical flags | R-2, R-7 | `demo:finance` returns `{"ok":true}`; sessions feed has Finance active, `riskScore=95`, flags include `personal_data/critical/require_approval` and `unsafe_code/critical/block` | Existing/manual | `npm run demo:finance && npm run demo:sessions` |
| API contract | Support vibe coder event creates Support session with policy warning | R-2, R-7 | `demo:support` returns `{"ok":true}`; sessions feed has Support active, `riskScore=35`, flag `company_policy/medium/warn` | Existing/manual | `npm run demo:support && npm run demo:sessions` |
| API negative | Ingest without bearer key is rejected and stores no session | R-3 | HTTP 401 body `{"error":"unauthorized"}`; sessions unchanged | New manual/API check | `curl -i -X POST .../api/ingest` without Authorization |
| API negative | Ingest malformed payload is rejected and stores no session | R-3 | HTTP 400 body says missing `session_id` or `hook_event_name`; sessions unchanged | New manual/API check | curl with valid key and missing required fields |
| API contract | Blocking mode returns Claude deny payload for risky `PreToolUse` | R-5 | With `CS_BLOCK_CRITICAL=true`, response has `hookSpecificOutput.permissionDecision=deny` | New manual/API check | start server with env var and curl `PreToolUse` |
| Browser E2E | CTO watches both vibe coder scripts light up the dashboard | R-1, R-2, R-4, R-7 | Browser shows Expected employees, Finance active with 2 flags, Support active with 1 flag, live sessions selectable | New manual/browser | Browser at `http://localhost:3000` plus scripts |
| Visual/manual | Dashboard is readable at desktop projector size | R-8 | Screenshot shows no overlap; Expected employees and Live sessions are visible | New manual/browser | Capture screenshot after both scripts |
| Accessibility/manual | Keyboard user can tab to session rows and inspect selected session | R-8 | Focus reaches session buttons; selected session details update; status is not color-only | New manual/browser | Manual keyboard pass |
| Ops/runbook | Team can run demo from docs without hidden commands | R-6 | Fresh terminal follows `docs/DEMO.md`; scripts work as written | New manual | Follow `docs/DEMO.md` |

## Critical E2E / System Flows

1. Flow: CTO dashboard starts with expected employees
   - Actors: CTO/admin
   - Preconditions: Fresh dev server, no ingest events in memory
   - Steps:
     1. Run `npm run dev`.
     2. Open `http://localhost:3000`.
     3. Run `npm run demo:sessions`.
   - Assertions/evidence:
     - Dashboard shows `Finance Employee` and `Support Employee`.
     - Both show `not connected`.
     - API returns `employees` with two rows and `sessions=[]`.

2. Flow: Finance vibe coder triggers critical role-specific risk
   - Actors: Finance Employee, CTO/admin
   - Preconditions: Dev server running
   - Steps:
     1. Run `npm run demo:finance`.
     2. Watch dashboard update.
     3. Run `npm run demo:sessions`.
   - Assertions/evidence:
     - Finance Employee becomes `active`.
     - Session `demo-finance-risk` appears.
     - Risk score is `95`.
     - Flags include:
       - `personal_data`, `critical`, `require_approval`
       - `unsafe_code`, `critical`, `block`

3. Flow: Support vibe coder triggers lower-severity company policy warning
   - Actors: Support Employee, CTO/admin
   - Preconditions: Dev server running
   - Steps:
     1. Run `npm run demo:support`.
     2. Watch dashboard update.
     3. Run `npm run demo:sessions`.
   - Assertions/evidence:
     - Support Employee becomes `active`.
     - Session `demo-support-risk` appears.
     - Risk score is `35`.
     - Flag is `company_policy`, `medium`, `warn`.

4. Flow: Missing hook story remains visible
   - Actors: CTO/admin
   - Preconditions: Fresh dev server, or only one employee event sent
   - Steps:
     1. Start with no events, or run only `npm run demo:finance`.
     2. Inspect Expected employees panel.
   - Assertions/evidence:
     - Employee with no events remains visible.
     - Status is `not connected`.
     - This proves the dashboard is not only a session list.

5. Flow: Optional blocking mode denies a risky tool call
   - Actors: Finance Employee, Claude Code hook, CTO/admin
   - Preconditions: Start server with `CS_BLOCK_CRITICAL=true`
   - Steps:
     1. POST a `PreToolUse` event with `tool_name=Bash` and prod DB/drop-table content.
     2. Inspect response.
   - Assertions/evidence:
     - Response includes `hookSpecificOutput`.
     - `permissionDecision` is `deny`.
     - Dashboard still records the event/flag.

## Multi-User / Role Coverage

- Finance and Support must be separate seeded users with separate API keys.
- Finance event must map to `Finance Vibe Coder`, not Support.
- Support event must map to `Support Vibe Coder`, not Finance.
- Finance role gets the production DB rule; Support does not need to trigger that rule in the default script.
- One employee reporting must not hide the other employee's `not connected` state.

## Visual / Accessibility Coverage

- Desktop demo viewport is the primary target.
- Check that the Expected employees panel and Live sessions panel are visible without confusing nesting.
- Status cannot rely only on color; labels like `not connected`, `active`, and `missing hooks` must be readable text.
- Session rows are buttons and should remain keyboard reachable.
- Known gap: no formal screen reader/axe tooling is configured yet.

## Performance / Resource Coverage

- Demo target is low volume: two employees, two sessions, a handful of events.
- Polling `/api/sessions` every 1.5s should remain responsive.
- Performance check can be manual:
  - Dashboard updates within roughly 2 seconds after script runs.
  - API responses are immediate for local demo.
- Load testing is intentionally out of scope.

## Verifier Contract / Anti-Cheat Checks

- Visible/dev feedback:
  - `npm run build`
  - `npm run demo:sessions`
  - `npm run demo:finance`
  - `npm run demo:support`
- Final proof:
  - Browser dashboard visibly updates from script-triggered ingest events.
  - API feed contains expected employees and sessions.
- Oracle/reference pass signal:
  - Fresh server: two employees, no sessions.
  - After finance: Finance active, two flags, score 95.
  - After support: Support active, one flag, score 35.
- No-op/superficial failure signal:
  - A dashboard that always displays fake flags but `/api/sessions` stays empty fails.
  - Scripts returning `{"ok":true}` but no session state change fails.
  - A session that appears under the wrong employee/role fails.
- Anti-cheat guards:
  - Evidence must include both API JSON and browser observation.
  - Finance and Support must be triggered through different bearer keys.
  - Invalid/missing bearer key must not create state.
- Browser/CUA rubric:
  - Required live action: Open dashboard, run scripts, watch rows update.
  - PASS: Both employees and both sessions appear with expected flags.
  - PARTIAL: API is correct but dashboard does not show status/flags clearly.
  - FAIL: Behavior is inferred without running scripts or observing dashboard.

## Readiness Required Before Execution

- App startup:
  - `npm install`
  - `cp .env.example .env.local`
  - `npm run dev`
- Required services:
  - Local Next.js server on `http://localhost:3000`
  - No database required
  - No Anthropic key required
- Seed/reset data:
  - In-memory seed loads on server start.
  - Restart dev server for clean state.
- Auth/test users/roles:
  - `cs_demo_finance`
  - `cs_demo_support`
- Browser access:
  - Any modern local browser.
- External providers/mocks:
  - Claude Code is simulated by scripts.
- Logs/artifact path:
  - Terminal logs.
  - Browser screenshots if executing visual QA.
  - API output from `npm run demo:sessions`.
- Stop conditions:
  - Build fails.
  - Dev server cannot start on port 3000.
  - `/api/sessions` does not show two expected employees on fresh start.

## Exact Commands Known

- Static/build:
  - `npm run build`
- Unit:
  - none configured yet
- Integration/API:
  - `npm run demo:sessions`
  - `npm run demo:finance`
  - `npm run demo:support`
- E2E/browser:
  - manual browser check at `http://localhost:3000`

Negative auth command:

```bash
curl -i http://localhost:3000/api/ingest \
  -H 'Content-Type: application/json' \
  -d '{"session_id":"bad","hook_event_name":"UserPromptSubmit","prompt":"dump users"}'
```

Malformed payload command:

```bash
curl -i http://localhost:3000/api/ingest \
  -H 'Authorization: Bearer cs_demo_finance' \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"dump users"}'
```

Blocking command:

```bash
CS_BLOCK_CRITICAL=true npm run dev
curl -s http://localhost:3000/api/ingest \
  -H 'Authorization: Bearer cs_demo_finance' \
  -H 'Content-Type: application/json' \
  -d '{"session_id":"block-demo","cwd":"/Users/acme/refunds","hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"psql prod -c \"drop table customers\""}}'
```

## What Is Intentionally Not Tested

- Supabase/Postgres persistence.
- Vercel deployment.
- Real Claude Code UI behavior.
- Cursor/Copilot integrations.
- Full approval workflow.
- Applying suggested fixes.
- Real admin CRUD screens.
- Long-running stale/missing-hook timeout behavior beyond basic status model.

## Skeptic Findings / Loop Ledger

| Finding | Severity | Decision | Rationale |
|---|---|---|---|
| High-risk demo can pass API but fail visual dashboard | must-fix | Include browser E2E/manual check | Team demo depends on visual proof |
| Missing-hook story could be inferred but not proven | must-fix | Require fresh-start expected employees check | Dashboard must show non-reporting employees |
| Security story can be false if bad auth writes state | must-fix | Include negative bearer-key tests | `/api/ingest` is the trust boundary |
| Blocking mode is optional but documented | should-fix | Include optional contract test | It is a demo flourish, not core path |
| No unit test runner exists | acceptable-tradeoff | Manual/API plan for now | User said testing infra is not priority right now |

## Open Questions

Blocking:
- None for local demo QA planning.

Non-blocking:
- Should a formal browser tool capture screenshots for the final team demo?
- Should Vitest be added later for Risk Engine and ingest unit tests?

## Next Steps

1. Run the readiness commands.
2. Execute the API checks.
3. Execute the browser demo flow.
4. Capture a screenshot after both employees are active if the team wants visual evidence.
