# 🔧 Fix Frontend SSL Certificate Error

## Problem
Frontend container is restarting because nginx is trying to load SSL certificates that don't exist:
```
cannot load certificate "/etc/nginx/ssl/fullchain.pem": No such file or directory
```

## Solution
I've updated `docker-compose.production.yml` to use `nginx-http-only.conf` instead of `nginx-domain.conf`. This allows the frontend to work without SSL certificates.

## Next Steps

**On the production server, run:**

```bash
# 1. Stop the frontend container
docker-compose -f docker-compose.production.yml stop frontend

# 2. Remove the frontend container
docker-compose -f docker-compose.production.yml rm -f frontend

# 3. Start the frontend container with the new config
docker-compose -f docker-compose.production.yml up -d frontend

# 4. Check if it's running
docker-compose -f docker-compose.production.yml ps

# 5. Check frontend logs
docker-compose -f docker-compose.production.yml logs frontend
```

## Expected Result

- Frontend container should show "Up" status (not "Restarting")
- You should be able to access: `http://10.20.6.58`
- Backend API is already working: `http://10.20.6.58:8080/api/v1/health`

## When You Have SSL Certificates

Once you have SSL certificates (`fullchain.pem` and `privkey.pem` in `ssl-certs/` directory), you can switch back to `nginx-domain.conf`:

1. Add SSL certificates to `ssl-certs/` directory
2. Change docker-compose back to use `nginx-domain.conf`
3. Restart frontend container

