import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { BaseResponseDto } from '../base-response.dto'
import { ErrorCode, ResponseMessage } from '@bakong/shared'
import { UserRole } from '@bakong/shared'
import { API_KEY_REQUIRED_KEY } from './api-key.guard'
import { Request } from 'express'
import k from '../../constant'

export const ROLES_KEY = 'roles'
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!requiredRoles) {
      return true
    }

    // Skip role checking if API key authentication is used
    const isApiKeyRequired = this.reflector.getAllAndOverride<boolean>(API_KEY_REQUIRED_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isApiKeyRequired) {
      const request = context.switchToHttp().getRequest<Request>()
      const apiKey = request.headers['x-api-key'] as string

      // If valid API key is provided, skip role checking (API key auth is sufficient)
      if (apiKey && apiKey === k.API_MOBILE_KEY) {
        console.log('✅ RolesGuard: Valid API key provided, skipping role check')
        return true
      } else {
        console.log(
          '⚠️ RolesGuard: API key required but not provided or invalid. Provided:',
          apiKey,
          'Expected:',
          k.API_MOBILE_KEY,
        )
      }
    }

    const { user } = context.switchToHttp().getRequest()

    if (!user) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.NO_PERMISSION,
        responseMessage: 'Authentication required. Please login first.',
      })
    }

    if (!user.role) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.NO_PERMISSION,
        responseMessage: 'User role not found. Please contact administrator.',
      })
    }

    // ADMINISTRATOR has full access - bypass all role checks
    if (user.role === UserRole.ADMINISTRATOR) {
      return true
    }

    const validRole = requiredRoles.some((role) => user.role == role)
    if (!validRole) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.NO_PERMISSION,
        responseMessage: ResponseMessage.NO_PERMISSION,
      })
    }
    return true
  }
}
