#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/deploy.sh [environment]
#   environment: preview | production (default: preview)

MODE="${1:-preview}"
FLAG=""
if [ "$MODE" = "production" ]; then
  FLAG="--prod"
fi

echo "=== Deploying Web (Next.js) ==="
npx vercel deploy apps/web \
  --project phyat-web \
  --token "$VERCEL_TOKEN" \
  $FLAG \
  --yes

echo ""
echo "=== Deploying API (NestJS) ==="
npx vercel deploy apps/api \
  --project phyat-api \
  --token "$VERCEL_TOKEN" \
  $FLAG \
  --yes

echo ""
echo "Done! Both deployed."
