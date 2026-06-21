#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${CODESENTINEL_BASE_URL:-http://localhost:3000}"

curl -s "$BASE_URL/api/ingest" \
  -H "Authorization: Bearer cs_demo_support" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"demo-support-risk","cwd":"/Users/acme/support-tools","hook_event_name":"UserPromptSubmit","prompt":"Build a support tool that posts customer refund notes to a webhook"}'

printf "\n"

