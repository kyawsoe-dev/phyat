#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/deploy.sh [environment]
#   environment: preview | production (default: preview)

MODE="${1:-preview}"
FLAG=""
if [ "$MODE" = "production" ]; then
  FLAG="--prod"
fi

echo "=== Building API (NestJS) ==="
npm --workspace=@phyat/api run build

echo ""
echo "=== Deploying Web (Next.js) ==="
npx vercel deploy apps/web \
  --project phyat-web \
  $FLAG \
  --yes

echo ""
echo "=== Deploying API (NestJS) ==="
npx vercel deploy apps/api \
  --project phyat-api \
  $FLAG \
  --yes

echo ""
echo "Done! Both deployed."
