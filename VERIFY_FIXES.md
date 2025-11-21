# ✅ Verification: FCM Token & bakongPlatform NULL Fix

## 1. FCM Token Handling ✅

### Current Implementation:
- **FCM Token is OPTIONAL** - Mobile can provide it or leave it empty
- **If not provided**: Backend uses empty string `''` as placeholder
- **For new users**: `fcmToken: updateData.fcmToken || ''` (empty string if not provided)
- **For existing users**: Only updates if provided and not empty (doesn't overwrite existing token with empty)

### Code:
```typescript
// Controller
fcmToken: dto.fcmToken || '', // Use empty string as placeholder if not provided

// BaseFunctionHelper - New Users
fcmToken: updateData.fcmToken || '', // Use empty string as placeholder if not provided

// BaseFunctionHelper - Existing Users
if (updateData.fcmToken !== undefined && updateData.fcmToken !== '') {
  updatesToApply.fcmToken = updateData.fcmToken
} else if (updateData.fcmToken === '' && !user.fcmToken) {
  updatesToApply.fcmToken = ''
}
```

### Status: ✅ **FIXED**
- FCM token can be empty/temporary
- Mobile can provide it later
- Existing tokens are preserved

---

## 2. bakongPlatform NULL Issue ✅

### Current Implementation:
- **bakongPlatform is REQUIRED when `accountId` is provided**
- **Validation added**: `@ValidateIf((o) => !!o.accountId) @IsEnum(BakongApp, ...)`
- **Backend uses exactly what mobile provides** (no inference)

### Code:
```typescript
// DTO Validation
@ValidateIf((o) => !!o.accountId)
@IsEnum(BakongApp, {
  message: 'bakongPlatform is required when accountId is provided. Must be one of: BAKONG, BAKONG_JUNIOR, BAKONG_TOURIST',
})
bakongPlatform?: BakongApp

// Controller
bakongPlatform: dto.bakongPlatform, // Mobile app must provide this

// BaseFunctionHelper
bakongPlatform: updateData.bakongPlatform, // Only set if explicitly provided
```

### Status: ✅ **FIXED**
- Validation prevents NULL when `accountId` is provided
- Mobile app MUST send `bakongPlatform` when registering/updating users
- Backend uses exactly what mobile provides (no auto-inference)

---

## Test Scenarios

### ✅ Scenario 1: Valid Request (Both Provided)
```json
{
  "accountId": "user@bkrt",
  "bakongPlatform": "BAKONG",  // ✅ Required
  "fcmToken": "token123",      // ✅ Optional (can be empty)
  "language": "KM"
}
```
**Result**: ✅ User created with `bakongPlatform = "BAKONG"`, `fcmToken = "token123"`

### ✅ Scenario 2: Valid Request (FCM Token Empty)
```json
{
  "accountId": "user@bkrt",
  "bakongPlatform": "BAKONG",  // ✅ Required
  "fcmToken": "",              // ✅ Empty string allowed
  "language": "KM"
}
```
**Result**: ✅ User created with `bakongPlatform = "BAKONG"`, `fcmToken = ""`

### ❌ Scenario 3: Invalid Request (bakongPlatform Missing)
```json
{
  "accountId": "user@bkrt",
  // bakongPlatform missing ❌
  "fcmToken": "token123",
  "language": "KM"
}
```
**Result**: ❌ **Validation Error**: "bakongPlatform is required when accountId is provided"

### ✅ Scenario 4: Valid Request (No accountId, bakongPlatform Optional)
```json
{
  "templateId": 1,
  "bakongPlatform": "BAKONG",  // ✅ Optional when no accountId
  "language": "KM"
}
```
**Result**: ✅ Request succeeds (bakongPlatform is optional when accountId is not provided)

---

## Summary

| Field | Status | Behavior |
|-------|--------|----------|
| **fcmToken** | ✅ Fixed | Optional - can be empty string, mobile can provide later |
| **bakongPlatform** | ✅ Fixed | **REQUIRED when accountId is provided** - validation prevents NULL |

### Both Issues Are Fixed! ✅

1. **FCM Token**: Can be empty/temporary - mobile can provide it later
2. **bakongPlatform NULL**: Fixed - validation requires it when accountId is provided

