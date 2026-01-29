import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ErrorCode, ResponseMessage } from '@bakong/shared'
import { BaseResponseDto } from '../base-response.dto'

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  /**
   * Helper method to detect BaseResponseDto errors in various forms.
   * Passport.js may wrap or serialize errors, so we need to check multiple ways.
   */
  private isBaseResponseDto(error: any): BaseResponseDto | null {
    if (!error) return null

    // Direct instanceof check
    if (error instanceof BaseResponseDto) {
      return error
    }

    // Check if error has BaseResponseDto properties (may be serialized/wrapped)
    if (
      typeof error === 'object' &&
      'responseCode' in error &&
      'errorCode' in error &&
      'responseMessage' in error
    ) {
      // Reconstruct BaseResponseDto from properties
      return new BaseResponseDto({
        responseCode: error.responseCode,
        errorCode: error.errorCode,
        responseMessage: error.responseMessage,
        data: error.data,
      })
    }

    // Check nested errors in various common locations
    const nestedLocations = [
      error.cause,
      error.error,
      error.response,
      error.response?.data,
      error.data,
      error.body,
    ]

    for (const nested of nestedLocations) {
      if (nested) {
        const found = this.isBaseResponseDto(nested)
        if (found) return found
      }
    }

    // Check if error message contains BaseResponseDto-like structure
    if (error.message && typeof error.message === 'object') {
      const nested = this.isBaseResponseDto(error.message)
      if (nested) return nested
    }

    // Check if error is a stringified BaseResponseDto (sometimes errors get stringified)
    if (typeof error === 'string') {
      try {
        const parsed = JSON.parse(error)
        const found = this.isBaseResponseDto(parsed)
        if (found) return found
      } catch {
        // Not JSON, ignore
      }
    }

    return null
  }

  handleRequest(err, user) {
    if (err || !user) {
      // Try to extract BaseResponseDto from error in various forms
      const baseResponseError = this.isBaseResponseDto(err)
      if (baseResponseError) {
        throw baseResponseError
      }

      // If no BaseResponseDto found, throw generic authentication error
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.FAILED_AUTHENTICATION,
        responseMessage: ResponseMessage.FAILED_AUTHENTICATION,
      })
    }
    return user
  }
}
