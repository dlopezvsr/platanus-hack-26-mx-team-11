# Local Demo Sides QA Review

- Date: 2026-06-20
- Scope: CTO dashboard plus simulated vibe coder events
- Server tested: http://localhost:3000
- Evidence screenshot: `/tmp/codesentinel-demo-dashboard.png`

## Verdict

PASS for the local scripted two-sided demo.

The demo now shows the intended MVP loop:

1. The CTO dashboard starts with two seeded employees and no active sessions.
2. Two vibe coder scripts send Claude hook-style events.
3. The API classifies each event through the risk engine.
4. The CTO dashboard updates with active employees, sessions, risk scores, and flags.

## Initial State

Command:

```bash
npm run demo:sessions
```

Observed:

- Finance Employee: `not_connected`
- Support Employee: `not_connected`
- Sessions: `[]`

This matches the intended CTO-first seeded demo model: the admin already created the employees, but they have not connected yet.

## Vibe Coder Side

Commands were run in parallel:

```bash
npm run demo:finance
npm run demo:support
```

Observed:

- Finance script returned `{"ok":true}`
- Support script returned `{"ok":true}`

These scripts simulate the vibe coder side by sending Claude Code hook-style events with seeded employee API keys.

## Post-Event API State

Command:

```bash
npm run demo:sessions
```

Observed employees:

- Finance Employee: `active`, `activeSessionCount=1`, `openFlagCount=2`
- Support Employee: `active`, `activeSessionCount=1`, `openFlagCount=1`

Observed sessions:

- `demo-finance-risk`
  - user: Finance Employee
  - riskScore: `95`
  - flags:
    - `personal_data`, `critical`, `require_approval`
    - `unsafe_code`, `critical`, `block`
- `demo-support-risk`
  - user: Support Employee
  - riskScore: `35`
  - flags:
    - `company_policy`, `medium`, `warn`

This confirms the engine is applying role-specific policy to the seeded employees.

## CTO Dashboard Side

Browser QA confirmed the dashboard rendered the post-event state:

- Active sessions: `2`
- Open flags: `3`
- Avg risk: `65/100`
- Critical sessions: `1`
- Finance Employee shown as active with 2 flags
- Support Employee shown as active with 1 flag

Finance session detail was also verified in the browser:

- Prompt: `Export all customers to a CSV from the prod database`
- Risk: `95`
- Flag: `CRITICAL REQUIRE APPROVAL No customer personal data export PERSONAL_DATA`
- Flag: `CRITICAL BLOCK No production database writes UNSAFE_CODE`

Support session detail was visible with:

- Risk: `35`
- Flag: `MEDIUM WARN`
- Category: `company_policy`

## What Works

- CTO-first invite/seeded employee model is represented in the UI.
- Dashboard distinguishes expected employees from live sessions.
- Employee status transitions from `not_connected` to `active`.
- Finance and Support users produce different risk outcomes.
- The risk engine emits the demo categories the product language expects:
  - `personal_data`
  - `unsafe_code`
  - `company_policy`
- The action labels are visible:
  - `warn`
  - `require_approval`
  - `block`
- The local demo can be run start to finish with scripts.

## Remaining Holes

- Real Claude Code hooks were not exercised in this QA pass; the scripts simulate the hook payloads.
- Blocking behavior was displayed as an action label, but enforcement mode was not tested.
- Conflicting global, role, and user rule precedence was not stress-tested.
- Approval workflow is intentionally out of scope; `require_approval` is only shown as a decision.
- Persistence is still in-memory demo storage, not Supabase/Postgres.
- Vercel/Supabase deployment wiring is not complete yet.
- `package-lock.json` changed during npm installation; review whether to keep that diff.

## Recommended Next Local Demo Flow

1. Start the app:

```bash
npm run dev
```

2. Open the CTO dashboard:

```text
http://localhost:3000
```

3. Show the seeded employee state:

```bash
npm run demo:sessions
```

4. Run the two vibe coder sides:

```bash
npm run demo:finance
npm run demo:support
```

5. Refresh the dashboard and click into the Finance session.

The best presentation story is: the CTO already configured the company, roles, employees, and rules; vibe coders run Claude Code; CodeSentinel watches the hook events and turns them into clear dashboard decisions.
