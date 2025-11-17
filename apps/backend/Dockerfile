# -----------------------------------------------------
# 🏗️ Stage 1 — Build backend and shared packages
# -----------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /opt/bk_notification_service
ENV NODE_ENV=development

# -----------------------------------------------------
# Copy all package manifests
# -----------------------------------------------------
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/packages/shared/package*.json ./apps/packages/shared/

# -----------------------------------------------------
# Copy TypeScript configs
# -----------------------------------------------------
COPY tsconfig*.json ./
COPY apps/backend/tsconfig*.json ./apps/backend/
COPY apps/packages/shared/tsconfig*.json ./apps/packages/shared/
COPY apps/backend/nest-cli.json ./apps/backend/

# -----------------------------------------------------
# Install dependencies
# -----------------------------------------------------
RUN npm ci --legacy-peer-deps \
  && cd apps/backend && npm ci --legacy-peer-deps

# -----------------------------------------------------
# Copy full source (including fix-paths.js)
# -----------------------------------------------------
COPY apps/backend ./apps/backend
COPY apps/packages/shared ./apps/packages/shared
# Ensure fix-paths.js is executable
RUN chmod +x apps/backend/fix-paths.js || true

# Build shared first
WORKDIR /opt/bk_notification_service/apps/packages/shared
RUN npm run build

# Build backend
WORKDIR /opt/bk_notification_service/apps/backend
# Build TypeScript and fix paths
# Use npm exec to run tsc and tsc-alias (more reliable than npx in Alpine)
RUN npm exec -- tsc -p tsconfig.json && npm exec -- tsc-alias -p tsconfig.json
# Fix remaining src/ paths that tsc-alias might have missed
RUN node fix-paths.js

# -----------------------------------------------------
# 🚀 Stage 2 — Runtime
# -----------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /opt/bk_notification_service
ENV NODE_ENV=production

# Install build dependencies needed for native modules (bcrypt, etc.)
RUN apk add --no-cache python3 make g++

# Copy package files (needed for workspace structure)
COPY package*.json ./
COPY package-lock.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/packages/shared/package*.json ./apps/packages/shared/

# Copy built code
COPY --from=builder /opt/bk_notification_service/apps/backend/dist ./dist
COPY --from=builder /opt/bk_notification_service/apps/packages/shared/dist ./apps/packages/shared/dist

# Install production dependencies (rebuilds native modules like bcrypt for correct architecture)
# In workspace setup, install at root first to handle workspace dependencies
RUN npm ci --legacy-peer-deps --omit=dev || true
# Then install backend dependencies (workspace dependencies should be available)
RUN cd apps/backend && npm ci --legacy-peer-deps --omit=dev
# Install shared package dependencies if needed
RUN cd apps/packages/shared && npm ci --legacy-peer-deps --omit=dev || true

# Verify critical dependencies exist before removing build tools
RUN test -d node_modules/@nestjs/core || test -d apps/backend/node_modules/@nestjs/core \
  || (echo "❌ Missing @nestjs/core - checking locations..." && \
      echo "Root node_modules:" && ls -la node_modules/@nestjs 2>/dev/null || echo "  Not in root" && \
      echo "Backend node_modules:" && ls -la apps/backend/node_modules/@nestjs 2>/dev/null || echo "  Not in backend" && \
      echo "All @nestjs locations:" && find . -type d -name "@nestjs" 2>/dev/null | head -10 && \
      exit 1)

# Remove build dependencies to reduce image size (keep only runtime dependencies)
# Note: Native modules are already compiled, so build tools are no longer needed
RUN apk del python3 make g++

# Healthcheck - backend runs on port 8080 inside container
# Health endpoint is at /api/v1/health or /api/v1/management/healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/v1/health', (r) => { if (r.statusCode === 200) process.exit(0); else process.exit(1); }).on('error', () => process.exit(1))"

# Run from root directory but set NODE_PATH to include backend node_modules
# This allows Node.js to find modules in both root and backend node_modules
ENV NODE_PATH=/opt/bk_notification_service/node_modules:/opt/bk_notification_service/apps/backend/node_modules

# Copy runtime path resolver (handles src/ paths at runtime as fallback)
COPY --from=builder /opt/bk_notification_service/apps/backend/runtime-path-resolver.js ./runtime-path-resolver.js

# Use runtime resolver to handle any remaining src/ paths
CMD ["node", "-r", "./runtime-path-resolver.js", "dist/main.js"]
