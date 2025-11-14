import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import { BaseResponseDto } from '../base-response.dto'
import { ErrorCode, ResponseMessage } from '@bakong/shared'
import k from '../../constant'

export const API_KEY_REQUIRED_KEY = 'apiKeyRequired'
export const ApiKeyRequired = () => SetMetadata(API_KEY_REQUIRED_KEY, true)

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isApiKeyRequired = this.reflector.getAllAndOverride<boolean>(API_KEY_REQUIRED_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!isApiKeyRequired) {
      return true
    }

    const request = context.switchToHttp().getRequest<Request>()
    const apiKey = request.headers['x-api-key'] as string

    if (!apiKey) {
      throw new UnauthorizedException(
        new BaseResponseDto({
          responseCode: 1,
          errorCode: ErrorCode.FAILED_AUTHENTICATION,
          responseMessage: ResponseMessage.FAILED_AUTHENTICATION,
        }),
      )
    }

    if (apiKey !== k.API_MOBILE_KEY) {
      throw new UnauthorizedException(
        new BaseResponseDto({
          responseCode: 1,
          errorCode: ErrorCode.FAILED_AUTHENTICATION,
          responseMessage: ResponseMessage.FAILED_AUTHENTICATION,
        }),
      )
    }

    return true
  }
}
