FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/api/prisma apps/api/prisma
COPY apps/bot/package.json apps/bot/
COPY packages/shared/package.json packages/shared/
COPY packages/config/package.json packages/config/
RUN pnpm install --frozen-lockfile
COPY packages/shared packages/shared
COPY packages/config packages/config
COPY apps/bot apps/bot
COPY apps/api apps/api
RUN pnpm db:generate \
  && pnpm --filter @baby-tracker/shared build \
  && pnpm --filter @baby-tracker/config build \
  && pnpm --filter @baby-tracker/bot build \
  && pnpm --filter @baby-tracker/api build

FROM node:22-alpine AS runner
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production
COPY --from=build /app /app
COPY apps/api/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 3001
ENTRYPOINT ["/entrypoint.sh"]
