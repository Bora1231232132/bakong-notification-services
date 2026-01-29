import { BaseResponseDto } from '../base-response.dto'
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  NotFoundException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common'
import { HttpAdapterHost } from '@nestjs/core'
import { QueryFailedError } from 'typeorm'
import { ErrorCode, ResponseMessage } from '@bakong/shared'
import { ValidationHelper } from '../util/validation.helper'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: any, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost

    const ctx = host.switchToHttp()

    let responseBody: BaseResponseDto
    let httpStatus: number

    if (exception instanceof QueryFailedError) {
      const driverError: any = exception.driverError || {}
      const code = driverError.code
      const constraint = driverError.constraint
    
      // ✅ Clean duplicate email response
      if (code === '23505' && constraint === 'UQ_user_email') {
        responseBody = new BaseResponseDto({
          responseCode: 1,
          responseMessage: 'Email already exists. Please use a different email.',
          errorCode: ErrorCode.DATABASE_UNIQUE_CONSTRAINT_VIOLATION,
          data: { field: 'email' },
        })
        httpStatus = 409
        httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus)
        return
      }
    
      // ✅ Unique constraint violation
      if (code === '23505') {
        const constraint = driverError.constraint;
      
        // fallback for other unique constraints
        responseBody = new BaseResponseDto({
          responseCode: 1,
          responseMessage: 'Duplicate value. Please use a different value.',
          errorCode: ErrorCode.DATABASE_UNIQUE_CONSTRAINT_VIOLATION,
          data: { constraint },
        });
      }
      
    
      // ✅ Foreign key violation (common when delete)
      if (code === '23503') {
        responseBody = new BaseResponseDto({
          responseCode: 1,
          responseMessage: 'This record is being used by other data and cannot be removed.',
          errorCode: ErrorCode.DATABASE_FOREIGN_KEY_VIOLATION,
          data: null,
        })
        httpStatus = HttpStatus.CONFLICT
        return httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus)
      }
    
      // ✅ Not null violation
      if (code === '23502') {
        responseBody = new BaseResponseDto({
          responseCode: 1,
          responseMessage: 'Missing required field. Please complete all required fields.',
          errorCode: ErrorCode.DATABASE_NOT_NULL_VIOLATION,
          data: null,
        })
        httpStatus = HttpStatus.BAD_REQUEST
        return httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus)
      }
    
      // ✅ invalid input syntax (bad uuid/int)
      if (code === '22P02') {
        responseBody = new BaseResponseDto({
          responseCode: 1,
          responseMessage: 'Invalid input format. Please check your values.',
          errorCode: ErrorCode.DATABASE_INVALID_INPUT_SYNTAX,
          data: null,
        })
        httpStatus = HttpStatus.BAD_REQUEST
        return httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus)
      }
    
      // ✅ fallback: use your helper but sanitize data (don’t leak detail)
      const errorResponse = ValidationHelper.handleDatabaseError(exception, 'Database Operation')
    
      responseBody = new BaseResponseDto({
        responseCode: 1,
        responseMessage: errorResponse.responseMessage || 'Database error occurred. Please try again.',
        errorCode: errorResponse.errorCode || ErrorCode.DATABASE_QUERY_FAILED,
        data: null, // ✅ important: don't return constraint/table/detail
      })
    
      httpStatus = ValidationHelper.getHttpStatusFromErrorCode(responseBody.errorCode)
      return httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus)
    }
    else if (exception instanceof NotFoundException) {
      responseBody = new BaseResponseDto({
        responseCode: 1,
        responseMessage: ResponseMessage.API_NOT_FOUND,
        errorCode: ErrorCode.API_NOT_FOUND,
        data: null,
      })
      httpStatus = HttpStatus.NOT_FOUND
    } else if (exception instanceof ServiceUnavailableException) {
      responseBody = new BaseResponseDto({
        responseCode: 1,
        responseMessage: ResponseMessage.SERVICE_UNHEALTHY,
        errorCode: ErrorCode.SERVICE_UNHEALTHY,
        data: exception.getResponse(),
      })
      httpStatus = HttpStatus.SERVICE_UNAVAILABLE
    } else if (exception instanceof BaseResponseDto) {
      responseBody = exception
      httpStatus = ValidationHelper.getHttpStatusFromErrorCode(exception.errorCode)
    } else if (
      exception instanceof HttpException &&
      exception.getResponse() instanceof BaseResponseDto
    ) {
      responseBody = exception.getResponse() as BaseResponseDto
      httpStatus = ValidationHelper.getHttpStatusFromErrorCode(responseBody.errorCode)
    } else {
      responseBody = ValidationHelper.createErrorResponse(exception, 'Exception Filter')
      httpStatus = ValidationHelper.getHttpStatusFromErrorCode(responseBody.errorCode)
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus)
  }


  private parsePgDuplicateDetail(detail?: string): { field?: string; value?: string } {
    // Example: Key (email)=(approver1@gmail.com) already exists.
    if (!detail) return {}
    const match = /Key \((.+?)\)=\((.+?)\) already exists\./i.exec(detail)
    if (!match) return {}
    return { field: match[1], value: match[2] }
  }
  
  private mapUniqueConstraintMessage(constraint?: string, detail?: string) {
    const c = (constraint || '').toLowerCase()
    const { field, value } = this.parsePgDuplicateDetail(detail)
  
    // ✅ specific user constraints
    if (c === 'uq_user_email' || field === 'email') {
      return {
        field: 'email',
        message: value
          ? `Email : ${value} already exists. Please use a different email.`
          : ResponseMessage.DATABASE_UNIQUE_CONSTRAINT_VIOLATION,
      }
    }
  
    if (c === 'uq_user_username' || field === 'username') {
      return {
        field: 'username',
        message: value
          ? `Username "${value}" already exists. Please use a different username.`
          : 'Username already exists. Please use a different username.',
      }
    }
  
    if (c === 'uq_user_phonenumber' || field === 'phoneNumber' || field === 'phone_number') {
      return {
        field: 'phoneNumber',
        message: value
          ? `Phone number "${value}" is already in use. Please use a different phone number.`
          : 'Phone number already exists. Please use a different phone number.',
      }
    }
  
    // fallback for other unique constraints
    return {
      field,
      message: 'This value already exists. Please use a different one.',
    }
  }
  
}
