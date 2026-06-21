#!/usr/bin/env bash
# Applies supabase/migrations/*.sql in filename order over a single connection.
# Requires SUPABASE_DB_URL (the Supabase Postgres connection string).
#
# Get it from: Supabase Dashboard -> Project Settings -> Database ->
# "Connection string" -> URI (use the "Session pooler" or "Direct connection").
# It looks like:
#   postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
#
# Usage:
#   SUPABASE_DB_URL="postgresql://..." ./scripts/apply-migrations.sh
# or put SUPABASE_DB_URL=... in .env.local and run:
#   ./scripts/apply-migrations.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Load SUPABASE_DB_URL from .env.local if not already set.
if [[ -z "${SUPABASE_DB_URL:-}" && -f "$ROOT/.env.local" ]]; then
  line="$(grep -E '^SUPABASE_DB_URL=' "$ROOT/.env.local" || true)"
  if [[ -n "$line" ]]; then
    SUPABASE_DB_URL="${line#SUPABASE_DB_URL=}"
    SUPABASE_DB_URL="${SUPABASE_DB_URL%\"}"; SUPABASE_DB_URL="${SUPABASE_DB_URL#\"}"
  fi
fi

if [[ -z "${SUPABASE_DB_URL:-}" || "$SUPABASE_DB_URL" == *"YOUR-"* ]]; then
  echo "ERROR: SUPABASE_DB_URL is not set (or still a placeholder)." >&2
  echo "Set it in .env.local or pass it inline. See header of this script." >&2
  exit 1
fi

echo "Applying migrations to Supabase..."
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "  -> $(basename "$f")"
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$f"
done
echo "Done. All migrations applied."
