FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/api/prisma apps/api/prisma
COPY packages/shared/package.json packages/shared/
COPY packages/config/package.json packages/config/
RUN pnpm install --frozen-lockfile
COPY packages/shared packages/shared
COPY packages/config packages/config
COPY apps/api apps/api
RUN pnpm db:generate \
  && pnpm --filter @baby-tracker/shared build \
  && pnpm --filter @baby-tracker/config build \
  && pnpm --filter @baby-tracker/api build
CMD ["pnpm", "--filter", "@baby-tracker/api", "dev"]
