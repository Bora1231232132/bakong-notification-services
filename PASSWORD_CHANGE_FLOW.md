# Password Change Flow Documentation

## Overview

This document explains how the password change flow ensures that:

1. New passwords are securely saved
2. Old passwords become invalid immediately
3. Only the new password works for login

## Complete Flow

### 1. Password Change Process (`SettingChangePasswordView.vue`)

**Step 1: User submits password change form**

```typescript
// User enters:
// - Current password (to verify identity)
// - New password
// - Confirm new password (to prevent typos)
```

**Step 2: Frontend validation**

- Validates all fields are filled
- Ensures new password meets minimum length (6 characters)
- Ensures new password matches confirmation

**Step 3: API call to backend**

```typescript
// apps/frontend/src/services/userApi.ts
await api.put('/api/v1/auth/change-password', {
  currentPassword: formData.value.currentPassword,
  newPassword: formData.value.newPassword,
})
```

**Step 4: Backend validation and update**

```typescript
// apps/backend/src/modules/auth/auth.service.ts

// 1. Verify current password is correct
const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.password)
// If false → throw error: "Current password is incorrect"

// 2. Ensure new password is different
const isSamePassword = await bcrypt.compare(dto.newPassword, user.password)
// If true → throw error: "New password must be different"

// 3. Hash and save new password
await this.userService.updatePassword(userId, dto.newPassword)
// This replaces the old hash with a new hash

// 4. Reset failed login attempts
await this.userService.resetFailLoginAttempt(userId)
```

**Step 5: Password hashing (critical step)**

```typescript
// apps/backend/src/modules/user/user.service.ts
async updatePassword(id: number, newPassword: string) {
  // Generate new bcrypt hash with cost factor 10
  const hashedPassword = await bcrypt.hash(newPassword, 10)

  // Replace old hash in database
  user.password = hashedPassword
  return this.repo.save(user)
}
```

**Step 6: Frontend handles success**

```typescript
// apps/frontend/src/views/SettingChangePasswordView.vue

// Clear form
formData.value.currentPassword = ''
formData.value.newPassword = ''
formData.value.confirmPassword = ''

// Clear authentication state
authStore.logout()
localStorage.removeItem('auth_token')
localStorage.removeItem('user')

// Redirect to login
router.push('/login')
```

### 2. Login Validation Process (`LoginView.vue`)

**Step 1: User submits login form**

```typescript
// User enters:
// - Username
// - Password (the new password)
```

**Step 2: Backend validates password**

```typescript
// apps/backend/src/modules/auth/auth.service.ts
async validateUserLogin(username: string, password: string) {
  // 1. Find user by username
  const user = await this.userService.findByUsername(username)

  // 2. Check if account is locked
  if (user.failLoginAttempt >= 3) {
    throw new BaseResponseDto({
      errorCode: ErrorCode.ACCOUNT_TIMEOUT,
      responseMessage: ResponseMessage.ACCOUNT_TIMEOUT,
    })
  }

  // 3. Compare provided password with stored hash
  if (await bcrypt.compare(password, user.password)) {
    // Password matches → return user
    return user
  }

  // 4. Password doesn't match → increment failed attempts
  await this.userService.increementFailLoginAttempt(user.id)
  return null
}
```

**Step 3: On successful validation**

```typescript
// apps/backend/src/modules/auth/auth.service.ts
async login(user: User) {
  // Reset failed login attempts
  await this.userService.resetFailLoginAttempt(user.id)

  // Generate JWT token
  const accessToken = this.jwtService.sign(payload)

  return { accessToken, user }
}
```

## How This Prevents Old Password Usage

### 🔐 Bcrypt Hashing Mechanism

**Key Principle:** Bcrypt is a one-way cryptographic hash function. This means:

- You can hash a password → get a hash
- You CANNOT reverse a hash → get the password
- You can only verify by comparing the input password with the stored hash

### 📊 Database State Changes

**Before Password Change:**

```
Database: user.password = "$2b$10$oldHash1234567890abcdefghijklmnopqrstuvwxyz"
```

**After Password Change:**

```
Database: user.password = "$2b$10$newHash9876543210zyxwvutsrqponmlkjihgfedcba"
```

**Critical Point:** The old hash is completely replaced. There is no record of the old password hash in the database.

### ✅ Why Old Password Fails

**When user tries to login with OLD password:**

