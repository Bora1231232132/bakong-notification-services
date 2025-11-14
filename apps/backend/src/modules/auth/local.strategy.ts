import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-local'
import { BaseResponseDto } from 'src/common/base-response.dto'
import { ErrorCode, ResponseMessage } from '@bakong/shared'
import { AuthService } from './auth.service'

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super()
  }

  async validate(username: string, password: string): Promise<any> {
    const user = await this.authService.validateUserLogin(username, password)
    if (!user) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.INVALID_USERNAME_OR_PASSWORD,
        responseMessage: ResponseMessage.INVALID_USERNAME_OR_PASSWORD,
      })
    }
    return user
  }
}
