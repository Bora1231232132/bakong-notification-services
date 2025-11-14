# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files for workspace setup
COPY package*.json ./
COPY package-lock.json ./

# Copy root tsconfig.json (needed by shared package)
COPY tsconfig.json ./

# Copy shared package files
COPY apps/packages/shared/package*.json ./apps/packages/shared/

# Copy frontend package files
COPY apps/frontend/package*.json ./apps/frontend/

# Install workspace dependencies at root level
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copy shared package source and build it
COPY apps/packages/shared/tsconfig.json ./apps/packages/shared/
COPY apps/packages/shared/src ./apps/packages/shared/src
WORKDIR /app/apps/packages/shared
RUN npm run build

# Copy frontend source code (exclude node_modules and dist to avoid conflicts)
WORKDIR /app
# Use .dockerignore or copy selectively - copy everything except node_modules and dist
COPY apps/frontend/. ./apps/frontend/
RUN rm -rf ./apps/frontend/node_modules ./apps/frontend/dist || true

# Build the application (ensure we're in the frontend directory)
WORKDIR /app/apps/frontend
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
