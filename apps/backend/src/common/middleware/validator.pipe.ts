import { ValidationPipe, BadRequestException } from '@nestjs/common'
import { BaseResponseDto } from '../base-response.dto'
import { ErrorCode, ResponseMessage } from '@bakong/shared'
import { BaseFunctionHelper } from '../util/base-function.helper'

function groupValidationErrors(errors: any[]): any {
  const errorProperties = []
  const errorValues = []
  const errorMessages = {}

  for (const err of errors) {
    if (err.constraints) {
      errorProperties.push(err.property)
      // Safely serialize error values to prevent logging large buffers/arrays
      const safeValue = BaseFunctionHelper.safeLogObject(err.value, 5, 20)
      errorValues.push(safeValue)

      for (const [, message] of Object.entries(err.constraints)) {
        errorMessages[err.property] = message
      }
    }
    if (err.children && err.children.length > 0) {
      const childErrors = groupValidationErrors(err.children)
      errorProperties.push(...childErrors.errorProperty)
      errorValues.push(...childErrors.errorTarget)
      Object.assign(errorMessages, childErrors.errorMessages)
    }
  }

  return {
    errorProperty: errorProperties,
    errorTarget: errorValues,
    errorMessages: errorMessages,
  }
}

export const GlobalValidationPipe = new ValidationPipe({
  transform: true,
  exceptionFactory(errors) {
    const grouped = groupValidationErrors(errors)

    throw new BadRequestException(
      new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.VALIDATION_FAILED,
        responseMessage: ResponseMessage.VALIDATION_FAILED,
        data: [grouped],
      }),
    )
  },
})
