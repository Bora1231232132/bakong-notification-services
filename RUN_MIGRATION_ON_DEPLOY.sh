#!/bin/bash
# Run Migration on Deployment
# This script runs automatically after git pull or deployment
# It ensures the database schema is up to date
# Usage: bash RUN_MIGRATION_ON_DEPLOY.sh

set -e

cd ~/bakong-notification-services

echo "🚀 Running Database Migration on Deployment"
echo "============================================"
echo ""

# Detect environment from docker-compose file or container names
if docker ps --format '{{.Names}}' | grep -q "^bakong-notification-services-db$"; then
    ENVIRONMENT="production"
elif docker ps --format '{{.Names}}' | grep -q "bakong-notification-services-db-sit"; then
    ENVIRONMENT="sit"
elif docker ps --format '{{.Names}}' | grep -q "bakong-notification-services-db-dev"; then
    ENVIRONMENT="dev"
else
    echo "⚠️  Could not detect environment, defaulting to production"
    ENVIRONMENT="production"
fi

echo "📋 Detected environment: $ENVIRONMENT"
echo ""

# Run migration
bash apps/backend/scripts/run-migration.sh "$ENVIRONMENT"

echo ""
echo "✅ Deployment migration completed!"

