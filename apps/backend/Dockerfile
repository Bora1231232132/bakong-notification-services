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

# Copy package files for workspace setup
COPY package*.json ./
COPY package-lock.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/packages/shared/package*.json ./apps/packages/shared/

# Copy built code
COPY --from=builder /opt/bk_notification_service/apps/backend/dist ./dist
COPY --from=builder /opt/bk_notification_service/apps/packages/shared/dist ./apps/packages/shared/dist

# Install production dependencies in runtime stage
# Using npm install --production instead of npm ci for better workspace compatibility
# npm ci can be too strict with workspaces and may miss dependencies
RUN npm install --production --legacy-peer-deps

CMD ["node", "dist/main.js"]
