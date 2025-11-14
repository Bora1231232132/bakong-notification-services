import { NotificationType, ResponseMessage, ErrorCode, ValidationUtils } from '@bakong/shared'
import SentNotificationDto from 'src/modules/notification/dto/send-notification.dto'
import { BaseResponseDto } from '../base-response.dto'
import { getAuth } from 'firebase-admin/auth'
import { BakongUser } from 'src/entities/bakong-user.entity'

export class ValidationHelper {
  static validateLanguage = ValidationUtils.validateLanguage
  static validatePlatform = ValidationUtils.validatePlatform
  static validateNotificationType = ValidationUtils.validateNotificationType
  static validateCategoryType = ValidationUtils.validateCategoryType
  static validateUserRole = ValidationUtils.validateUserRole
  static validateSendType = ValidationUtils.validateSendType
  static normalizeEnum = ValidationUtils.normalizeEnum
  static languagesMatch = ValidationUtils.languagesMatch
  static isPlatform = ValidationUtils.isPlatform

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

  static async validateFCMTokenWithFirebase(token: string, fcm: any): Promise<boolean> {
    try {
      try {
        const auth = getAuth()
        await auth.verifyIdToken(token)
        return true
      } catch (idTokenError) {
        const testMessage = {
          token: token,
          notification: {
            title: 'Test',
            body: 'Test message for token validation',
          },
          data: {
            test: 'true',
          },
        }

        try {
          await fcm.send(testMessage, true)
          return true
        } catch (fcmError) {
          if (
            fcmError.code === 'messaging/registration-token-not-registered' ||
            fcmError.code === 'messaging/invalid-registration-token' ||
            fcmError.code === 'messaging/invalid-argument'
          ) {
            return false
          } else {
            return true
          }
        }
      }
    } catch (error) {
      if (
        error.code === 'auth/invalid-id-token' ||
        error.code === 'auth/id-token-expired' ||
        error.code === 'auth/id-token-revoked' ||
        error.code === 'messaging/invalid-argument' ||
        error.code === 'messaging/registration-token-not-registered' ||
        error.code === 'messaging/invalid-registration-token'
      ) {
        return false
      }

      return true
    }
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

    if (updates.fcmToken !== undefined && user.fcmToken !== updates.fcmToken) {
      user.fcmToken = updates.fcmToken
      hasChanges = true
    }

    if (updates.platform !== undefined) {
      const platformValidation = this.validatePlatform(updates.platform)
      if (platformValidation.isValid && user.platform !== platformValidation.normalizedValue) {
        user.platform = platformValidation.normalizedValue
        hasChanges = true
      }
    }

    if (updates.language !== undefined) {
      const languageValidation = this.validateLanguage(updates.language)
      if (languageValidation.isValid && user.language !== languageValidation.normalizedValue) {
        user.language = languageValidation.normalizedValue
        hasChanges = true
      }
    }

    if (updates.participantCode !== undefined && user.participantCode !== updates.participantCode) {
      user.participantCode = updates.participantCode
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
