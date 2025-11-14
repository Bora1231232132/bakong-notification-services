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
      this.logger.error(`Database error: ${exception.message}`, exception.stack)

      const driverError = exception.driverError || {}
      const constraint = driverError.constraint || 'unknown_constraint'
      const table = driverError.table || 'unknown_table'
      const detail = driverError.detail || driverError.message || exception.message

      const errorResponse = ValidationHelper.handleDatabaseError(exception, 'Database Operation')
      responseBody = new BaseResponseDto({
        responseCode: 1,
        responseMessage: errorResponse.responseMessage,
        errorCode: errorResponse.errorCode,
        data: {
          constraint: constraint,
          table: table,
          detail: detail,
          context: 'Database Operation',
        },
      })

      httpStatus = ValidationHelper.getHttpStatusFromErrorCode(errorResponse.errorCode)
    } else if (exception instanceof NotFoundException) {
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
}
