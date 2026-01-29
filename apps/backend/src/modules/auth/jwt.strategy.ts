import { ExtractJwt, Strategy } from 'passport-jwt'
import { PassportStrategy } from '@nestjs/passport'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import k from 'src/constant'
import { UserService } from '../user/user.service'
import { UserStatus } from '@bakong/shared'
import { BaseResponseDto } from 'src/common/base-response.dto'
import { ErrorCode } from '@bakong/shared'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly userService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: k.API_JWT_KEY,
    })
  }

  async validate(payload: any) {
    // Verify user still exists and is active
    const user = await this.userService.findById(payload.sub)

    if (!user) {
      throw new UnauthorizedException(
        new BaseResponseDto({
          responseCode: 1,
          errorCode: ErrorCode.USER_NOT_FOUND,
          responseMessage: 'User not found. Please login again.',
        }),
      )
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        new BaseResponseDto({
          responseCode: 1,
          errorCode: ErrorCode.NO_PERMISSION,
          responseMessage: 'Your account has been deactivated. Please contact administrator.',
        }),
      )
    }

    return { id: payload.sub, username: payload.username, role: payload.role }
  }
}
