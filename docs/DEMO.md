# CodeSentinel Team Demo Runbook

Use this to show the team the demo start to finish.

## 1. Start Clean

Stop any old dev server, then run:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:3000
```

Say:

> The CTO has already set up a company workspace, two employee roles, and rules for those roles.

Point at:

```text
Expected employees
- Finance Employee
- Support Employee
```

Both should start as `not connected`.

## 2. Explain The Model

Say:

> The CTO teaches CodeSentinel what is risky for each role. A Finance vibe coder has different rules than a Support vibe coder. When Claude Code sends an event, CodeSentinel knows the employee, the role, and the rules that apply.

## 3. Trigger Finance Risk

In another terminal:

```bash
npm run demo:finance
```

Refresh or wait for polling.

Show:

```text
Finance Employee -> active
Risk score -> 95
Flags:
- personal_data / critical / require approval
- unsafe_code / critical / block
```

Say:

> This employee tried to export customer data and touch the production database, so the Risk Engine created two flags.

## 4. Trigger Support Risk

```bash
npm run demo:support
```

Show:

```text
Support Employee -> active
company_policy / medium / warn
```

Say:

> Support has a different role, but global company policy still catches external API or webhook usage.

## 5. Show Missing Hook Story

Point at any employee still not reporting, or restart the app for a clean state.

Say:

> For MVP, CodeSentinel cannot force hooks to stay installed on a personal machine. What it can do is show whether expected employees are reporting events.

## 6. Close With Scope

In scope:

```text
seeded CTO setup
two employees
Claude Code hooks
Risk Engine
dashboard flags
missing-hook visibility
```

Out of scope for this demo:

```text
Vercel/Supabase
real admin CRUD screens
full approval workflow
Cursor/Copilot integrations
automatic code changes
```

