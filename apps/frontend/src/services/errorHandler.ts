import { ElNotification } from 'element-plus'

const ErrorCode = {
  INTERNAL_SERVER_ERROR: 500,
  REQUEST_SUCCESS: 200,
  INVALID_USERNAME_OR_PASSWORD: 1001,
  FAILED_AUTHENTICATION: 1002,
  JWT_EXPIRE: 1003,
  NO_PERMISSION: 1004,
  ACCOUNT_TIMEOUT: 1005,
  VALIDATION_FAILED: 1006,
  RECORD_NOT_FOUND: 1007,
  USER_NOT_FOUND: 1008,
  TEMPLATE_NOT_FOUND: 1009,
  NOTIFICATION_NOT_FOUND: 1010,
  IMAGE_NOT_FOUND: 1011,
  FILE_NOT_FOUND: 1012,
  DATABASE_UNIQUE_CONSTRAINT_VIOLATION: 1013,
  DATABASE_FOREIGN_KEY_VIOLATION: 1014,
  DATABASE_NOT_NULL_VIOLATION: 1015,
  DATABASE_CONNECTION_ERROR: 1016,
  FLASH_LIMIT_REACHED_IN_TODAY: 1017,
  NO_FLASH_NOTIFICATION_TEMPLATE_AVAILABLE: 1018,
  INVALID_FCM_TOKEN: 1019,
  TEMPLATE_SEND_SCHEDULE_IN_PAST: 1020,
  TEMPLATE_SEND_INTERVAL_INVAILD_DURATION: 1021,
  API_NOT_FOUND: 1022,
  SERVICE_UNHEALTHY: 1023,
}

export interface ApiError {
  responseCode: number
  responseMessage: string
  errorCode: number
  data?: any
}

export interface ErrorContext {
  operation?: string
  component?: string
  userId?: string
  timestamp?: Date
}

export class ErrorHandler {
  private static instance: ErrorHandler
  private errorLog: Array<{ error: any; context: ErrorContext; timestamp: Date }> = []
  private lastErrorTime: number = 0
  private lastErrorMessage: string = ''

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  handleApiError(error: any, context: ErrorContext = {}): string {
    const timestamp = new Date()
    this.errorLog.push({ error, context: { ...context, timestamp }, timestamp })

    const apiError = this.extractApiError(error)
    const userMessage = this.getUserFriendlyMessage(apiError, context)
    const shouldShowNotification = this.shouldShowNotification(apiError.errorCode)

    const now = Date.now()
    if (now - this.lastErrorTime < 1000 && this.lastErrorMessage === userMessage) {
      return userMessage
    }

    this.lastErrorTime = now
    this.lastErrorMessage = userMessage

    if (shouldShowNotification) {
      this.showErrorNotification(userMessage, apiError.errorCode)
    } else {
      ElNotification({
        title: 'Error',
        message: userMessage,
        type: 'error',
        duration: 2000,
      })
    }

    return userMessage
  }

  handleGeneralError(error: any, context: ErrorContext = {}): string {
    const timestamp = new Date()
    this.errorLog.push({ error, context: { ...context, timestamp }, timestamp })
    const userMessage = this.getGeneralErrorMessage(error, context)

    const now = Date.now()
    if (now - this.lastErrorTime < 1000 && this.lastErrorMessage === userMessage) {
      return userMessage
    }

    this.lastErrorTime = now
    this.lastErrorMessage = userMessage

    ElNotification({
      title: 'Error',
      message: userMessage,
      type: 'error',
      duration: 2000,
    })
    return userMessage
  }

  handleValidationError(errors: any[], context: ErrorContext = {}): string {
    const timestamp = new Date()
    this.errorLog.push({ error: errors, context: { ...context, timestamp }, timestamp })

    const userMessage = this.getValidationErrorMessage(errors)
    ElNotification({
      title: 'Validation Error',
      message: userMessage,
      type: 'error',
      duration: 2000,
    })
    return userMessage
  }

