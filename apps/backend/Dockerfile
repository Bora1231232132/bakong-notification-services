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
RUN npm run build

# -----------------------------------------------------
# 🚀 Stage 2 — Runtime
# -----------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /opt/bk_notification_service
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/packages/shared/package*.json ./apps/packages/shared/

# Copy built code and dependencies
COPY --from=builder /opt/bk_notification_service/node_modules ./node_modules
COPY --from=builder /opt/bk_notification_service/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /opt/bk_notification_service/apps/backend/dist ./dist
COPY --from=builder /opt/bk_notification_service/apps/packages/shared/dist ./apps/packages/shared/dist

# ✅ Ensure NestJS exists before starting
RUN test -d node_modules/@nestjs/core || test -d apps/backend/node_modules/@nestjs/core \
  || (echo "❌ Missing @nestjs/core in both root and backend node_modules" && exit 1)

# Healthcheck - backend runs on port 8080 inside container
# Health endpoint is at /api/v1/health or /api/v1/management/healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/v1/health', (r) => { if (r.statusCode === 200) process.exit(0); else process.exit(1); }).on('error', () => process.exit(1))"

CMD ["node", "dist/main.js"]
