# platanus-hack-26-mx-team-11
# CodeSentinel

**AI Coding Security & Observability Platform for Citizen Developers**

Real-time monitoring, risk detection, and protection for non-technical employees building internal tools with Claude Code, Cursor, GitHub Copilot, and other AI coding assistants.

---

## Table of Contents

- [Overview](#overview)
- [The Problem](#the-problem)
- [Value Proposition](#value-proposition)
- [Core Features](#core-features)
- [Architecture](#architecture)
- [Data Model](#data-model)
- [Ingestion Pipeline](#ingestion-pipeline)
- [Tech Stack](#tech-stack)
- [Repository Layout](#repository-layout)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Integrations](#integrations)
- [Roadmap](#roadmap)

---

## Overview

CodeSentinel is a SaaS platform that gives IT, Security, and Engineering teams complete visibility and control over AI-assisted coding by "vibe coders" — non-technical employees experimenting with AI tools to build internal scripts, automations, and dashboards.

It ships as a **single TypeScript/Next.js application** deployable on Vercel, keeping infrastructure minimal while supporting real-time observability, risk scoring, and policy enforcement.

---

## The Problem

Organizations are rapidly adopting AI coding assistants, but most monitoring tools are built for professional engineers and tied to a single vendor. This creates a blind spot known as **shadow AI development**: employees generate and run code through powerful LLMs with no oversight, exposing the company to data leaks, insecure code, compliance violations, and prompt-based attacks.

Existing solutions (native Claude/Copilot analytics, generic LLM proxies, APM agents) each cover a slice of the problem but none unify it across tools or translate risk into plain English for non-technical users. CodeSentinel fills that gap.

---

## Value Proposition

- **Unified observability** across multiple AI coding tools, not just one vendor.
- **Real-time risk flagging** with plain-English explanations and suggested fixes.
- **Non-intrusive by design** — guides and corrects rather than blocking creativity.
- **Compliance-ready** — session replays and one-click reports for SOC 2, GDPR, and internal audits.
- **Single-repo, Vercel-native** — fast to deploy and iterate.

---

## Core Features

### Admin Dashboard
- Live view of active AI coding sessions across the organization.
- Session timeline replay: prompt → AI response → code change → tool call.
- Risk heatmap and severity scoring per user, team, and tool.
- Policy rules engine (e.g., block PII, restrict external API calls, require approval for DB writes).
- One-click report export (PDF/CSV) for compliance reviews.

### Risk Detection Engine
- **Prompt injection / jailbreak attempts**
- **Sensitive data exposure** (PII, secrets, internal paths)
- **Insecure code patterns** (hardcoded credentials, unsafe dependencies, SQL injection risk)
- **Overly permissive tool use** (e.g., risky shell commands executed via Claude Code)
- **Behavioral anomalies** (unusual coding patterns or high-risk instructions)

### Employee Experience
- Lightweight notifications inside the AI coding tool via hooks or extensions.
- Friendly inline suggestions: *"This action might expose customer data — here's a safer alternative."*
- Optional canary-token mode for sensitive sessions to detect exfiltration.

---

## Architecture

CodeSentinel runs as a single Next.js application. The frontend, API layer, and risk-analysis logic live in one monorepo and deploy together to Vercel as serverless functions plus a static/edge frontend.

```
┌──────────────────────────────────────────────────────────────┐
│                     AI Coding Tools                          │
│        Claude Code  ·  GitHub Copilot  ·  Cursor             │
└───────────────┬──────────────────────────────────────────────┘
                │  hooks / extension / proxy telemetry
                ▼
┌──────────────────────────────────────────────────────────────┐
│            Next.js App (Vercel, single repo)                 │
│                                                              │
│  /api/ingest  ──►  Risk Engine  ──►  PostgreSQL (Neon)       │
│   (serverless)     (rules + LLM judge)      ▲                │
│                                             │                │
│  Admin Dashboard (React) ◄── Realtime ◄─────┘                │
│        (timeline, heatmap, policies)   (Pusher / Vercel KV)  │
└──────────────────────────────────────────────────────────────┘
```

**Components**

- **Frontend** — Next.js (App Router) + React + TailwindCSS + shadcn/ui, with Recharts/Tremor for timelines and heatmaps.
- **API layer** — Next.js API routes and Server Actions running as Vercel serverless functions.
- **Risk engine** — A shared package combining a deterministic rules engine with an LLM-as-judge step for nuanced scoring.
- **Realtime** — Pusher or Vercel KV pub/sub to push live session updates to the dashboard.
- **Database** — PostgreSQL (Neon or Supabase) accessed through Drizzle ORM, with sensitive content encrypted at rest.
- **Auth** — Clerk or NextAuth.js with SSO support for enterprise.

---

## Data Model

```ts
// packages/shared/src/schema.ts

export type Role = 'admin' | 'employee';
export type Tool = 'claude' | 'copilot' | 'cursor';

export interface User {
  id: string;
  email: string;
  role: Role;
  orgId: string;
}

export interface Session {
  id: string;
  userId: string;
  tool: Tool;
  startedAt: Date;
  endedAt?: Date;
  status: 'active' | 'completed';
  riskScore: number; // 0–100, rolling aggregate of event flags
}

export interface Event {
  id: string;
  sessionId: string;
  timestamp: Date;
  type: 'prompt' | 'response' | 'code_change' | 'tool_call';
  content: string;                 // encrypted / redacted at rest
  metadata: Record<string, unknown>;
  riskFlags: RiskFlag[];
}

export interface RiskFlag {
  id: string;
  eventId: string;
  category: 'pii' | 'injection' | 'insecure' | 'policy';
  severity: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;             // plain-English description
  suggestedFix?: string;
  confidence: number;              // 0–1
}

export interface Policy {
  id: string;
  orgId: string;
  name: string;
  rule: string;                    // e.g. "block:external_api", "approve:db_write"
  enabled: boolean;
}
```

**Relationships**

- An `Org` has many `User`s and `Policy`s.
- A `User` has many `Session`s.
- A `Session` has many `Event`s.
- An `Event` has many `RiskFlag`s.

---

## Ingestion Pipeline

1. **Capture** — Claude Code hooks (or Copilot/Cursor extensions) emit prompts, responses, code changes, and tool calls.
2. **Forward** — Each event is `POST`ed to a single unified endpoint: `/api/ingest`.
3. **Analyze** — The risk engine runs deterministic rules first (fast, cheap), then escalates ambiguous cases to an LLM judge for scoring and explanation.
4. **Persist** — Events and their `RiskFlag`s are written to PostgreSQL; session `riskScore` is recomputed.
5. **Push** — Updates stream to the admin dashboard in real time via Pusher / Vercel KV.

---

## Tech Stack

| Layer        | Choice                                              |
|--------------|-----------------------------------------------------|
| Framework    | Next.js (App Router, Server Actions)                |
| Language     | TypeScript                                          |
| Styling      | TailwindCSS + shadcn/ui + Radix                     |
| Charts       | Recharts or Tremor                                  |
| Database     | PostgreSQL (Neon / Supabase) via Drizzle ORM        |
| Auth         | Clerk (or NextAuth.js) with SSO                      |
| Realtime     | Pusher or Vercel KV                                  |
| LLM judge    | Groq (fast/cheap primary), Anthropic fallback       |
| Deployment   | Vercel                                              |

---

## Repository Layout

```
codesentinel/
├── apps/
│   └── web/              # Next.js app: dashboard + API routes
├── packages/
│   ├── shared/           # Shared types, Zod schemas, utilities
│   ├── guard/            # Risk detection: rules engine + LLM judge
│   └── hooks/            # Claude hook examples + ingestion helpers
├── .env.example
├── package.json
└── pnpm-workspace.yaml
```

---

## Getting Started

```bash
git clone <repo-url>
cd codesentinel
pnpm install
cp .env.example .env.local   # fill in values (see below)
pnpm db:push                 # apply Drizzle schema
pnpm dev                     # http://localhost:3000
```

---

## Environment Variables

```bash
# .env.example

DATABASE_URL=postgres://...          # Neon / Supabase connection string
CLERK_SECRET_KEY=...                 # or NEXTAUTH_SECRET
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...

GROQ_API_KEY=...                     # primary LLM judge
ANTHROPIC_API_KEY=...                # fallback LLM judge

PUSHER_APP_ID=...                    # realtime (optional if using Vercel KV)
PUSHER_KEY=...
PUSHER_SECRET=...

INGEST_SHARED_SECRET=...             # auth token for /api/ingest
```

---

## Integrations

| Tool             | Method                                                            | Status   |
|------------------|------------------------------------------------------------------|----------|
| Claude Code      | Official hooks + MCP server forwarding to `/api/ingest`          | MVP      |
| GitHub Copilot   | Enterprise audit logs + LLM proxy layer                         | MVP      |
| Cursor / VS Code | Custom extension telemetry                                       | MVP      |
| OpenAI Codex     | Proxy/extension via unified ingestion endpoint                  | Future   |
| SIEM (Splunk, Datadog) | Outbound event forwarding                                 | Future   |

---

## Roadmap

- **Auto-remediation agents** — propose and open PRs with safer code automatically.
- **SIEM integrations** — forward flagged events to Splunk/Datadog.
- **Training modules** — in-context guidance to upskill citizen developers.
- **Anomaly detection** — baseline per-user behavior and flag deviations.

---

## Monetization

Freemium for small teams, with enterprise seats and usage-based pricing for larger organizations. Go-to-market targets mid-market companies adopting AI coding tools heavily.
