# CodeSentinel Claude Code Integration

CodeSentinel watches Claude Code through HTTP hooks.

```text
Claude Code hook
  -> POST /api/ingest
  -> agent key maps to employee
  -> employee maps to org + role
  -> Risk Engine applies role rules
  -> dashboard polls /api/sessions
```

## Local Demo Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:3000
```

Expected empty state:

```text
Finance Employee -> not connected
Support Employee -> not connected
```

## Seeded Employees

| Employee | Role | Demo API key |
|---|---|---|
| `finance.employee@acme.test` | Finance Vibe Coder | `cs_demo_finance` |
| `support.employee@acme.test` | Support Vibe Coder | `cs_demo_support` |

## Simulate Claude Code Events

Finance critical event:

```bash
npm run demo:finance
```

Expected dashboard result:

```text
Finance Employee -> active
Risk score -> 95
Flags:
- personal_data / critical / require approval
- unsafe_code / critical / block
```

Support policy event:

```bash
npm run demo:support
```

Expected dashboard result:

```text
Support Employee -> active
Flags:
- company_policy / medium / warn
```

Inspect raw feed:

```bash
npm run demo:sessions
```

## Real Claude Code Hook Config

Use one of the seeded keys:

```bash
export CODESENTINEL_KEY="cs_demo_finance"
```

Add hooks to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "http",
            "url": "http://localhost:3000/api/ingest",
            "headers": {
              "Authorization": "Bearer $CODESENTINEL_KEY"
            },
            "allowedEnvVars": ["CODESENTINEL_KEY"]
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "http",
            "url": "http://localhost:3000/api/ingest",
            "headers": {
              "Authorization": "Bearer $CODESENTINEL_KEY"
            },
            "allowedEnvVars": ["CODESENTINEL_KEY"]
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "http",
            "url": "http://localhost:3000/api/ingest",
            "headers": {
              "Authorization": "Bearer $CODESENTINEL_KEY"
            },
            "allowedEnvVars": ["CODESENTINEL_KEY"]
          }
        ]
      }
    ]
  }
}
```

`allowedEnvVars` is required so Claude Code can interpolate `$CODESENTINEL_KEY`.

## Blocking Toggle

Default:

```text
CS_BLOCK_CRITICAL=false
```

This means CodeSentinel shows `block` on the dashboard but does not interrupt Claude Code.

To demo a hard block for matching `PreToolUse` events:

```text
CS_BLOCK_CRITICAL=true
```

Then restart `npm run dev`.

## Hook Removal / Missing Hook Detection

The MVP cannot prevent a user from deleting local hooks from their own machine.
It detects absence:

```text
not connected
active
stale
missing hooks suspected
```

The dashboard shows expected employees even before they connect, so the CTO can see who is not reporting.