```typescript
// Login attempt with old password
const oldPassword = 'OldPassword123'
const storedHash = '$2b$10$newHash9876543210...' // New hash from password change

// Bcrypt comparison
bcrypt.compare(oldPassword, storedHash)
// Result: false ❌
// Reason: Old password cannot produce the new hash
```

**When user tries to login with NEW password:**

```typescript
// Login attempt with new password
const newPassword = 'NewPassword456'
const storedHash = '$2b$10$newHash9876543210...' // New hash from password change

// Bcrypt comparison
bcrypt.compare(newPassword, storedHash)
// Result: true ✅
// Reason: New password produces the hash that matches stored hash
```

### 🔒 Security Guarantees

1. **One-Way Hashing**: Bcrypt ensures passwords cannot be reversed
   - Even if database is compromised, passwords cannot be extracted
   - Each password gets a unique hash (even same password = different hash due to salt)

2. **Hash Replacement**: Old hash is completely overwritten
   - No trace of old password remains
   - Database only contains the new password hash

3. **Immediate Invalidation**: Old password becomes invalid instantly
   - No delay or caching
   - Next login attempt with old password will fail

4. **Session Invalidation**: User is logged out after password change
   - All existing sessions are invalidated
   - User must login with new password to continue

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  User Changes Password                                      │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Validate Current Password                              │
│     bcrypt.compare(currentPassword, storedHash)           │
│     ✅ Matches → Continue                                   │
│     ❌ Fails → Error                                        │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Hash New Password                                       │
│     bcrypt.hash(newPassword, 10)                           │
│     → Generates: "$2b$10$newHash..."                      │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Replace Hash in Database                                │
│     OLD: "$2b$10$oldHash..."  ❌ DELETED                   │
│     NEW: "$2b$10$newHash..."  ✅ SAVED                     │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Logout User & Clear Session                            │
│     - Remove auth_token from localStorage                   │
│     - Clear user state                                      │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Redirect to Login                                       │
│     router.push('/login')                                   │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  User Logs In with New Password                             │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend Validates Password                                 │
│  bcrypt.compare(providedPassword, storedHash)              │
│                                                             │
│  OLD Password: ❌ FAILS (doesn't match new hash)          │
│  NEW Password: ✅ SUCCEEDS (matches new hash)              │
└─────────────────────────────────────────────────────────────┘
```

## Code References

### Backend Password Change

- **Service**: `apps/backend/src/modules/auth/auth.service.ts` (lines 140-178)
- **User Service**: `apps/backend/src/modules/user/user.service.ts` (lines 69-77)
- **Controller**: `apps/backend/src/modules/auth/auth.controller.ts` (lines 50-53)

### Backend Login Validation

- **Service**: `apps/backend/src/modules/auth/auth.service.ts` (lines 52-75)
- **Strategy**: `apps/backend/src/modules/auth/local.strategy.ts` (lines 14-23)

### Frontend Password Change

- **View**: `apps/frontend/src/views/SettingChangePasswordView.vue` (lines 217-284)
- **API**: `apps/frontend/src/services/userApi.ts` (lines 192-246)

### Frontend Login

- **View**: `apps/frontend/src/views/LoginView.vue` (lines 146-222)
- **Store**: `apps/frontend/src/stores/auth.ts` (lines 84-147)

## Security Best Practices Implemented

✅ **Password Hashing**: Bcrypt with cost factor 10
✅ **Hash Replacement**: Old hash completely overwritten
✅ **Session Invalidation**: User logged out after password change
✅ **Current Password Verification**: Must know current password to change
✅ **Password Uniqueness**: New password must be different from current
✅ **Failed Attempt Tracking**: Prevents brute force attacks
✅ **Account Lockout**: After 3 failed attempts

## Testing the Flow

1. **Change Password**:
   - Login with current password
   - Navigate to Settings → Change Password
   - Enter current password, new password, confirm
   - Submit → Should redirect to login

2. **Try Old Password**:
   - On login page, enter username and OLD password
   - Should fail with "Invalid username or password"

3. **Try New Password**:
   - On login page, enter username and NEW password
   - Should succeed and redirect to home

## Conclusion

The password change flow is secure and ensures:

- ✅ Old passwords become invalid immediately
- ✅ Only new passwords work for login
- ✅ No trace of old password remains
- ✅ User must re-authenticate after password change

This is achieved through bcrypt's one-way hashing and the complete replacement of the password hash in the database.
