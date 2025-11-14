import { HttpStatus } from '@nestjs/common'
import { BaseResponseDto } from '../base-response.dto'
import { ErrorCode, ResponseMessage } from '@bakong/shared'

export interface ErrorContext {
  operation?: string
  component?: string
  userId?: string
  requestId?: string
  timestamp?: Date
}

export class ErrorResponseUtil {
  static createErrorResponse(
    errorCode: number,
    message?: string,
    data?: any,
    _context?: ErrorContext,
  ): BaseResponseDto {
    const responseMessage = message || this.getDefaultMessage(errorCode)

    return new BaseResponseDto({
      responseCode: 1,
      responseMessage,
      errorCode,
      data: data || null,
    })
  }
  static createFromException(
    exception: any,
    _context?: ErrorContext,
  ): { response: BaseResponseDto; httpStatus: number } {
    let errorCode = ErrorCode.INTERNAL_SERVER_ERROR
    let message = 'An unexpected error occurred'
    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR

    if (exception.name === 'ValidationError') {
      errorCode = ErrorCode.VALIDATION_FAILED
      message = 'Validation failed'
      httpStatus = HttpStatus.BAD_REQUEST
    } else if (exception.name === 'UnauthorizedError') {
      errorCode = ErrorCode.FAILED_AUTHENTICATION
      message = 'Authentication failed'
      httpStatus = HttpStatus.UNAUTHORIZED
    } else if (exception.name === 'ForbiddenError') {
      errorCode = ErrorCode.NO_PERMISSION
      message = 'Insufficient permissions'
      httpStatus = HttpStatus.FORBIDDEN
    } else if (exception.name === 'NotFoundError') {
      errorCode = ErrorCode.RECORD_NOT_FOUND
      message = 'Resource not found'
      httpStatus = HttpStatus.NOT_FOUND
    } else if (exception.name === 'ConflictError') {
      errorCode = ErrorCode.DATABASE_UNIQUE_CONSTRAINT_VIOLATION
      message = 'Resource already exists'
      httpStatus = HttpStatus.CONFLICT
    } else if (exception.code === 'ECONNREFUSED') {
      errorCode = ErrorCode.DATABASE_CONNECTION_ERROR
      message = 'Database connection failed'
      httpStatus = HttpStatus.SERVICE_UNAVAILABLE
    }

    if (exception.message) {
      message = exception.message
    }

    return {
      response: this.createErrorResponse(errorCode, message, null, _context),
      httpStatus,
    }
  }

  private static getDefaultMessage(errorCode: number): string {
    switch (errorCode) {
      case ErrorCode.REQUEST_SUCCESS:
        return ResponseMessage.REQUEST_SUCCESS
      case ErrorCode.INTERNAL_SERVER_ERROR:
        return ResponseMessage.INTERNAL_SERVER_ERROR
      case ErrorCode.API_NOT_FOUND:
        return ResponseMessage.API_NOT_FOUND
      case ErrorCode.SERVICE_UNHEALTHY:
        return ResponseMessage.SERVICE_UNHEALTHY
      case ErrorCode.INVALID_USERNAME_OR_PASSWORD:
        return ResponseMessage.INVALID_USERNAME_OR_PASSWORD
      case ErrorCode.FAILED_AUTHENTICATION:
        return ResponseMessage.FAILED_AUTHENTICATION
      case ErrorCode.JWT_EXPIRE:
        return ResponseMessage.JWT_EXPIRE
      case ErrorCode.NO_PERMISSION:
        return ResponseMessage.NO_PERMISSION
      case ErrorCode.ACCOUNT_TIMEOUT:
        return ResponseMessage.ACCOUNT_TIMEOUT
      case ErrorCode.FILE_NOT_FOUND:
        return ResponseMessage.FILE_NOT_FOUND
      case ErrorCode.VALIDATION_FAILED:
        return ResponseMessage.VALIDATION_FAILED
      case ErrorCode.RECORD_NOT_FOUND:
        return ResponseMessage.RECORD_NOT_FOUND
      case ErrorCode.SENT_TEMPLATE:
        return ResponseMessage.SENT_TEMPLATE
      case ErrorCode.IMAGE_NOT_FOUND:
        return ResponseMessage.IMAGE_NOT_FOUND
      case ErrorCode.TEMPLATE_NOT_FOUND:
        return ResponseMessage.TEMPLATE_NOT_FOUND
      case ErrorCode.USER_NOT_FOUND:
        return ResponseMessage.USER_NOT_FOUND
      case ErrorCode.FLASH_LIMIT_REACHED_IN_TODAY:
        return ResponseMessage.FLASH_LIMIT_REACHED_IN_TODAY
      case ErrorCode.NOTIFICATION_NOT_FOUND:
        return ResponseMessage.NOTIFICATION_NOT_FOUND
      case ErrorCode.DATABASE_UNIQUE_CONSTRAINT_VIOLATION:
        return ResponseMessage.DATABASE_UNIQUE_CONSTRAINT_VIOLATION
      case ErrorCode.DATABASE_FOREIGN_KEY_VIOLATION:
        return ResponseMessage.DATABASE_FOREIGN_KEY_VIOLATION
      case ErrorCode.DATABASE_NOT_NULL_VIOLATION:
        return ResponseMessage.DATABASE_NOT_NULL_VIOLATION
      case ErrorCode.DATABASE_INVALID_TEXT_REPRESENTATION:
        return ResponseMessage.DATABASE_INVALID_TEXT_REPRESENTATION
      case ErrorCode.DATABASE_CONNECTION_ERROR:
        return ResponseMessage.DATABASE_CONNECTION_ERROR
      case ErrorCode.DATABASE_QUERY_FAILED:
        return ResponseMessage.DATABASE_QUERY_FAILED
      case ErrorCode.DATABASE_CHECK_CONSTRAINT_VIOLATION:
        return ResponseMessage.DATABASE_CHECK_CONSTRAINT_VIOLATION
      case ErrorCode.DATABASE_CONSTRAINT_VIOLATION:
        return ResponseMessage.DATABASE_CONSTRAINT_VIOLATION
      case ErrorCode.NO_FLASH_NOTIFICATION_TEMPLATE_AVAILABLE:
        return ResponseMessage.NO_FLASH_NOTIFICATION_TEMPLATE_AVAILABLE
      case ErrorCode.FLASH_NOTIFICATION_POPUP_FAILED:
        return ResponseMessage.FLASH_NOTIFICATION_POPUP_FAILED
      case ErrorCode.INVALID_FCM_TOKEN:
        return ResponseMessage.INVALID_FCM_TOKEN
      case ErrorCode.TEMPLATE_SEND_SCHEDULE_IN_PAST:
        return ResponseMessage.TEMPLATE_SEND_SCHEDULE_IN_PAST
      case ErrorCode.TEMPLATE_SEND_INTERVAL_INVAILD_DURATION:
        return ResponseMessage.TEMPLATE_SEND_INTERVAL_INVAILD_DURATION
      default:
        return 'An unexpected error occurred'
    }
  }

  static logError(error: any, context: ErrorContext, logger: any): void {
    const logData = {
      error: {
        name: error?.name || 'Unknown',
        message: error?.message || 'No message',
        stack: error?.stack,
        code: error?.code,
      },
      context: {
        ...context,
        timestamp: context.timestamp || new Date(),
      },
    }

    logger.error('Application Error', logData)
  }
}
