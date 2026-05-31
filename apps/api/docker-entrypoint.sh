#!/bin/sh
set -e

cd /app
pnpm --filter @baby-tracker/api prisma:migrate:deploy
exec node apps/api/dist/main.js
