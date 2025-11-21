# 🔧 Fix Docker Compose Commands

## Problem
The server uses `docker-compose` (with hyphen) instead of `docker compose` (with space).

## Solution

Use `docker-compose` instead of `docker compose`:

### ❌ Wrong (causes error):
```bash
docker compose -f docker-compose.production.yml down
```

### ✅ Correct:
```bash
docker-compose -f docker-compose.production.yml down
```

---

## Corrected Commands for Production Server

```bash
# 1. Stop containers
docker-compose -f docker-compose.production.yml down

# 2. Remove old backend image
docker rmi bakong-notification-services-backend 2>/dev/null || true

# 3. Rebuild backend
docker-compose -f docker-compose.production.yml build --no-cache backend

# 4. Start services
docker-compose -f docker-compose.production.yml up -d

# 5. Check logs
docker-compose -f docker-compose.production.yml logs -f backend
```

---

## For SIT Server

```bash
# Use docker-compose (with hyphen) for SIT too
docker-compose -f docker-compose.sit.yml down
docker-compose -f docker-compose.sit.yml build --no-cache backend
docker-compose -f docker-compose.sit.yml up -d
docker-compose -f docker-compose.sit.yml logs -f backend
```

---

## Quick Reference

**Old format (docker-compose):**
- `docker-compose -f <file> <command>`

**New format (docker compose):**
- `docker compose -f <file> <command>`

Your server uses the **old format**, so always use `docker-compose` (with hyphen).

