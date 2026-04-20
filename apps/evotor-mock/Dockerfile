FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/evotor-mock/package.json ./apps/evotor-mock/package.json

RUN pnpm install --frozen-lockfile

COPY apps/evotor-mock ./apps/evotor-mock

RUN pnpm --dir apps/evotor-mock build

EXPOSE 3001

CMD ["pnpm", "--dir", "apps/evotor-mock", "start"]
