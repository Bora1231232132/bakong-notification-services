import { Body, Controller, Post, Req } from '@nestjs/common'
import { ApiKeyRequired } from 'src/common/middleware/api-key.guard'
import { NotificationInboxDto } from './dto/notification-inbox.dto'
import { NotificationService } from './notification.service'
import SentNotificationDto from './dto/send-notification.dto'
import { BaseResponseDto } from 'src/common/base-response.dto'
import { ErrorCode, ResponseMessage, BakongApp } from '@bakong/shared'
import { NotificationType } from '@bakong/shared'
import { BaseFunctionHelper } from 'src/common/util/base-function.helper'
import { Roles } from 'src/common/middleware/roles.guard'
import { UserRole } from '@bakong/shared'

@Controller('notification')
export class NotificationController {
  constructor(
    private readonly service: NotificationService,
    private readonly baseFunctionHelper: BaseFunctionHelper,
  ) {}

  @Post('send')
  @ApiKeyRequired()
  @Roles(UserRole.ADMIN_USER, UserRole.NORMAL_USER)
  async sendNotification(@Body() dto: SentNotificationDto, @Req() req: any) {
    console.log('📤 /send API endpoint called with:', {
      templateId: dto.templateId,
      notificationId: dto.notificationId,
      language: dto.language,
      notificationType: dto.notificationType,
      bakongPlatform: dto.bakongPlatform,
      accountId: dto.accountId || 'N/A',
      fcmToken: dto.fcmToken
        ? `${dto.fcmToken.substring(0, 30)}...`
        : dto.fcmToken === ''
          ? 'EMPTY (explicitly cleared)'
          : 'NOT PROVIDED',
    })

    try {
      if (dto.accountId) {
        // CRITICAL: Sync user data FIRST when FCM push is received (before any other operations)
        // This ensures we have the latest user data (fcmToken, bakongPlatform, etc.) immediately
        // Mobile app always provides all data when receiving FCM push (all notification types)
        // IMPORTANT: Do NOT force notificationType - let it come from mobile's FCM payload
        const notificationTypeLabel = dto.notificationType || 'UNKNOWN'
        console.log(
          `🔄 [sendNotification] FCM push received - Syncing user data FIRST for ${dto.accountId} before processing ${notificationTypeLabel} notification`,
        )

        // Mobile app ALWAYS provides bakongPlatform in the request
        // Fallback: Only infer if mobile didn't provide it (shouldn't happen, but for backward compatibility)
        if (!dto.bakongPlatform) {
          const inferredBakongPlatform = this.inferBakongPlatform(
            dto.participantCode,
            dto.accountId,
          )
          if (inferredBakongPlatform) {
            console.warn(
              `⚠️ [sendNotification] Mobile did not provide bakongPlatform (unexpected), inferred from accountId: ${dto.accountId} -> ${inferredBakongPlatform}`,
            )
            dto.bakongPlatform = inferredBakongPlatform
          }
        }

        // If notificationType is not provided, default to FLASH_NOTIFICATION for backward compatibility
        // But prefer to use the type from FCM payload if provided
        if (!dto.notificationType) {
          console.warn(
            `⚠️ [sendNotification] notificationType not provided in request, defaulting to FLASH_NOTIFICATION for backward compatibility`,
          )
          dto.notificationType = NotificationType.FLASH_NOTIFICATION
        }

        // Check fcmToken status for logging
        if (dto.fcmToken === undefined) {
          const existingUser = await this.baseFunctionHelper.findUserByAccountId(dto.accountId)
          if (existingUser?.fcmToken) {
            console.warn(
              `⚠️ [sendNotification] ${dto.notificationType || 'Notification'} for ${
                dto.accountId
              } but fcmToken NOT PROVIDED. User has existing token: ${existingUser.fcmToken.substring(
                0,
                30,
              )}... (This might be an old/invalid token if app was reinstalled)`,
            )
          } else {
            console.warn(
              `⚠️ [sendNotification] ${dto.notificationType || 'Notification'} for ${
                dto.accountId
              } but fcmToken NOT PROVIDED. User has no existing token.`,
            )
          }
        } else if (dto.fcmToken === '') {
          console.log(
            `ℹ️ [sendNotification] ${dto.notificationType || 'Notification'} for ${
              dto.accountId
            } with EMPTY fcmToken (app deleted/reinstalled - will clear old token)`,
          )
        } else {
          console.log(
            `✅ [sendNotification] ${dto.notificationType || 'Notification'} for ${
              dto.accountId
            } with NEW fcmToken: ${dto.fcmToken.substring(0, 30)}...`,
          )
        }

        // SYNC USER DATA FIRST - This happens when FCM push is received, before processing notification
        // Mobile app always provides all data including bakongPlatform when receiving FCM push (all notification types)
        // Preserve undefined vs empty string distinction for fcmToken:
        // - undefined = not provided, don't update
        // - empty string = explicitly cleared (app deleted), clear old token
        await this.baseFunctionHelper.updateUserData({
          accountId: dto.accountId,
          language: dto.language,
          fcmToken: dto.fcmToken !== undefined ? dto.fcmToken : undefined, // Preserve undefined if not provided
          platform: dto.platform,
          participantCode: dto.participantCode,
          bakongPlatform: dto.bakongPlatform, // Mobile always provides this
        })

        console.log(
          `✅ [sendNotification] User data synced successfully for ${
            dto.accountId
          }. Proceeding with ${dto.notificationType || 'notification'}...`,
        )
      } else {
        if (!dto.notificationType) {
          dto.notificationType = NotificationType.ANNOUNCEMENT
        }
      }

      const result = await this.service.sendNow(dto, req)

      // Check if result is an error response (for no users case)
      if (
        result &&
        typeof result === 'object' &&
        'responseCode' in result &&
        result.responseCode !== 0
      ) {
        // If no users found, also mark template as draft if templateId is provided
        if (dto.templateId && result.errorCode === ErrorCode.NO_USERS_FOR_BAKONG_PLATFORM) {
          try {
            const templateService =
              this.service['templateService'] ||
              (await import('../template/template.service')).TemplateService
            // Mark as draft - we'll do this via a service method if available
            // For now, the error response is sufficient
          } catch (e) {
            console.error('Error marking template as draft:', e)
          }
        }
        return result
      }

      return result
    } catch (error: any) {
      console.error('❌ [CONTROLLER] Error in sendNotification:', error)

      // Check if error is about no users for bakongPlatform
      if (error?.message && error.message.includes('No users found for')) {
        return BaseResponseDto.error({
          errorCode: ErrorCode.NO_USERS_FOR_BAKONG_PLATFORM,
          message: ResponseMessage.NO_USERS_FOR_BAKONG_PLATFORM,
          data: {
            error: error.message,
          },
        })
      }

      // Re-throw other errors
      throw error
    }
  }

