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
# Copy full source
# -----------------------------------------------------
COPY apps/backend ./apps/backend
COPY apps/packages/shared ./apps/packages/shared

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

# Copy category type images (needed for seeding default category types)
# These images are used by CategoryTypeService to seed default category types on startup
# Copy to both root assets and apps/backend/assets for path compatibility
COPY --from=builder /opt/bk_notification_service/apps/backend/assets ./assets
COPY --from=builder /opt/bk_notification_service/apps/backend/assets ./apps/backend/assets

# Install production dependencies (rebuilds native modules like bcrypt for correct architecture)
# Try workspace install first, fallback to installing all deps if needed (ensures @nestjs/core is available)
WORKDIR /opt/bk_notification_service
RUN npm ci --legacy-peer-deps --omit=dev --workspace=apps/backend --workspace=apps/packages/shared 2>&1 || \
    (echo "⚠️  Workspace install with --omit=dev failed, installing all dependencies to ensure availability..." && \
     npm ci --legacy-peer-deps --workspace=apps/backend --workspace=apps/packages/shared 2>&1 || \
     (echo "⚠️  Workspace install failed, trying individual installs..." && \
      cd apps/backend && npm ci --legacy-peer-deps && \
      cd ../packages/shared && npm ci --legacy-peer-deps || true))

# Verify @nestjs/core is actually installed and can be required
WORKDIR /opt/bk_notification_service
RUN NODE_PATH=/opt/bk_notification_service/node_modules:/opt/bk_notification_service/apps/backend/node_modules:$NODE_PATH \
  node -e "try { const core = require('@nestjs/core'); console.log('✅ @nestjs/core found, version:', core.VERSION || 'unknown'); } catch(e) { console.error('❌ @nestjs/core NOT FOUND - this will cause runtime errors!'); console.error('   Error:', e.message); console.error('   Searching for @nestjs...'); require('child_process').exec('find . -name \"@nestjs\" -type d 2>/dev/null | head -5', (err, stdout) => { console.log(stdout || '  No @nestjs directories found'); process.exit(1); }); }"

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
