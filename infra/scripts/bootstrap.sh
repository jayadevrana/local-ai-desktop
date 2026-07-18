#!/usr/bin/env bash
set -euo pipefail

corepack enable
pnpm install
cp apps/api/.env.example apps/api/.env 2>/dev/null || true
cp apps/worker/.env.example apps/worker/.env 2>/dev/null || true
cp apps/web/.env.example apps/web/.env.local 2>/dev/null || true
pnpm db:generate

echo "Bootstrap complete. Start infra with docker compose up -d and then run pnpm dev."
