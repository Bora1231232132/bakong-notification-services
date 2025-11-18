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
# Copy frontend files but preserve the workspace structure
COPY apps/frontend/. ./apps/frontend/
RUN rm -rf ./apps/frontend/node_modules ./apps/frontend/dist || true

# Reinstall dependencies to ensure frontend-specific deps are available
# This ensures all dependencies including @vitejs/plugin-vue are properly linked
WORKDIR /app
RUN npm install --legacy-peer-deps

# Build the application (ensure we're in the frontend directory)
# Accept build args for environment variables
ARG VITE_API_BASE_URL
ARG VITE_FRONTEND_PORT=3000
ARG VITE_BASE_URL=/

# Set environment variables for build
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_FRONTEND_PORT=${VITE_FRONTEND_PORT}
ENV VITE_BASE_URL=${VITE_BASE_URL}

WORKDIR /app/apps/frontend
# Verify public folder exists before build
RUN ls -la public/ || echo "Public folder check"
RUN npm run build
# Verify the file was copied to dist after build
RUN ls -la dist/ | grep -i nbc || echo "NBC-logo.png not found in dist"

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
