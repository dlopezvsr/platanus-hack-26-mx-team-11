#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${CODESENTINEL_BASE_URL:-http://localhost:3000}"

curl -s "$BASE_URL/api/ingest" \
  -H "Authorization: Bearer cs_demo_finance" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"demo-finance-risk","cwd":"/Users/acme/refunds","hook_event_name":"UserPromptSubmit","prompt":"Export all customers to a CSV from the prod database"}'

printf "\n"

