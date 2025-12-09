import { NotificationType, ResponseMessage, ErrorCode, ValidationUtils } from '@bakong/shared'
import SentNotificationDto from 'src/modules/notification/dto/send-notification.dto'
import { BaseResponseDto } from '../base-response.dto'
import { getAuth } from 'firebase-admin/auth'
import { BakongUser } from 'src/entities/bakong-user.entity'

export class ValidationHelper {
  static validateLanguage = ValidationUtils.validateLanguage
  static validatePlatform = ValidationUtils.validatePlatform
  static validateNotificationType = ValidationUtils.validateNotificationType
  // validateCategoryType removed - use categoryTypeId from database instead
  static validateUserRole = ValidationUtils.validateUserRole
  static validateSendType = ValidationUtils.validateSendType
  static normalizeEnum = ValidationUtils.normalizeEnum
  static languagesMatch = ValidationUtils.languagesMatch
  static isPlatform = ValidationUtils.isPlatform

  /**
   * Parse platforms field - handles PostgreSQL array, JavaScript array, and JSON string formats
   * Normalizes ["IOS", "ANDROID"] to ["ALL"] since they're equivalent
   * @param platforms - Can be string (PostgreSQL array or JSON), array, or undefined
   * @returns Array of platform strings (normalized: ["IOS", "ANDROID"] becomes ["ALL"])
   */
  static parsePlatforms(platforms: string | string[] | undefined | null): string[] {
    if (!platforms) {
      return ['ALL']
    }

    let parsedArray: string[] = []

    if (Array.isArray(platforms)) {
      // Already an array - normalize values, ensuring they're strings first
      parsedArray = platforms
        .map((p) => (p != null ? String(p) : ''))
        .map((p) => this.normalizeEnum(p))
        .filter((p) => p.length > 0)
    } else if (typeof platforms === 'string') {
      const platformsStr = platforms.trim()

      // Handle PostgreSQL array format: {ANDROID} or {"ANDROID","IOS"}
      if (platformsStr.startsWith('{') && platformsStr.endsWith('}')) {
        try {
          // PostgreSQL array format: remove braces and split by comma
          const content = platformsStr.slice(1, -1) // Remove { and }
          if (content.length === 0) {
            parsedArray = ['ALL']
          } else {
            // Split by comma and remove quotes, then normalize
            parsedArray = content
              .split(',')
              .map((p) => p.trim().replace(/^["']|["']$/g, '')) // Remove surrounding quotes
              .map((p) => (p != null ? String(p) : '')) // Ensure string
              .map((p) => this.normalizeEnum(p)) // Normalize each platform
              .filter((p) => p.length > 0)
            if (parsedArray.length === 0) {
              parsedArray = ['ALL']
            }
          }
        } catch (e) {
          console.error('❌ [parsePlatforms] Failed to parse PostgreSQL array format:', e)
          parsedArray = ['ALL']
        }
      } else {
        // Try parsing as JSON: ["ANDROID"] or ["IOS", "ANDROID"]
        try {
          const parsed = JSON.parse(platformsStr)
          if (Array.isArray(parsed)) {
            parsedArray = parsed
              .map((p) => (p != null ? String(p) : ''))
              .map((p) => this.normalizeEnum(p))
              .filter((p) => p.length > 0)
          } else if (typeof parsed === 'object' && parsed !== null) {
            // Handle object format: {"platforms": ["ANDROID"]}
            if (Array.isArray(parsed.platforms)) {
              parsedArray = parsed.platforms
                .map((p) => (p != null ? String(p) : ''))
                .map((p) => this.normalizeEnum(p))
                .filter((p) => p.length > 0)
            } else {
              parsedArray = ['ALL']
            }
          } else {
            parsedArray = ['ALL']
          }
        } catch (e) {
          console.error(
            '❌ [parsePlatforms] Failed to parse platforms JSON:',
            platformsStr,
            'Error:',
            e,
          )
          parsedArray = ['ALL']
        }
      }
    } else {
      console.warn('⚠️ [parsePlatforms] Platforms is not array or string, using default ALL')
      parsedArray = ['ALL']
    }

    // Normalize: If array contains both IOS and ANDROID, convert to ALL
    const hasIOS = parsedArray.includes('IOS')
    const hasANDROID = parsedArray.includes('ANDROID')
    const hasALL = parsedArray.includes('ALL')

    if (hasALL) {
      // If ALL is present, return just ALL
      return ['ALL']
    } else if (hasIOS && hasANDROID) {
      // If both IOS and ANDROID are present, normalize to ALL
      console.log(
        `🔄 [parsePlatforms] Normalizing ["IOS", "ANDROID"] to ["ALL"] (they are equivalent)`,
      )
      return ['ALL']
    }

    // Filter out invalid platform values (only allow ALL, IOS, ANDROID)
    const validPlatforms = parsedArray.filter((p) => p === 'ALL' || p === 'IOS' || p === 'ANDROID')
    return validPlatforms.length > 0 ? validPlatforms : ['ALL']
  }

  static handleDatabaseError(error: any, context?: string): BaseResponseDto {
    const driverError = error.driverError || {}
    const constraint = driverError.constraint || error.constraint || 'unknown_constraint'
    const table = driverError.table || error.table || 'unknown_table'
    const detail = driverError.detail || driverError.message || error.message
    const column = driverError.column || error.column

    let specificMessage: string = ResponseMessage.DATABASE_QUERY_FAILED
    let errorLocation = 'Unknown location'
    let errorCode = ErrorCode.DATABASE_QUERY_FAILED

    if (error.code) {
      switch (error.code) {
        case '23505':
          specificMessage = ResponseMessage.DATABASE_UNIQUE_CONSTRAINT_VIOLATION
          errorLocation = `Table: ${table}, Constraint: ${constraint}`
          errorCode = ErrorCode.DATABASE_UNIQUE_CONSTRAINT_VIOLATION
          break
        case '23503':
          specificMessage = ResponseMessage.DATABASE_FOREIGN_KEY_VIOLATION
          errorLocation = `Table: ${table}, Constraint: ${constraint}`
          errorCode = ErrorCode.DATABASE_FOREIGN_KEY_VIOLATION
          break
        case '23514':
          specificMessage = ResponseMessage.DATABASE_CHECK_CONSTRAINT_VIOLATION
          errorLocation = `Table: ${table}, Constraint: ${constraint}`
          errorCode = ErrorCode.DATABASE_CHECK_CONSTRAINT_VIOLATION
          break
        case '23502':
          specificMessage = ResponseMessage.DATABASE_NOT_NULL_VIOLATION
          errorLocation = `Table: ${table}, Column: ${column}`
          errorCode = ErrorCode.DATABASE_NOT_NULL_VIOLATION
          break
        case '22P02':
          specificMessage = ResponseMessage.DATABASE_INVALID_TEXT_REPRESENTATION
          errorCode = ErrorCode.DATABASE_INVALID_TEXT_REPRESENTATION
          break
      }
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      specificMessage = ResponseMessage.DATABASE_CONNECTION_ERROR
      errorLocation = `Database Connection`
      errorCode = ErrorCode.DATABASE_CONNECTION_ERROR
    }

    if (errorCode === ErrorCode.DATABASE_QUERY_FAILED) {
      specificMessage = ResponseMessage.DATABASE_QUERY_FAILED
      errorLocation = `Table: ${table || 'unknown'}, Operation: ${context || 'unknown'}`
    }

    return new BaseResponseDto({
      responseCode: 1,
      responseMessage: specificMessage,
      errorCode: errorCode,
      data: {
        constraint,
        table,
        detail,
        context,
        errorLocation,
        originalError: error.message,
        errorCode: error.code,
      },
    })
  }

  static getHttpStatusFromErrorCode(errorCode: ErrorCode): number {
    switch (errorCode) {
      case ErrorCode.VALIDATION_FAILED:
      case ErrorCode.DATABASE_FOREIGN_KEY_VIOLATION:
      case ErrorCode.DATABASE_NOT_NULL_VIOLATION:
      case ErrorCode.DATABASE_INVALID_TEXT_REPRESENTATION:
      case ErrorCode.DATABASE_CHECK_CONSTRAINT_VIOLATION:
      case ErrorCode.DATABASE_CONSTRAINT_VIOLATION:
      case ErrorCode.SENT_TEMPLATE:
        return 400

      case ErrorCode.FAILED_AUTHENTICATION:
      case ErrorCode.JWT_EXPIRE:
      case ErrorCode.NO_PERMISSION:
      case ErrorCode.INVALID_USERNAME_OR_PASSWORD:
        return 401

      case ErrorCode.API_NOT_FOUND:
      case ErrorCode.FILE_NOT_FOUND:
      case ErrorCode.IMAGE_NOT_FOUND:
      case ErrorCode.TEMPLATE_NOT_FOUND:
      case ErrorCode.USER_NOT_FOUND:
      case ErrorCode.RECORD_NOT_FOUND:
      case ErrorCode.NOTIFICATION_NOT_FOUND:
        return 404

      case ErrorCode.DATABASE_UNIQUE_CONSTRAINT_VIOLATION:
        return 409

      case ErrorCode.FLASH_LIMIT_REACHED_IN_TODAY:
        return 429

      case ErrorCode.SERVICE_UNHEALTHY:
      case ErrorCode.DATABASE_CONNECTION_ERROR:
        return 503

      default:
        return 500
    }
  }

  static getReadableErrorMessage(error: any): string {
    if (!error) return 'Unknown error occurred'

    if (error.message) {
      const message = error.message.toLowerCase()

      if (message.includes('duplicate key')) return 'This record already exists in the database'
      if (message.includes('foreign key constraint'))
        return 'Cannot delete this record as it is referenced by other records'
      if (message.includes('invalid input value for enum'))
        return 'Invalid value provided for the specified field'
      if (message.includes('column') && message.includes('does not exist'))
        return 'Database column not found - please contact administrator'
      if (message.includes('404') || message.includes('not found')) {
        if (
          message.includes('firebase') ||
          message.includes('fcm') ||
          message.includes('messaging')
        ) {
          return 'Firebase messaging service temporarily unavailable'
        }
        return error.message
      }
      if (
        (message.includes('unauthorized') || message.includes('permission denied')) &&
        (message.includes('firebase') ||
          message.includes('fcm') ||
          message.includes('messaging') ||
          error.code?.includes('firebase'))
      ) {
        return 'Firebase authentication failed - please check configuration'
      }
      if (message.includes('unauthorized') || message.includes('permission denied')) {
        if (
          message.includes('jwt') ||
          message.includes('token') ||
          message.includes('authentication required') ||
          error.name === 'UnauthorizedException'
        ) {
          return 'Authentication failed. Please login again.'
        }
        return error.message
      }
      if (message.includes('quota exceeded')) {
        if (
          message.includes('firebase') ||
          message.includes('fcm') ||
          message.includes('messaging')
        ) {
          return 'Firebase messaging quota exceeded - please try again later'
        }
        return error.message
      }
      if (message.includes('network') || message.includes('timeout'))
        return 'Network connection issue - please try again'
      if (message.includes('connection refused'))
        return 'Service temporarily unavailable - please try again later'
      if (message.includes('validation failed')) return 'Please check your input data and try again'
      if (message.includes('required')) return 'Required field is missing'
      if (message.includes('invalid format')) return 'Data format is invalid'

      return error.message
    }

    if (typeof error === 'string') return error
    if (typeof error === 'object') return JSON.stringify(error)
    return 'An unexpected error occurred'
  }

  static getErrorCode(error: any): ErrorCode {
    if (!error) return ErrorCode.INTERNAL_SERVER_ERROR

    const message = error.message?.toLowerCase() || ''

    if (message.includes('duplicate key')) return ErrorCode.DATABASE_UNIQUE_CONSTRAINT_VIOLATION
    if (message.includes('foreign key constraint')) return ErrorCode.DATABASE_FOREIGN_KEY_VIOLATION
    if (message.includes('invalid input value for enum')) return ErrorCode.VALIDATION_FAILED
    if (message.includes('column') && message.includes('does not exist'))
      return ErrorCode.INTERNAL_SERVER_ERROR
    if (message.includes('404') || message.includes('not found')) return ErrorCode.SERVICE_UNHEALTHY
    if (message.includes('unauthorized') || message.includes('permission denied'))
      return ErrorCode.FAILED_AUTHENTICATION
    if (message.includes('quota exceeded')) return ErrorCode.FLASH_LIMIT_REACHED_IN_TODAY
    if (message.includes('network') || message.includes('timeout'))
      return ErrorCode.SERVICE_UNHEALTHY
    if (message.includes('connection refused')) return ErrorCode.SERVICE_UNHEALTHY
    if (message.includes('validation failed')) return ErrorCode.VALIDATION_FAILED
    if (message.includes('required')) return ErrorCode.VALIDATION_FAILED
    if (message.includes('invalid format')) return ErrorCode.VALIDATION_FAILED
    if (message.includes('invalid fcm token')) return ErrorCode.INVALID_FCM_TOKEN
    if (message.includes('sendSchedule is required when sendType is SEND_SCHEDULE'))
      return ErrorCode.VALIDATION_FAILED
    if (message.includes('sendSchedule must be a number conforming to the specified constraints'))
      return ErrorCode.TEMPLATE_SEND_SCHEDULE_IN_PAST
    if (message.includes('sendInterval is required when sendType is SEND_INTERVAL'))
      return ErrorCode.VALIDATION_FAILED
    if (message.includes('startAt must be before endAt'))
      return ErrorCode.TEMPLATE_SEND_INTERVAL_INVAILD_DURATION

    return ErrorCode.INTERNAL_SERVER_ERROR
  }

  static async validateFCMTokens(users: BakongUser[], fcm: any): Promise<BakongUser[]> {
    const validUsers = []
    const invalidUsers = []
    const formatInvalidUsers = []

    console.log('🔍 [validateFCMTokens] Starting validation for', users.length, 'users')
    console.log('🔍 [validateFCMTokens] FCM available:', !!fcm)

    if (!fcm) {
      console.warn('⚠️ [validateFCMTokens] FCM not available, only checking token format')
      for (const user of users) {
        if (this.isValidFCMTokenFormat(user.fcmToken)) {
          validUsers.push(user)
        } else {
          formatInvalidUsers.push(user.accountId)
        }
      }
      console.log('🔍 [validateFCMTokens] Format-only validation:', {
        valid: validUsers.length,
        invalidFormat: formatInvalidUsers.length,
      })
      return validUsers
    }

    for (const user of users) {
      if (!this.isValidFCMTokenFormat(user.fcmToken)) {
        formatInvalidUsers.push(user.accountId)
        continue
      }

      try {
        const isValid = await this.validateFCMTokenWithFirebase(user.fcmToken, fcm)
        if (isValid) {
          validUsers.push(user)
        } else {
          invalidUsers.push(user.accountId)
        }
      } catch (error: any) {
        console.warn(
          '⚠️ [validateFCMTokens] Validation error for user',
          user.accountId,
          ':',
          error.message,
        )
        invalidUsers.push(user.accountId)
      }
    }

    console.log('🔍 [validateFCMTokens] Validation complete:', {
      valid: validUsers.length,
      invalidFormat: formatInvalidUsers.length,
      invalidToken: invalidUsers.length,
      total: users.length,
    })

    return validUsers
  }

  static isValidFCMTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false
    }

    return token.length >= 100 && /^[A-Za-z0-9:_-]+$/.test(token)
  }

  /**
   * Validate FCM token WITHOUT sending test notifications
   * 
   * IMPORTANT: This function only validates token format, NOT Firebase validity.
   * Invalid tokens will be caught when actually sending notifications.
   * 
   * Why this approach?
   * 1. Firebase Admin SDK doesn't have a dry-run API that doesn't send notifications
   * 2. Sending test notifications bothers users with "Test message" notifications
   * 3. Format validation + error handling on real sends is sufficient
   * 4. Tokens are synced from mobile app, so they should be current
   * 
   * @param token - FCM token to validate
   * @param fcm - Firebase Messaging instance (not used, kept for API compatibility)
   * @returns true if token format is valid (actual validity checked on send)
   */
  static async validateFCMTokenWithFirebase(token: string, fcm: any): Promise<boolean> {
    // Only validate format - don't send test notifications!
    // Real validation happens when we try to send actual notifications
    // Invalid tokens will fail with specific error codes that we handle
    
    if (!this.isValidFCMTokenFormat(token)) {
      console.warn(`❌ [validateFCMTokenWithFirebase] Invalid token format: ${token.substring(0, 30)}...`)
      return false
    }

    // Token format is valid - assume it's valid
    // If it's actually invalid, Firebase will return an error when we try to send
    // This prevents users from receiving annoying "Test message" notifications
    console.log(`✅ [validateFCMTokenWithFirebase] Token format valid: ${token.substring(0, 30)}...`)
    return true
  }

  static validateFirebaseMessageId(response: string): number {
    const parts = response.split('/')
    let messageId = parts[parts.length - 1]

    if (messageId.includes(':')) {
      messageId = messageId.split(':')[1]
    }
    if (messageId.includes('%')) {
      messageId = messageId.split('%')[0]
    }

    const numericId = parseInt(messageId, 10)
    return isNaN(numericId) ? 0 : numericId
  }

  static validateTranslation(
    template: any,
    language: string,
  ): { isValid: boolean; translation?: any; errorMessage?: string } {
    const templateValidation = this.validateTemplate(template)
    if (!templateValidation.isValid) {
      return { isValid: false, errorMessage: templateValidation.errorMessage }
    }

    if (
      !template.translations ||
      !Array.isArray(template.translations) ||
      template.translations.length === 0
    ) {
      return { isValid: false, errorMessage: 'Template has no translations' }
    }

    let translation = template.translations.find((t) => t.language === language)

    if (!translation) {
      translation = template.translations[0]
    }

    if (!translation) {
      return { isValid: false, errorMessage: 'No translation found for the requested language' }
    }

    return { isValid: true, translation }
  }

  static validateTemplate(template: any): { isValid: boolean; errorMessage?: string } {
    if (!template) {
      return { isValid: false, errorMessage: 'Template not found' }
    }

    if (
      !template.translations ||
      !Array.isArray(template.translations) ||
      template.translations.length === 0
    ) {
      return { isValid: false, errorMessage: 'Template has no translations' }
    }

    return { isValid: true }
  }

  static updateUserFields(user: any, updates: any): boolean {
    let hasChanges = false

    if (updates.fcmToken !== undefined) {
      const currentToken = user.fcmToken || ''
      const newToken = updates.fcmToken || ''
      const tokensAreDifferent = currentToken.trim() !== newToken.trim()

      // Always update fcmToken when provided, even if it's the same
      // This ensures database stays in sync with mobile app and updates the timestamp
      user.fcmToken = updates.fcmToken

      if (tokensAreDifferent) {
        console.log(`🔄 [updateUserFields] fcmToken CHANGED for user ${user.accountId}:`, {
          current: currentToken
            ? `${currentToken.substring(0, 30)}... (length: ${currentToken.length})`
            : 'EMPTY',
          new: newToken ? `${newToken.substring(0, 30)}... (length: ${newToken.length})` : 'EMPTY',
          willUpdate: true,
        })
        hasChanges = true
      } else {
        console.log(
          `🔄 [updateUserFields] fcmToken SAME for user ${user.accountId}, but updating anyway to sync timestamp:`,
          {
            token: newToken
              ? `${newToken.substring(0, 30)}... (length: ${newToken.length})`
              : 'EMPTY',
            reason: 'Ensuring database stays in sync with mobile app',
          },
        )
        // Still mark as changed to ensure save happens and updatedAt timestamp is updated
        hasChanges = true
      }
    }

    if (updates.platform !== undefined) {
      const platformValidation = this.validatePlatform(updates.platform)
      if (platformValidation.isValid) {
        const normalizedPlatform = platformValidation.normalizedValue
        if (user.platform !== normalizedPlatform) {
          console.log(
            `🔄 [updateUserFields] platform changed for user ${user.accountId}: ${
              user.platform || 'NULL'
            } -> ${normalizedPlatform}`,
          )
        }
        // Always update to ensure sync, even if same value
        user.platform = normalizedPlatform
        hasChanges = true
      }
    }

    if (updates.language !== undefined) {
      const languageValidation = this.validateLanguage(updates.language)
      if (languageValidation.isValid) {
        const normalizedLanguage = languageValidation.normalizedValue
        if (user.language !== normalizedLanguage) {
          console.log(
            `🔄 [updateUserFields] language changed for user ${user.accountId}: ${
              user.language || 'NULL'
            } -> ${normalizedLanguage}`,
          )
        }
        // Always update to ensure sync, even if same value
        user.language = normalizedLanguage
        hasChanges = true
      }
    }

    if (updates.participantCode !== undefined) {
      if (user.participantCode !== updates.participantCode) {
        console.log(
          `🔄 [updateUserFields] participantCode changed for user ${user.accountId}: ${
            user.participantCode || 'NULL'
          } -> ${updates.participantCode}`,
        )
      }
      // Always update to ensure sync, even if same value
      user.participantCode = updates.participantCode
      hasChanges = true
    }

    if (updates.bakongPlatform !== undefined) {
      if (user.bakongPlatform !== updates.bakongPlatform) {
        console.log(
          `🔄 [updateUserFields] bakongPlatform changed for user ${user.accountId}: ${
            user.bakongPlatform || 'NULL'
          } -> ${updates.bakongPlatform}`,
        )
      }
      // Always update to ensure sync, even if same value
      user.bakongPlatform = updates.bakongPlatform
      hasChanges = true
    }

    return hasChanges
  }

  static normalizeUserFields(
    user: any,
    result?: { platformUpdates: number; languageUpdates: number },
  ): boolean {
    let hasChanges = false

    const normalizedPlatform = this.normalizeEnum(user.platform)
    if (user.platform !== normalizedPlatform) {
      user.platform = normalizedPlatform
      hasChanges = true
      if (result) result.platformUpdates++
    }

    const normalizedLanguage = this.normalizeEnum(user.language)
    if (user.language !== normalizedLanguage) {
      user.language = normalizedLanguage
      hasChanges = true
      if (result) result.languageUpdates++
    }

    return hasChanges
  }

  static checkValidationViewCount(dto: SentNotificationDto): NotificationType {
    const { notificationType } = dto

    if (notificationType) {
      const validation = ValidationHelper.validateNotificationType(notificationType)
      if (!validation.isValid) {
        throw new Error(`Notification type validation failed: ${validation.errorMessage}`)
      }
      return validation.normalizedValue
    }

    return NotificationType.NOTIFICATION
  }

  static createErrorResponse(error: any, context?: string): any {
    const message = ValidationHelper.getReadableErrorMessage(error)
    const errorCode = ValidationHelper.getErrorCode(error)
    const httpStatus = ValidationHelper.getHttpStatusFromErrorCode(errorCode)

    return {
      responseCode: 1,
      responseMessage: message,
      errorCode: errorCode,
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        context: context || 'Unknown',
        originalError: process.env.NODE_ENV === 'development' ? error.message : undefined,
        httpStatus: httpStatus,
      },
    }
  }

  static isRetryableError(error: any): boolean {
    const message = error.message?.toLowerCase() || ''
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection refused') ||
      message.includes('quota exceeded') ||
      (message.includes('connection') && message.includes('failed'))
    )
  }

  static getRetryDelay(error: any, attempt: number): number {
    const baseDelay = 1000
    const maxDelay = 30000

    if (error.message?.includes('quota exceeded')) {
      return Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
    }

    return Math.min(baseDelay * attempt, maxDelay)
  }
}
