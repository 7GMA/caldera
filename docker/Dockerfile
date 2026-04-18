# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ─── Stage 2: Production deps only ───────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod

# ─── Stage 3: Runtime ────────────────────────────────────────────────────────
FROM gcr.io/distroless/nodejs22-debian12 AS runtime
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["dist/server.js"]
