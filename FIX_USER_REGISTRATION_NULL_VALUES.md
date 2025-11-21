# 🔧 Fix User Registration NULL Values

## Problem
When registering new users, some fields (`bakongPlatform`, `participantCode`, `fcmToken`) were showing as NULL/empty in the database.

## Solution
Added automatic inference logic to detect `bakongPlatform` from `participantCode` or `accountId` when not explicitly provided.

---

## Changes Made

### 1. Added `inferBakongPlatform()` Method
Automatically detects `bakongPlatform` from:
- **participantCode**: 
  - `BKRT*` → `BAKONG`
  - `BKJR*` → `BAKONG_JUNIOR`
  - `TOUR*` → `BAKONG_TOURIST`
- **accountId domain**:
  - `*@bkrt` → `BAKONG`
  - `*@bkjr` → `BAKONG_JUNIOR`
  - `*@tour` → `BAKONG_TOURIST`

### 2. Updated `syncUser()` Method
- **For new users**: Automatically infers `bakongPlatform` if not provided
- **For existing users**: Infers `bakongPlatform` if missing when `participantCode` is updated

---

## How It Works

### Example 1: New User with participantCode
```json
{
  "accountId": "user@bkrt",
  "participantCode": "BKRTKHPPXXX",
  "fcmToken": "...",
  "language": "KM"
}
```
**Result**: `bakongPlatform` = `BAKONG` (inferred from `BKRT` prefix)

### Example 2: New User with accountId domain
```json
{
  "accountId": "john@bkjr",
  "fcmToken": "...",
  "language": "EN"
}
```
**Result**: `bakongPlatform` = `BAKONG_JUNIOR` (inferred from `@bkjr`)

### Example 3: Existing User - Update participantCode
```json
{
  "accountId": "existing@bkrt",
  "participantCode": "TOURKHPPXXX"
}
```
**Result**: `bakongPlatform` = `BAKONG_TOURIST` (inferred from `TOUR` prefix)

---

## Testing

### Test on SIT Server:
1. Register a new user via `/api/v1/notification/send` or `/api/v1/notification/inbox`
2. Check database - `bakongPlatform` should be automatically set
3. Verify logs show inference messages:
   ```
   🔍 [syncUser] Inferred bakongPlatform for new user user@bkrt: BAKONG
   ```

### Test on Production Server:
Same as SIT - the fix works for both environments.

---

## Deployment Steps

### For SIT:
```bash
# 1. Pull latest code
cd ~/bakong-notification-services
git pull origin develop

# 2. Rebuild backend
docker-compose -f docker-compose.sit.yml build --no-cache backend

# 3. Restart services
docker-compose -f docker-compose.sit.yml restart backend

# 4. Check logs
docker-compose -f docker-compose.sit.yml logs -f backend
```

### For Production:
```bash
# 1. Pull latest code
cd ~/bakong-notification-services
git pull origin master

# 2. Rebuild backend
docker-compose -f docker-compose.production.yml build --no-cache backend

# 3. Restart services
docker-compose -f docker-compose.production.yml restart backend

# 4. Check logs
docker-compose -f docker-compose.production.yml logs -f backend
```

---

## Expected Behavior

### Before Fix:
- New users: `bakongPlatform` = `NULL`
- Existing users: `bakongPlatform` stays `NULL` even with `participantCode`

### After Fix:
- New users: `bakongPlatform` automatically inferred from `participantCode` or `accountId`
- Existing users: `bakongPlatform` inferred when `participantCode` is updated (if missing)
- Explicit `bakongPlatform` in request: Always takes priority (not overridden)

---

## Log Messages

You'll see these log messages when inference happens:

```
🔍 [syncUser] Inferred bakongPlatform for new user user@bkrt: BAKONG
📝 [syncUser] Creating new user user@bkrt with bakongPlatform: BAKONG
✅ [syncUser] Created user user@bkrt with bakongPlatform: BAKONG
```

---

## Notes

- **Priority**: Explicit `bakongPlatform` in request > Inferred from `participantCode` > Inferred from `accountId`
- **Existing users**: Only infers if `bakongPlatform` is currently `NULL`
- **Works for both SIT and Production**: Same logic applies to both environments

