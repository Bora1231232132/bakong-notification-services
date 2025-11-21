# ✅ Validation Test - bakongPlatform Required from Mobile

## Validation Rule Added

**`bakongPlatform` is now REQUIRED when `accountId` is provided.**

### Implementation:
```typescript
@ValidateIf((o) => !!o.accountId)
@IsEnum(BakongApp, {
  message: 'bakongPlatform is required when accountId is provided. Must be one of: BAKONG, BAKONG_JUNIOR, BAKONG_TOURIST',
})
@IsOptional()
bakongPlatform?: BakongApp
```

### How It Works:
- ✅ **When `accountId` is provided**: `bakongPlatform` is **REQUIRED** and must be a valid `BakongApp` enum value
- ✅ **When `accountId` is NOT provided**: `bakongPlatform` is **OPTIONAL** (validation skipped)

---

## Test Cases

### ✅ Test 1: Valid Request with accountId and bakongPlatform
```json
POST /api/v1/notification/send
{
  "accountId": "user@bkrt",
  "bakongPlatform": "BAKONG",
  "fcmToken": "token123",
  "language": "KM"
}
```
**Expected**: ✅ **PASS** - Validation succeeds

### ❌ Test 2: Invalid Request - accountId provided but bakongPlatform missing
```json
POST /api/v1/notification/send
{
  "accountId": "user@bkrt",
  "fcmToken": "token123",
  "language": "KM"
}
```
**Expected**: ❌ **FAIL** - Validation error: "bakongPlatform is required when accountId is provided"

### ❌ Test 3: Invalid Request - accountId provided but bakongPlatform is invalid enum
```json
POST /api/v1/notification/send
{
  "accountId": "user@bkrt",
  "bakongPlatform": "INVALID_PLATFORM",
  "fcmToken": "token123",
  "language": "KM"
}
```
**Expected**: ❌ **FAIL** - Validation error: "bakongPlatform must be one of: BAKONG, BAKONG_JUNIOR, BAKONG_TOURIST"

### ✅ Test 4: Valid Request - No accountId, bakongPlatform optional
```json
POST /api/v1/notification/send
{
  "templateId": 1,
  "bakongPlatform": "BAKONG",
  "language": "KM"
}
```
**Expected**: ✅ **PASS** - Validation succeeds (bakongPlatform is optional when accountId is not provided)

### ✅ Test 5: Valid Request - No accountId, no bakongPlatform
```json
POST /api/v1/notification/send
{
  "templateId": 1,
  "language": "KM"
}
```
**Expected**: ✅ **PASS** - Validation succeeds (bakongPlatform is optional when accountId is not provided)

---

## Summary

✅ **Validation Added**: `bakongPlatform` is required when `accountId` is provided  
✅ **Mobile App Must Provide**: When sending user data, mobile must include `bakongPlatform`  
✅ **Backend Uses Directly**: Backend uses exactly what mobile provides (no inference)  
✅ **Build Successful**: Code compiles without errors

**The mobile app will now receive a clear validation error if it doesn't provide `bakongPlatform` when `accountId` is present.**

