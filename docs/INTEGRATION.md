# CodeSentinel — Claude Code Integration (PoC)

How a user's Claude Code session starts showing up in your admin console.
No executable, no SDK — two native Claude Code hooks pointed at your endpoint.

```
Claude Code  ──(http hook)──►  POST /api/ingest  ──►  rules engine  ──►  in-memory store
                                                                              │
   Admin console  ◄── poll /api/sessions every 1.5s ──────────────────────────┘
```

The session is grouped by Claude Code's own `session_id`. The user is identified
by the **bearer key** they put in `$CODESENTINEL_KEY`. That's the whole tracking model.

---

## 1. Run the app locally

```bash
cd platanus-hack-26-mx-team-11
npm install
cp .env.example .env.local      # optional; built-in dev key works without it
npm run dev                     # http://localhost:3000
```

Open <http://localhost:3000> — the console starts empty and fills as sessions connect.
Set `ANTHROPIC_API_KEY` in `.env.local` for real risk scoring (without it, events are
still recorded but every score is 0).

## 2. Expose it (only needed for users on another machine)

Same machine as Claude Code? Skip this — use `http://localhost:3000/api/ingest`.

For a teammate's machine, tunnel it:

```bash
npx ngrok http 3000
# → https://xxxx.ngrok-free.app   (use this as  https://playpen-playhouse-sustained.ngrok-free.dev below)
```

## 3. Give each user their key

Each user gets one bearer token. For the PoC the built-in dev key is `cs_dev_local`.
To issue real per-user keys, set `CODESENTINEL_KEYS` in `.env.local`:

```json
CODESENTINEL_KEYS={"cs_live_marisol":{"id":"u_marisol","name":"Marisol Ríos","team":"Support","email":"marisol@acme.com","orgId":"org_demo"}}
```

> Keep `orgId` as `org_demo` for now — that's the org the console reads (`app/api/sessions/route.ts`).

## 4. What the user pastes

**A. Add the key to their shell** (`~/.zshrc` or `~/.bashrc`):

```bash
echo 'export CODESENTINEL_KEY="cs_dev_local"' >> ~/.zshrc
source ~/.zshrc
```

**B. Add the hooks to `~/.claude/settings.json`** — replace ` https://playpen-playhouse-sustained.ngrok-free.dev` with
`http://localhost:3000` or your ngrok URL:

```json
{
  "hooks": {
    "SessionStart": [
      { "hooks": [ { "type": "http", "url": " https://playpen-playhouse-sustained.ngrok-free.dev/api/ingest", "headers": { "Authorization": "Bearer $CODESENTINEL_KEY" }, "allowedEnvVars": ["CODESENTINEL_KEY"] } ] }
    ],
    "UserPromptSubmit": [
      { "hooks": [ { "type": "http", "url": " https://playpen-playhouse-sustained.ngrok-free.dev/api/ingest", "headers": { "Authorization": "Bearer $CODESENTINEL_KEY" }, "allowedEnvVars": ["CODESENTINEL_KEY"] } ] }
    ],
    "PreToolUse": [
      { "matcher": "*", "hooks": [ { "type": "http", "url": " https://playpen-playhouse-sustained.ngrok-free.dev/api/ingest", "headers": { "Authorization": "Bearer $CODESENTINEL_KEY" }, "allowedEnvVars": ["CODESENTINEL_KEY"] } ] }
    ],
    "Stop": [
      { "hooks": [ { "type": "http", "url": " https://playpen-playhouse-sustained.ngrok-free.dev/api/ingest", "headers": { "Authorization": "Bearer $CODESENTINEL_KEY" }, "allowedEnvVars": ["CODESENTINEL_KEY"] } ] }
    ],
    "SessionEnd": [
      { "hooks": [ { "type": "http", "url": " https://playpen-playhouse-sustained.ngrok-free.dev/api/ingest", "headers": { "Authorization": "Bearer $CODESENTINEL_KEY" }, "allowedEnvVars": ["CODESENTINEL_KEY"] } ] }
    ]
  }
}
```

`allowedEnvVars` is **required** — without it Claude Code won't interpolate
`$CODESENTINEL_KEY` into the header.

## 5. Test the loop

In a new Claude Code session, type a deliberately risky prompt:

> *Build a tool to export all customers to a CSV I can email to the auditor.*

Within a couple of seconds the console shows a new live session, the prompt on the
timeline, and the analyst's score + any flags. The rating is contextual, not
keyword-based: "delete all tables on prod" scores high even if the next message
says "it's just a demo", while "hola" scores 0.

Quick check without Claude Code — simulate a hook event:

```bash
curl -s http://localhost:3000/api/ingest \
  -H "Authorization: Bearer cs_dev_local" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test-1","cwd":"/Users/me/refund-bot","hook_event_name":"UserPromptSubmit","prompt":"connect to the production database and dump all users"}'
```

Then refresh the console — `refund-bot` appears with a critical flag.

---

## Flag now, block later

By default every event is **flagged** and shown — Claude Code is never interrupted.
To have a `PreToolUse` event that trips a **critical** rule get denied (Claude refuses
the tool call), set in `.env.local`:

```bash
CS_BLOCK_CRITICAL=true
```

The endpoint then returns a `permissionDecision: "deny"` payload for that call.

## Where things live

| Concern | File |
|---|---|
| Hook receiver | `app/api/ingest/route.ts` |
| Dashboard feed | `app/api/sessions/route.ts` |
| Claude payload → domain | `lib/ingest/process.ts`, `lib/ingest/claudeHooks.ts` |
| Risk analyst (LLM) | `lib/risk/analyzer.ts` |
| Analyst role / prompt | `lib/risk/systemPrompt.ts` |
| Key → user | `lib/auth/apiKeys.ts` |
| Store (swap for Postgres later) | `lib/store/memory.ts` |
| Console UI | `components/dashboard/*` |

## Production hardening (post-PoC)

- Swap `lib/store/memory.ts` for Postgres/Drizzle behind the same `Store` interface.
- Replace polling (`lib/client/useSessions.ts`) with SSE or Pusher.
- Add a deterministic pre-filter before the LLM analyst to cut cost on obvious cases.
- Run analysis as fire-and-forget so the hook returns instantly (needs a durable store first).
- Distribute as a Claude Code **plugin** (`hooks/hooks.json`) or push via managed
  settings so admins can enforce it org-wide and users can't disable it.
- Redact secrets/PII client-side before sending if data must not leave the laptop
  (swap the `http` hook for a thin local `command` hook that strips then forwards).
