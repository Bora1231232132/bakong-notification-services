import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ErrorCode, ResponseMessage } from '@bakong/shared'
import { BaseResponseDto } from '../base-response.dto'

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  handleRequest(err, user) {
    if (err || !user) {
      if (err instanceof BaseResponseDto) throw err
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.FAILED_AUTHENTICATION,
        responseMessage: ResponseMessage.FAILED_AUTHENTICATION,
      })
    }
    return user
  }
}
