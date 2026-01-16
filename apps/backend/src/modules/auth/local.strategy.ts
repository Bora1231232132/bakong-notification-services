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
    // Check if username or password are missing (Passport passes undefined if fields not found)
    if (!username || username.trim() === '') {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.VALIDATION_FAILED,
        responseMessage: 'Username is required. Please provide a username field in the request body.',
      })
    }

    if (!password || password.trim() === '') {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.VALIDATION_FAILED,
        responseMessage: 'Password is required. Please provide a password field in the request body.',
      })
    }

    // validateUserLogin now throws errors directly instead of returning null
    // This provides more specific error messages
    const user = await this.authService.validateUserLogin(username, password)
    return user
  }
}
