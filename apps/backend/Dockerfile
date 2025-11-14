# ---- Base build stage ----
FROM node:20-alpine AS builder  

WORKDIR /opt/bk_notification_service
    
# Copy dependency manifests
COPY package*.json ./
COPY package-lock.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/backend/package-lock.json ./apps/backend/
COPY apps/packages/shared/package*.json ./apps/packages/shared/

# Install dependencies at root level (handles npm workspaces)
RUN npm ci

# Copy shared package source files
COPY apps/packages/shared ./apps/packages/shared

# Build shared package first (backend depends on it)
WORKDIR /opt/bk_notification_service/apps/packages/shared
RUN npm run build

# Copy backend source files
WORKDIR /opt/bk_notification_service
COPY apps/backend ./apps/backend

# Build backend
WORKDIR /opt/bk_notification_service/apps/backend
RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine

WORKDIR /opt/bk_notification_service
COPY --from=builder /opt/bk_notification_service/apps/backend/dist ./dist
COPY apps/backend/package*.json ./

RUN npm ci --omit=dev

CMD ["node", "dist/main.js"]
