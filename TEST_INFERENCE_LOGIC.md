# 🧪 Test Inference Logic

## Issue Found

The `participantCode` field was missing from `SentNotificationDto`, so it was never being passed to `updateUserData()`. This meant:
- New users couldn't have `bakongPlatform` inferred from `participantCode`
- Only `accountId` pattern matching would work (e.g., `user@bkrt`)

## Fixes Applied

1. ✅ Added `participantCode` field to `SentNotificationDto`
2. ✅ Updated controller to pass `participantCode` to `updateUserData()`
3. ✅ Added `inferBakongPlatform()` method that checks:
   - First: `participantCode` (BKRT* → BAKONG, BKJR* → BAKONG_JUNIOR, TOUR* → BAKONG_TOURIST)
   - Second: `accountId` domain (*@bkrt → BAKONG, *@bkjr → BAKONG_JUNIOR, *@tour → BAKONG_TOURIST)

## Test Cases

### Test 1: New User with participantCode
```json
POST /api/v1/notification/send
{
  "accountId": "test@bkrt",
  "participantCode": "BKRTKHPPXXX",
  "fcmToken": "test_token",
  "language": "KM"
}
```
**Expected**: `bakongPlatform` = `BAKONG` (from BKRT prefix)

### Test 2: New User with accountId domain only
```json
POST /api/v1/notification/send
{
  "accountId": "user@bkjr",
  "fcmToken": "test_token",
  "language": "EN"
}
```
**Expected**: `bakongPlatform` = `BAKONG_JUNIOR` (from @bkjr)

### Test 3: New User with no indicators
```json
POST /api/v1/notification/send
{
  "accountId": "user123",
  "fcmToken": "test_token",
  "language": "KM"
}
```
**Expected**: `bakongPlatform` = `NULL` (cannot infer)

### Test 4: Existing User - Update participantCode
```json
POST /api/v1/notification/send
{
  "accountId": "existing@bkrt",
  "participantCode": "TOURKHPPXXX",
  "fcmToken": "new_token",
  "language": "KM"
}
```
**Expected**: `bakongPlatform` = `BAKONG_TOURIST` (inferred from TOUR prefix)

---

## Why Values Were NULL Before

1. **Missing `participantCode` in DTO**: The field wasn't in `SentNotificationDto`, so it was never passed
2. **AccountId pattern might not match**: If accountId doesn't contain `@bkrt`, `@bkjr`, or `@tour`, inference fails
3. **No fallback logic**: If both `participantCode` and `accountId` don't match patterns, `bakongPlatform` stays NULL

---

## Current Behavior After Fix

✅ **New users**: `bakongPlatform` inferred from `participantCode` OR `accountId`  
✅ **Existing users**: `bakongPlatform` inferred when `participantCode` is updated (if missing)  
✅ **Explicit value**: If `bakongPlatform` is provided in request, it's used (not overridden)

---

## Debugging

To see what's happening, check logs for:
```
🔍 [syncUser] Inferred bakongPlatform for new user user@bkrt: BAKONG
📝 [syncUser] Creating new user user@bkrt with bakongPlatform: BAKONG
```

If you don't see these logs, the inference didn't work. Check:
1. Is `participantCode` being sent in the request?
2. Does `accountId` match the pattern (`@bkrt`, `@bkjr`, `@tour`)?
3. Are the logs showing the user creation?

---

## Next Steps

1. **Deploy the fix** to SIT and Production
2. **Test with real data** - register a new user and check database
3. **Check logs** - verify inference messages appear
4. **Update existing NULL users** - they'll get `bakongPlatform` when they update `participantCode`

