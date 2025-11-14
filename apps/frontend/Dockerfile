# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files for workspace setup
COPY package*.json ./

# Copy root tsconfig.json (needed by shared package)
COPY tsconfig.json ./

# Copy frontend package files first
COPY apps/frontend/package*.json ./apps/frontend/

# Install all dependencies (including dev dependencies for build)
# Handle both cases: with and without package-lock.json
WORKDIR /app/apps/frontend
RUN if [ -f package-lock.json ]; then npm ci --legacy-peer-deps; else npm install --legacy-peer-deps; fi

# Copy shared package AFTER npm install
# Vite error shows it's looking for /app/apps/packages/shared/src
# This means vite resolves '../packages/shared' from /app/apps/frontend as /app/apps/packages/shared
# So we need to place it there
COPY apps/packages/shared /app/apps/packages/shared

# Copy frontend source code (this needs to happen after npm install to preserve node_modules)
COPY apps/frontend .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose ports
EXPOSE 80 443

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
