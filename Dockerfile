# ── Stage 1: Dependencies ───────────────────────────────────────────────
FROM oven/bun:1-alpine AS deps
WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package.json bun.lock tsconfig.json turbo.json ./
COPY packages/env/package.json ./packages/env/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/auth/package.json ./packages/auth/
COPY packages/api/package.json ./packages/api/
COPY packages/ui/package.json ./packages/ui/
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY apps/e2e/package.json ./apps/e2e/

# Install all dependencies
RUN bun install --frozen-lockfile

# ── Stage 2: Build ──────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Copy dependencies from stage 1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/env/node_modules ./packages/env/node_modules
COPY --from=deps /app/packages/config/node_modules ./packages/config/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/auth/node_modules ./packages/auth/node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/apps/e2e/node_modules ./apps/e2e/node_modules

# Copy source code
COPY . .

# Build all packages and apps
RUN bun run build

# ── Stage 3: Runtime (Server) ──────────────────────────────────────────
FROM oven/bun:1-alpine AS runtime
WORKDIR /app

# Copy built artifacts and needed runtime files
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/apps/server/tsconfig.json ./apps/server/
COPY --from=builder /app/packages ./packages

# Copy node_modules for runtime (production only)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/env/node_modules ./packages/env/node_modules
COPY --from=builder /app/packages/config/node_modules ./packages/config/node_modules
COPY --from=builder /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=builder /app/packages/auth/node_modules ./packages/auth/node_modules
COPY --from=builder /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules

# Copy workspace manifests
COPY package.json bun.lock tsconfig.json turbo.json ./

ENV NODE_ENV=production

EXPOSE 3000

CMD ["bun", "run", "start:server"]
