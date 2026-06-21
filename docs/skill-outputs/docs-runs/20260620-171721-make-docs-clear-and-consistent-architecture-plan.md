# make-docs-clear-and-consistent: architecture plan

- Date: 2026-06-20
- Project: CodeSentinel
- User request: Clean the architecture plan.
- Target reader: Hackathon teammate or future agent implementing the MVP.
- Scope: Clean `docs/skill-outputs/architecture/20260620-164432-design-technical-architecture-cto-first-mvp.md`.
- Inputs/artifacts used:
  - `docs/skill-outputs/architecture/20260620-164432-design-technical-architecture-cto-first-mvp.md`
  - `docs/FLOWS.md`
  - `docs/INTEGRATION.md`
  - `README.md`
  - `app/api/ingest/route.ts`
  - `app/api/sessions/route.ts`
- Docs edited/created:
  - Edited: `docs/skill-outputs/architecture/20260620-164432-design-technical-architecture-cto-first-mvp.md`
  - Created: `docs/skill-outputs/docs-runs/20260620-171721-make-docs-clear-and-consistent-architecture-plan.md`
- Confidence: Medium-high. This cleaned a planning artifact; no code behavior was changed.

## Documentation Contract

- Must-answer questions:
  - What is the MVP architecture?
  - Who starts first?
  - How does CTO role/rule setup affect Claude Code events?
  - What does the Risk Engine do?
  - How do auth, hooks, storage, deployment, and database fit?
  - What is out of scope?
- Source-of-truth commands:
  - Not run; this was documentation cleanup only.
- Vocabulary decisions:
  - Risk Engine
  - personal_data
  - unsafe_code
  - company_policy
  - prompt_attack
  - agent key
  - employee connection status
- Diagrams included:
  - Hackathon demo seed flow.
- Diagrams rejected:
  - Candidate-debate tables and long process scaffolding; these did not help the reader.
- Caveats/unknowns:
  - Real admin CRUD screens are still a later product decision.

## Source-of-Truth Findings

| Kind | Finding | Evidence | Doc impact |
|---|---|---|---|
| Flow | Current repo has `/api/ingest` and `/api/sessions` route surfaces | `app/api/ingest/route.ts`, `app/api/sessions/route.ts` | Kept these as route boundaries |
| Integration | Claude Code hooks are the MVP runtime integration | `docs/INTEGRATION.md` | Kept Cursor/Copilot out of scope |
| Gap | Missing `lib/*` implementation is the real implementation work | route imports | Listed modules to build |
| Product decision | CTO/admin starts first; employees are seeded/invited | session decisions | Made CTO-first explicit |

## Candidate Debate

| Candidate | Shape | Pros | Cons | Decision |
|---|---|---|---|---|
| Keep original | 839-line architecture run output | Complete history | Hard to read; mixed process and plan | Rejected |
| Clean plan | Product model -> demo -> runtime -> auth/db -> implementation order | Clear and implementable | Loses candidate-debate details | Chosen |

## Edits Made

| File | Purpose | Major changes |
|---|---|---|
| `docs/skill-outputs/architecture/20260620-164432-design-technical-architecture-cto-first-mvp.md` | Clean architecture plan | Rewrote into concise sections, removed architecture-skill scaffolding, kept decisions |

## Diagrams

| Diagram | Location | Why included | Staleness risk |
|---|---|---|---|
| Hackathon demo seed flow | architecture plan section 3 | Shows seeded demo path in one screen | Low |

## Verification

| Check | Result | Evidence |
|---|---|---|
| File rewritten | PASS | `docs/skill-outputs/architecture/20260620-164432-design-technical-architecture-cto-first-mvp.md` |
| Code behavior changed | n/a | Documentation-only |
| Build/test | Not run | Documentation-only |

## Review Verdicts

- Fresh-context reader: PASS — structure now starts with the product model and implementation order.
- Code/doc truth: PASS with caveat — plan references route surfaces that exist; modules are planned, not claimed as implemented.
- Style/clarity: PASS — removed long candidate debate and consolidated repeated decisions.
- Diagram review: PASS — one diagram remains because it clarifies the demo path.

## Remaining Unknowns

- Whether real admin CRUD screens are needed after the monitoring loop works.

## Next Documentation Improvements

1. Promote this into a canonical spec under `docs/specs/` if the team wants durable product truth.
2. Update `docs/INTEGRATION.md` after hook connection status is implemented.
3. Update `README.md` only after Supabase/Vercel setup is actually added.