  private extractApiError(error: any): ApiError {
    if (error?.response?.data) {
      return {
        responseCode: error.response.data.responseCode ?? 1,
        responseMessage: error.response.data.responseMessage ?? 'Unknown error',
        errorCode: error.response.data.errorCode ?? ErrorCode.INTERNAL_SERVER_ERROR,
        data: error.response.data.data,
      }
    }
    return {
      responseCode: 1,
      responseMessage: error?.message ?? 'Network error',
      errorCode: this.getErrorCodeFromStatus(error?.response?.status),
      data: null,
    }
  }

  private getUserFriendlyMessage(apiError: ApiError, context: ErrorContext): string {
    const { errorCode, responseMessage } = apiError

    switch (errorCode) {
      case ErrorCode.REQUEST_SUCCESS:
        return 'Operation completed successfully'

      case ErrorCode.INVALID_USERNAME_OR_PASSWORD:
        return 'Invalid username or password. Please check your credentials and try again.'

      case ErrorCode.FAILED_AUTHENTICATION:
        return 'Authentication failed. Please log in again.'

      case ErrorCode.JWT_EXPIRE:
        return 'Your session has expired. Please log in again.'

      case ErrorCode.NO_PERMISSION:
        return 'You do not have permission to perform this action.'

      case ErrorCode.ACCOUNT_TIMEOUT:
        return 'Your account has been temporarily locked. Please contact support.'

      case ErrorCode.VALIDATION_FAILED:
        return 'Please check your input and try again.'

      case ErrorCode.RECORD_NOT_FOUND:
        return 'The requested item was not found.'

      case ErrorCode.USER_NOT_FOUND:
        return 'User not found.'

      case ErrorCode.TEMPLATE_NOT_FOUND:
        return 'Template not found.'

      case ErrorCode.NOTIFICATION_NOT_FOUND:
        return 'Notification not found.'

      case ErrorCode.IMAGE_NOT_FOUND:
        return 'Image not found.'

      case ErrorCode.FILE_NOT_FOUND:
        return 'File not found.'

      case ErrorCode.DATABASE_UNIQUE_CONSTRAINT_VIOLATION:
        return 'This item already exists. Please use a different value.'

      case ErrorCode.DATABASE_FOREIGN_KEY_VIOLATION:
        return 'Cannot delete this item as it is being used elsewhere.'

      case ErrorCode.DATABASE_NOT_NULL_VIOLATION:
        return 'Required fields cannot be empty.'

      case ErrorCode.DATABASE_CONNECTION_ERROR:
        return 'Database connection error. Please try again later.'

      case ErrorCode.FLASH_LIMIT_REACHED_IN_TODAY:
        return 'Daily flash notification limit reached. Please try again tomorrow.'

      case ErrorCode.NO_FLASH_NOTIFICATION_TEMPLATE_AVAILABLE:
        return 'No flash notification template is available.'

      case ErrorCode.INVALID_FCM_TOKEN:
        return 'Invalid push notification token. Please refresh the page.'

      case ErrorCode.TEMPLATE_SEND_SCHEDULE_IN_PAST:
        return 'Cannot schedule notification in the past. Please select a future date.'

      case ErrorCode.TEMPLATE_SEND_INTERVAL_INVAILD_DURATION:
        return 'Invalid send interval duration. Please check your settings.'

      case ErrorCode.API_NOT_FOUND:
        return 'The requested service is not available.'

      case ErrorCode.SERVICE_UNHEALTHY:
        return 'Service is temporarily unavailable. Please try again later.'

      case ErrorCode.INTERNAL_SERVER_ERROR:
      default:
        return responseMessage || 'An unexpected error occurred. Please try again later.'
    }
  }

  private getGeneralErrorMessage(error: any, context: ErrorContext): string {
    if (error?.message) {
      return error.message
    }
    if (context.operation) {
      return `Failed to ${context.operation}. Please try again.`
    }
    return 'An unexpected error occurred. Please try again.'
  }

