FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/bot/package.json apps/bot/
RUN pnpm install --frozen-lockfile
COPY apps/bot apps/bot
RUN pnpm --filter @baby-tracker/bot build
CMD ["pnpm", "--filter", "@baby-tracker/bot", "dev"]
