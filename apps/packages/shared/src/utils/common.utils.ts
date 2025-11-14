import { UserRole } from '../enums/user-role.enum'
import { ErrorCode, ResponseMessage } from '../enums/error.enums'
import { CategoryType } from '../enums/category-type.enum'
import { Platform } from '../enums/platform.enum'
import { NotificationStatus } from '../enums/notification-status.enum'
import { Language } from '../enums/language.enum'
import { NotificationType } from '../enums/notification-type.enum'
import { SendType } from '../enums/send-type.enum'

export interface ValidationResult<T> {
  isValid: boolean
  normalizedValue: T | null
  originalValue: any
  errorMessage?: string
}

export class ValidationUtils {
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  static isValidPassword(password: string): boolean {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
    return passwordRegex.test(password)
  }

  static isValidUsername(username: string): boolean {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
    return usernameRegex.test(username)
  }

  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '')
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  static validateEmail(email: string, required: boolean = false): boolean | string {
    if (required && !email) {
      return 'Email is required'
    }
    if (email && !this.isValidEmail(email)) {
      return 'Please enter a valid email address'
    }
    return true
  }

  static validatePassword(
    password: string,
    required: boolean = false,
    minLength: number = 3,
  ): boolean | string {
    if (required && !password) {
      return 'Password is required'
    }
    if (password && password.length < minLength) {
      return `Password must be at least ${minLength} characters`
    }
    if (password && !this.isValidPassword(password)) {
      return 'Password must contain at least 8 characters, one uppercase, one lowercase, and one number'
    }
    return true
  }

  static validateUsername(username: string, required: boolean = false): boolean | string {
    if (required && !username) {
      return 'Username is required'
    }
    if (username && !this.isValidUsername(username)) {
      return 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
    }
    return true
  }

  static validateLanguage(value: string): ValidationResult<Language> {
    if (!value || typeof value !== 'string') {
      return {
        isValid: false,
        normalizedValue: null,
        originalValue: value,
        errorMessage: 'Language is required and must be a string',
      }
    }

    const normalizedValue = this.normalizeEnum(value)
    const validLanguages = Object.values(Language)

    const matchedLanguage = validLanguages.find((lang) =>
      this.languagesMatch(lang, normalizedValue),
    )

    if (matchedLanguage) {
      return {
        isValid: true,
        normalizedValue: matchedLanguage,
        originalValue: value,
        errorMessage: undefined,
      }
    }

    return {
      isValid: false,
      normalizedValue: null,
      originalValue: value,
      errorMessage: `Invalid language. Must be one of: ${validLanguages.join(', ')}`,
    }
  }

  static validatePlatform(value: string): ValidationResult<Platform> {
    if (!value || typeof value !== 'string') {
      return {
        isValid: false,
        normalizedValue: null,
        originalValue: value,
        errorMessage: 'Platform is required and must be a string',
      }
    }

    const normalizedValue = this.normalizeEnum(value)
    const validPlatforms = Object.values(Platform)

    const matchedPlatform = validPlatforms.find(
      (platform) => this.normalizeEnum(platform) === normalizedValue,
    )

    if (matchedPlatform) {
      return {
        isValid: true,
        normalizedValue: matchedPlatform,
        originalValue: value,
        errorMessage: undefined,
      }
    }

    return {
      isValid: false,
      normalizedValue: null,
      originalValue: value,
      errorMessage: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`,
    }
  }

  static validateNotificationType(value: string): ValidationResult<NotificationType> {
    if (!value || typeof value !== 'string') {
      return {
        isValid: false,
        normalizedValue: null,
        originalValue: value,
        errorMessage: 'Notification type is required and must be a string',
      }
    }

    const normalizedValue = this.normalizeEnum(value)
    const validTypes = Object.values(NotificationType)

    const matchedType = validTypes.find((type) => this.normalizeEnum(type) === normalizedValue)

    if (matchedType) {
      return {
        isValid: true,
        normalizedValue: matchedType,
        originalValue: value,
        errorMessage: undefined,
      }
    }

    return {
      isValid: false,
      normalizedValue: null,
      originalValue: value,
      errorMessage: `Invalid notification type. Must be one of: ${validTypes.join(', ')}`,
    }
  }

  static validateCategoryType(value: string): ValidationResult<CategoryType> {
    if (!value || typeof value !== 'string') {
      return {
        isValid: false,
        normalizedValue: null,
        originalValue: value,
        errorMessage: 'Category type is required and must be a string',
      }
    }

    const normalizedValue = this.normalizeEnum(value)
    const validTypes = Object.values(CategoryType)

    const matchedType = validTypes.find((type) => this.normalizeEnum(type) === normalizedValue)

    if (matchedType) {
      return {
        isValid: true,
        normalizedValue: matchedType,
        originalValue: value,
        errorMessage: undefined,
      }
    }

    return {
      isValid: false,
      normalizedValue: null,
      originalValue: value,
      errorMessage: `Invalid category type. Must be one of: ${validTypes.join(', ')}`,
    }
  }

  static validateUserRole(value: string): ValidationResult<UserRole> {
    if (!value || typeof value !== 'string') {
      return {
        isValid: false,
        normalizedValue: null,
        originalValue: value,
        errorMessage: 'User role is required and must be a string',
      }
    }

    const normalizedValue = this.normalizeEnum(value)
    const validRoles = Object.values(UserRole)

    const matchedRole = validRoles.find((role) => this.normalizeEnum(role) === normalizedValue)

    if (matchedRole) {
      return {
        isValid: true,
        normalizedValue: matchedRole,
        originalValue: value,
        errorMessage: undefined,
      }
    }

    return {
      isValid: false,
      normalizedValue: null,
      originalValue: value,
      errorMessage: `Invalid user role. Must be one of: ${validRoles.join(', ')}`,
    }
  }

  static validateSendType(value: string): ValidationResult<SendType> {
    if (!value || typeof value !== 'string') {
      return {
        isValid: false,
        normalizedValue: null,
        originalValue: value,
        errorMessage: 'Send type is required and must be a string',
      }
    }

    const normalizedValue = this.normalizeEnum(value)
    const validTypes = Object.values(SendType)

    const matchedType = validTypes.find((type) => this.normalizeEnum(type) === normalizedValue)

    if (matchedType) {
      return {
        isValid: true,
        normalizedValue: matchedType,
        originalValue: value,
        errorMessage: undefined,
      }
    }

    return {
      isValid: false,
      normalizedValue: null,
      originalValue: value,
      errorMessage: `Invalid send type. Must be one of: ${validTypes.join(', ')}`,
    }
  }

  static normalizeEnum(enumValue: string): string {
    if (!enumValue) return ''
    return enumValue
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toUpperCase()
      .trim()
  }

  static languagesMatch(language1: string, language2: string): boolean {
    if (!language1 || !language2) return false
    return this.normalizeEnum(language1) === this.normalizeEnum(language2)
  }

  static isPlatform(platform?: string) {
    const p = (platform || '').toLowerCase()
    if (p === 'ios') return { ios: true, android: false }
    if (p === 'android') return { ios: false, android: true }
    return { ios: true, android: true }
  }
}

export const passwordFormat = (password: string, required: boolean = false): boolean | string => {
  return ValidationUtils.validatePassword(password, required)
}

export const emailFormat = (email: string, required: boolean = false): boolean | string => {
  return ValidationUtils.validateEmail(email, required)
}

export const usernameFormat = (username: string, required: boolean = false): boolean | string => {
  return ValidationUtils.validateUsername(username, required)
}

export const getErrorMessage = (errorCode: number): string => {
  const errorMessages: Record<number, string> = {}
  for (const key in ResponseMessage) {
    if (isNaN(Number(key))) {
      const value = (ResponseMessage as any)[key]
      const code = (ErrorCode as any)[key]
      if (code !== undefined && typeof value === 'string') {
        errorMessages[code] = value
      }
    }
  }
  return errorMessages[errorCode] || 'An unexpected error occurred'
}

export const ERROR_MESSAGES: Record<number, string> = (() => {
  const messages: Record<number, string> = {}
  for (const key in ResponseMessage) {
    if (isNaN(Number(key))) {
      const value = (ResponseMessage as any)[key]
      const code = (ErrorCode as any)[key]
      if (code !== undefined && typeof value === 'string') {
        messages[code] = value
      }
    }
  }
  return messages
})()