  private getValidationErrorMessage(errors: any[]): string {
    if (errors.length === 0) {
      return 'Validation failed. Please check your input.'
    }
    if (errors.length === 1) {
      return errors[0].message || 'Please check your input.'
    }
    return `Please fix ${errors.length} validation errors.`
  }

  private getErrorCodeFromStatus(status?: number): number {
    if (!status) return ErrorCode.INTERNAL_SERVER_ERROR

    switch (status) {
      case 400:
        return ErrorCode.VALIDATION_FAILED
      case 401:
        return ErrorCode.FAILED_AUTHENTICATION
      case 403:
        return ErrorCode.NO_PERMISSION
      case 404:
        return ErrorCode.API_NOT_FOUND
      case 409:
        return ErrorCode.DATABASE_UNIQUE_CONSTRAINT_VIOLATION
      case 422:
        return ErrorCode.VALIDATION_FAILED
      case 500:
        return ErrorCode.INTERNAL_SERVER_ERROR
      case 503:
        return ErrorCode.SERVICE_UNHEALTHY
      default:
        return ErrorCode.INTERNAL_SERVER_ERROR
    }
  }

  private shouldShowNotification(errorCode: number): boolean {
    const notificationErrors = [
      ErrorCode.JWT_EXPIRE,
      ErrorCode.ACCOUNT_TIMEOUT,
      ErrorCode.SERVICE_UNHEALTHY,
      ErrorCode.DATABASE_CONNECTION_ERROR,
    ]
    return notificationErrors.includes(errorCode)
  }

  private showErrorNotification(message: string, errorCode: number): void {
    const type = this.getNotificationType(errorCode)
    const duration = this.getNotificationDuration(errorCode)

    ElNotification({
      title: 'Error',
      message,
      type,
      duration,
      showClose: true,
      position: 'top-right',
    })
  }

  private getNotificationType(errorCode: number): 'error' | 'warning' | 'info' {
    const warningErrors = [ErrorCode.JWT_EXPIRE, ErrorCode.ACCOUNT_TIMEOUT]

    if (warningErrors.includes(errorCode)) {
      return 'warning'
    }

    return 'error'
  }

  private getNotificationDuration(errorCode: number): number {
    const persistentErrors = [ErrorCode.ACCOUNT_TIMEOUT, ErrorCode.SERVICE_UNHEALTHY]

    if (persistentErrors.includes(errorCode)) {
      return 0
    }

    return 5000
  }

  getErrorLogs(): Array<{ error: any; context: ErrorContext; timestamp: Date }> {
    return [...this.errorLog]
  }

  clearErrorLogs(): void {
    this.errorLog = []
  }

  showSuccess(message: string, context: ErrorContext = {}): void {
    ElNotification({
      title: 'Success',
      message: message,
      type: 'success',
      duration: 2000,
    })
  }

  showInfo(message: string, context: ErrorContext = {}): void {
    ElNotification({
      title: 'Info',
      message: message,
      type: 'info',
      duration: 2000,
    })
  }

  showWarning(message: string, context: ErrorContext = {}): void {
    ElNotification({
      title: 'Warning',
      message: message,
      type: 'warning',
      duration: 2000,
    })
  }
}

export const errorHandler = ErrorHandler.getInstance()

export const handleApiError = (error: any, context?: ErrorContext) =>
  errorHandler.handleApiError(error, context)

export const handleGeneralError = (error: any, context?: ErrorContext) =>
  errorHandler.handleGeneralError(error, context)

export const handleValidationError = (errors: any[], context?: ErrorContext) =>
  errorHandler.handleValidationError(errors, context)

export const showSuccess = (message: string, context?: ErrorContext) =>
  errorHandler.showSuccess(message, context)

export const showInfo = (message: string, context?: ErrorContext) =>
  errorHandler.showInfo(message, context)

export const showWarning = (message: string, context?: ErrorContext) =>
  errorHandler.showWarning(message, context)
