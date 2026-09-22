# SkilloMetrics API (Express 5 + Prisma) — production image
# Build from the monorepo ROOT:  docker build -f apps/api/Dockerfile -t skillometrics-api .
#
# NOTE: npm hoists @prisma/client's generated engine + .prisma/client into the
# ROOT node_modules/, so every COPY of prisma artifacts uses root paths.
# NOT YET BUILD-TESTED — no Docker daemon was available on the authoring
# machine. Run a test build before relying on this image.
FROM node:20-alpine AS base
WORKDIR /app

# ── deps: full lockfile + every workspace manifest, then npm ci (reproducible)
# npm ci refuses to run with a partial package.json set, so all manifests are
# copied even though only the api workspace is installed.
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/ai/package.json apps/ai/package.json
RUN npm ci --workspace api --include-workspace-root --no-audit --no-fund

# ── build: compile TypeScript to dist/ and generate the Prisma client
FROM deps AS build
COPY apps/api/ apps/api/
# `prisma generate` runs from apps/api against its schema; with hoisting the
# client lands in /app/node_modules/.prisma + /app/node_modules/@prisma/client
RUN cd apps/api && npx prisma generate && npm run build

# ── runtime: production deps + compiled output only
FROM base AS runtime
ENV NODE_ENV=production
# Same manifests → `npm ci` reproduces the deps stage exactly, minus devDeps.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/ai/package.json apps/ai/package.json
RUN npm ci --workspace api --include-workspace-root --omit=dev --no-audit --no-fund

# Compiled server output
COPY --from=build /app/apps/api/dist/ apps/api/dist/
# Prisma artifacts (hoisted to the ROOT node_modules — NOT apps/api/node_modules)
COPY --from=build /app/node_modules/.prisma/ node_modules/.prisma/
COPY --from=build /app/node_modules/@prisma/ node_modules/@prisma/
# Schema is required at runtime by `prisma migrate deploy` in the entrypoint.
# IMPORTANT: build prod images with the schema in postgresql mode
# (npm run db:postgres) — migrations/ is pinned to postgresql via
# migration_lock.toml, and `migrate deploy` validates the provider.
COPY apps/api/prisma/ apps/api/prisma/

WORKDIR /app/apps/api
# Migrations run before the server starts (no-op when already applied)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/index.js"]
