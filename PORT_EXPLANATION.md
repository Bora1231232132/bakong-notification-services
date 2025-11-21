# Port Configuration Explanation

## Port Mapping Overview

Your services use **different ports** - there's no conflict:

### Ports Exposed to Host (Internet)

| Service | Host Port | Container Port | Purpose |
|---------|-----------|----------------|---------|
| **Frontend** | `80` | `80` | HTTP (web traffic) |
| **Frontend** | `443` | `443` | HTTPS (secure web traffic) |
| **Backend** | `8080` | `8080` | API (direct API access) |
| **Database** | `5433` | `5432` | PostgreSQL (database) |

## How It Works

### External Access (From Internet)

```
Internet → Frontend (Port 80/443) → Nginx → Backend (internal)
Internet → Backend (Port 8080) → Direct API access
```

### Internal Communication (Docker Network)

```
Frontend Container (nginx)
  ├─ Port 80/443 (exposed to host)
  └─ Proxies /api/* → http://backend:8080 (internal Docker network)
  
Backend Container
  ├─ Port 8080 (exposed to host for direct access)
  └─ Listens on 8080 internally
  
Database Container
  ├─ Port 5433 (exposed to host)
  └─ Listens on 5432 internally
```

## Why This Works

1. **No Port Conflicts**: Each service uses different ports
   - Frontend: 80, 443
   - Backend: 8080
   - Database: 5433

2. **Nginx Proxy**: Frontend nginx receives requests on port 80/443, then:
   - Serves static files (HTML, CSS, JS) directly
   - Proxies `/api/*` requests to `backend:8080` (internal Docker network)

3. **Internal vs External**:
   - **External**: Users access via `http://10.20.6.58` or `https://bakong-notification.nbc.gov.kh`
   - **Internal**: Frontend talks to backend via Docker network name `backend:8080`

## Access Patterns

### Normal User Access (Recommended)
```
Browser → https://bakong-notification.nbc.gov.kh (Port 443)
  → Frontend Nginx (Port 443)
    → Serves frontend files
    → Proxies /api/* to backend:8080 (internal)
```

### Direct API Access (For Testing)
```
curl http://10.20.6.58:8080/api/v1/health
  → Backend directly (Port 8080)
```

### Database Access (For Admin)
```
psql -h 10.20.6.58 -p 5433 -U bkns -d bakong_notification_services
  → Database (Port 5433)
```

## Port Summary

✅ **Frontend**: 80 (HTTP), 443 (HTTPS) - Web traffic  
✅ **Backend**: 8080 - API (can be accessed directly or via frontend proxy)  
✅ **Database**: 5433 - PostgreSQL  

**No conflicts!** Each service has its own unique port.

