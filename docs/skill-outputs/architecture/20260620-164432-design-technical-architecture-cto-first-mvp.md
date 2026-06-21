# CodeSentinel CTO-First MVP Architecture
Status: draft architecture for hackathon MVP.
Scope: CTO-first, invite-only demo with two employee vibe coders, Claude Code hook ingestion, and a role-based Risk Engine.
## 1. Product Model
The CTO teaches CodeSentinel what is risky for each role.
A Finance vibe coder has different rules than a Support vibe coder. When an employee uses Claude Code, CodeSentinel knows who they are, what role they are in, and which rules apply.
The Risk Engine watches each Claude Code event and decides:
- Is this okay or risky?
- What kind of risk is it?
- How severe is it?
- What action should happen?
Risk categories:
- `personal_data`: personal, customer, employee, or financial data exposure.
- `unsafe_code`: dangerous code, production database writes, destructive operations, auth removal.
- `company_policy`: company rule or workflow violation.
## 2. MVP Decisions
- CTO/admin starts first.
- Vibe coders do not freely start from the landing page.
- Employees are invited or pre-created by the admin.
- Admin setup is seeded for the demo, not built as full CRUD first.
- Claude Code is the only runtime integration in scope.
- Product-link/context ingestion is out of scope.
- Approval is shown as a flag/action label only.
- Suggested fixes are advisory text only.
- Default mode is observe/warn/flag.
- Blocking is a controlled demo toggle.
- Hook removal is detectable in MVP, not preventable.
## 3. Demo Seed
The demo starts with the state the CTO would have configured ahead of time.
```text
Demo Org: Acme Inc.
CTO/Admin: cto@acme.test
Roles:
- Finance Vibe Coder
- Support Vibe Coder
Employees:
- finance.employee@acme.test -> Finance Vibe Coder
- support.employee@acme.test -> Support Vibe Coder
Each employee has an API key for Claude Code.
```
Demo path:
```text
Seeded org/users/roles/rules/keys
  -> employee runs Claude Code with API key
  -> Claude Code hook posts to /api/ingest
  -> key maps to employee -> org -> role
  -> Risk Engine applies role rules
  -> dashboard shows session + flags
```
## 4. Demo Rules
| Rule | Match examples | Category | Severity | Action |
|---|---|---|---|---|
| No customer personal data export | `export all customers`, `customer csv`, `dump users` | `personal_data` | `critical` | `require_approval` |
| No production database writes | `prod database`, `drop table`, `truncate` | `unsafe_code` | `critical` | `block` only when enabled; otherwise warn/flag |
| Warn on unapproved external APIs | `send to slack`, `post to webhook`, `upload to s3` | `company_policy` | `medium` | `warn` |
| Flag policy bypass / unsafe instructions | `ignore previous instructions`, `bypass policy`, `disable auth` | `company_policy` | `high` | `flag` |
Rule precedence:
```text
user-specific > role-specific > global
```
Strictest matching action wins:
```text
block > require_approval > warn > flag
```
Risk score:
```text
low = 10
medium = 35
high = 70
critical = 95
event score = highest severity among event flags
session score = highest event score in the session
```
## 5. Runtime Flow
```text
Claude Code event
  -> POST /api/ingest
  -> read bearer agent key
  -> map key to employee
  -> map employee to org + role
  -> load global + role rules
  -> Risk Engine classifies event
  -> store session/event/risk flags
  -> dashboard polls GET /api/sessions
```
Failure behavior:
- Missing/invalid agent key: return `401`; store nothing.
- Bad hook payload: return `400`; store nothing.
- No matching rule: store event with no flags.
- Analyzer error: store event with analysis error marker; do not block.
- `require_approval`: show label/state only; no approval workflow.
- `block` with `CS_BLOCK_CRITICAL=false`: show dashboard flag only.
- `block` with `CS_BLOCK_CRITICAL=true` on `PreToolUse`: return Claude `permissionDecision: deny`.
## 6. Core Data Model
Entities:
- `Org`: company workspace.
- `User`: CTO/admin or employee vibe coder.
- `Role`: department/job profile, like `Finance Vibe Coder`.
- `Rule`: risk policy applied to org, role, or user.
- `AgentKey`: bearer key used by Claude Code hooks.
- `Session`: one Claude Code session.
- `Event`: one hook event inside a session.
- `RiskFlag`: Risk Engine output for an event.
- `AuditLog`: admin/security history, later.
Relationships:
```text
Org has many Users
Org has many Roles
User has one Role in MVP
Role has many Rules
User has one or more AgentKeys
User has many Sessions
Session has many Events
Event has many RiskFlags
```
`RiskFlag` shape:
```ts
{
  category: "personal_data" | "unsafe_code" | "company_policy";
  severity: "low" | "medium" | "high" | "critical";
  action: "flag" | "warn" | "require_approval" | "block";
  title: string;
  explanation: string;
  suggestedFix: string;
  confidence: number;
  ruleId?: string;
  ruleVersion?: number;
}
```
## 7. Auth Architecture
There are two separate auth paths.
Human dashboard/admin auth:
- Used by the CTO/admin in the web app.
- MVP shortcut: dashboard routes resolve to seeded CTO/admin.
- Later: Supabase Auth or Auth.js with signed HTTP-only cookie.
- Admin routes check `can_manage_org`.
Claude Code hook auth:
- Used only by `/api/ingest`.
- Header: `Authorization: Bearer <agent_key>`.
- One agent key maps to exactly one employee and one org.
- Agent keys cannot access dashboard/admin routes.
- Store only `token_hash` in a real database.
Important boundary:
```text
admin browser session != agent API key
```
## 8. Hook Tamper Resistance
MVP cannot truly prevent a vibe coder from deleting local Claude Code hooks if hooks live in their personal `~/.claude/settings.json`.
MVP detects absence:
- Track `last_seen_at` per `AgentKey`.
- Track `last_seen_at` per `Session`.
- Dashboard employee status: `not connected`, `active`, `stale`, `missing hooks suspected`.
Product truth:
```text
CodeSentinel can prove what it observed.
It cannot prove safe activity happened if the user bypassed the monitored tool.
```
Post-MVP enforcement options:
- Managed Claude Code settings.
- Claude Code plugin/package.
- `codesentinel claude` wrapper command.
- Company laptop MDM policy.
- Network/proxy enforcement.
## 9. Storage And Database
MVP storage:
- In-memory `Store`.
- Seed demo data at process startup.
- Data resets on deploy/restart.
- Store raw hook payloads in memory only.
- Dashboard should prefer event summaries and risk explanations.
Production-shaped storage:
- Supabase Postgres.
- Drizzle ORM + `drizzle-kit` migrations.
- Vercel hosting.
- Supabase pooled connection string for serverless compatibility.
Tables later:
```text
orgs
users
invites
roles
user_roles
rules
agent_keys
sessions
events
risk_flags
audit_logs
```
Important constraints:
```text
users: unique (org_id, email)
roles: unique (org_id, name)
agent_keys: unique token_hash
sessions: unique (org_id, provider, external_session_id)
rules: index (org_id, scope, target_id, enabled)
events: index (org_id, session_id, created_at)
```
## 10. Modules To Build
```text
lib/types.ts
lib/store/seed.ts
lib/store/memory.ts
lib/store/index.ts
lib/auth/session.ts
lib/auth/apiKeys.ts
lib/ingest/claudeHooks.ts
lib/ingest/process.ts
lib/risk/engine.ts
lib/client/useSessions.ts
```
Existing routes to keep:
```text
app/api/ingest/route.ts
app/api/sessions/route.ts
app/page.tsx
components/dashboard/*
```
## 11. Deployment And Env Vars
Deploy one Next.js app on Vercel.
MVP env vars:
```text
CS_BLOCK_CRITICAL=false
CODESENTINEL_DEMO_MODE=true
CODESENTINEL_INGEST_URL=https://<deployment>/api/ingest
ANTHROPIC_API_KEY=<optional>
```
DB-backed env var later:
```text
DATABASE_URL=<supabase pooled connection string>
```
## 12. Dashboard Updates Needed
Dashboard should show:
- Live sessions.
- Session timeline.
- Risk flags.
- Severity and action separately.
- Suggested fix text.
- Employee connection status.
- Employee last seen time.
Severity answers: how bad is it?  
Action answers: what should CodeSentinel do/show?
## 13. Implementation Order
1. Define domain types and in-memory store.
2. Seed demo org, CTO/admin, two employees, two roles, rules, and keys.
3. Implement human admin session shortcut.
4. Implement agent API-key auth.
5. Normalize Claude hook events.
6. Implement Risk Engine with deterministic demo rules.
7. Store sessions/events/flags.
8. Render employee connection status and last seen.
9. Add blocking toggle for `PreToolUse`.
10. Add Supabase Postgres + Drizzle after in-memory loop works.
11. Add real admin screens after monitoring loop works.
## 14. Out Of Scope Until Monitoring Works
- Self-serve vibe-coder signup.
- Product-link/context ingestion.
- Cursor/Copilot integrations.
- Full approval workflow.
- Applying suggested fixes automatically.
- Persistent database as the first implementation step.
- Real admin CRUD screens as the first implementation step.
## 15. Open Question
Should real admin CRUD screens be added after the monitoring demo is stable?
