#!/usr/bin/env bash
# Pre-push quality gate: TypeScript, ESLint errors, CRM production build (Render + Vercel).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "${SKIP_PRE_PUSH_CHECKS:-}" == "1" ]]; then
  echo "pre-push: SKIP_PRE_PUSH_CHECKS=1 — skipping quality gate"
  exit 0
fi

echo "pre-push: backend tsc"
npx tsc --noEmit

echo "pre-push: CRM client tsc"
(cd client && npx tsc --noEmit)

echo "pre-push: CRM client eslint (errors fail the push)"
(cd client && npx eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 9999)

echo "pre-push: CRM client production build (dist + 404.html)"
(cd client && npm run build)
test -f client/dist/index.html
test -f client/dist/404.html

echo "pre-push: OK"