  @Post('inbox')
  @ApiKeyRequired()
  @Roles(UserRole.ADMIN_USER, UserRole.API_USER)
  async postNotificationInbox(@Body() dto: NotificationInboxDto, @Req() req: any) {
    return await this.service.getNotificationCenter(dto, req)
  }

  /**
   * Infer bakongPlatform from participantCode or accountId
   * Priority: participantCode > accountId domain
   */
  private inferBakongPlatform(participantCode?: string, accountId?: string): BakongApp | undefined {
    // Check participantCode first (higher priority)
    if (participantCode) {
      const normalized = participantCode.toUpperCase()
      if (normalized.startsWith('BKRT')) {
        return BakongApp.BAKONG
      }
      if (normalized.startsWith('BKJR')) {
        return BakongApp.BAKONG_JUNIOR
      }
      if (normalized.startsWith('TOUR')) {
        return BakongApp.BAKONG_TOURIST
      }
    }

    // Check accountId domain
    if (accountId) {
      const normalized = accountId.toLowerCase()
      if (normalized.includes('@bkrt')) {
        return BakongApp.BAKONG
      }
      if (normalized.includes('@bkjr')) {
        return BakongApp.BAKONG_JUNIOR
      }
      if (normalized.includes('@tour')) {
        return BakongApp.BAKONG_TOURIST
      }
    }

    return undefined
  }

  @Post('test-token')
  @ApiKeyRequired()
  @Roles(UserRole.ADMIN_USER, UserRole.NORMAL_USER)
  async testToken(
    @Body() dto: { token: string; bakongPlatform?: BakongApp },
    @Req() req: any,
  ) {
    console.log('🧪 [testToken] Testing token validation:', {
      tokenPrefix: dto.token ? `${dto.token.substring(0, 30)}...` : 'NO TOKEN',
      tokenLength: dto.token?.length || 0,
      bakongPlatform: dto.bakongPlatform || 'DEFAULT',
    })

    try {
      const result = await this.service.testFCMToken(dto.token, dto.bakongPlatform)
      // Return result directly in data field (not spread at top level)
      return BaseResponseDto.success({
        data: result,
        message: result.isValid
          ? 'Token is valid! A test notification has been sent.'
          : 'Token validation failed. Check the details below.',
      })
    } catch (error: any) {
      console.error('❌ [testToken] Token test failed:', error.message)
      return BaseResponseDto.error({
        errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
        message: `Token test failed: ${error.message}`,
        data: {
          tokenPrefix: dto.token ? `${dto.token.substring(0, 30)}...` : 'NO TOKEN',
          error: error.message,
        },
      })
    }
  }

  @Post('sync-users')
  @ApiKeyRequired()
  @Roles(UserRole.ADMIN_USER, UserRole.NORMAL_USER)
  async syncUsers(@Req() req: any) {
    console.log('🔄 [syncUsers] Manual user sync requested')

    try {
      const result = await this.baseFunctionHelper.syncAllUsers()
      
      console.log('✅ [syncUsers] User sync completed:', {
        totalCount: result.totalCount,
        updatedCount: result.updatedCount,
        platformUpdates: result.platformUpdates,
        languageUpdates: result.languageUpdates,
        invalidTokens: result.invalidTokens,
        updatedIdsCount: result.updatedIds.length,
      })

      return BaseResponseDto.success({
        data: {
          totalCount: result.totalCount,
          updatedCount: result.updatedCount,
          platformUpdates: result.platformUpdates,
          languageUpdates: result.languageUpdates,
          invalidTokens: result.invalidTokens,
          updatedIds: result.updatedIds,
          updatedIdsCount: result.updatedIds.length,
        },
        message: `User sync completed: ${result.updatedCount} of ${result.totalCount} users updated`,
      })
    } catch (error: any) {
      console.error('❌ [syncUsers] User sync failed:', error.message)
      return BaseResponseDto.error({
        errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
        message: `User sync failed: ${error.message}`,
        data: {
          error: error.message,
        },
      })
    }
  }
}
