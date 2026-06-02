FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/bot/package.json apps/bot/
RUN pnpm install --frozen-lockfile
COPY apps/bot apps/bot
RUN pnpm --filter @baby-tracker/bot build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/apps/bot
CMD ["node", "dist/index.js"]
