FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile
COPY packages/shared packages/shared
COPY apps/worker apps/worker
RUN pnpm --filter @baby-tracker/shared build && pnpm --filter @baby-tracker/worker build
CMD ["pnpm", "--filter", "@baby-tracker/worker", "dev"]
