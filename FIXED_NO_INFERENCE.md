# ✅ Fixed: No Auto-Inference - Mobile Provides bakongPlatform

## Change Made

**Removed auto-inference logic** - Backend now uses exactly what the mobile app provides.

## Current Behavior

✅ **Backend uses `bakongPlatform` directly from mobile app request**  
✅ **No automatic inference from `participantCode` or `accountId`**  
✅ **If mobile doesn't send `bakongPlatform`, it will be NULL** (as expected)

---

## What Mobile App Must Send

The mobile app **MUST** include `bakongPlatform` in the request:

```json
POST /api/v1/notification/send
{
  "accountId": "user@bkrt",
  "fcmToken": "token123",
  "language": "KM",
  "platform": "ANDROID",
  "participantCode": "BKRTKHPPXXX",
  "bakongPlatform": "BAKONG"  // ← Mobile MUST provide this
}
```

---

## Fallback: Template-Based Update

There's still a fallback in `notification.service.ts` (line 297-321):
- If user doesn't have `bakongPlatform` when sending flash notification
- Backend will set it from the template's `bakongPlatform`
- This only happens if user is missing `bakongPlatform` and template has it

---

## Summary

- ❌ **Removed**: Auto-inference from `participantCode` or `accountId`
- ✅ **Kept**: Direct use of `bakongPlatform` from mobile app
- ✅ **Kept**: Fallback from template when sending flash notification (if user missing bakongPlatform)

**Mobile app is responsible for providing `bakongPlatform` in the request.**

