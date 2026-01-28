import { Body, Controller, Post, Req } from '@nestjs/common'
import { ApiKeyRequired } from 'src/common/middleware/api-key.guard'
import { BaseResponseDto } from 'src/common/base-response.dto'
import { ErrorCode, ResponseMessage, NotificationType } from '@bakong/shared'
import { Roles } from 'src/common/middleware/roles.guard'
import { UserRole } from '@bakong/shared'
import { BakongApp } from '@bakong/shared'
import { NotificationInboxDto } from './dto/notification-inbox.dto'
import SentNotificationDto from './dto/send-notification.dto'
import { NotificationService } from 'src/modules/notification/notification.service'
import { BaseFunctionHelper } from 'src/common/util/base-function.helper'

@Controller({ path: 'notification', version: '2' })
export class NotificationControllerV2 {
  constructor(
    private readonly service: NotificationService,
    private readonly baseFunctionHelper: BaseFunctionHelper,
  ) { }

  @Post('send')
  @ApiKeyRequired()
  @Roles(UserRole.ADMINISTRATOR, UserRole.EDITOR)
  async sendNotification(@Body() dto: SentNotificationDto, @Req() req: any) {
    // mark request as v2 for downstream
    req.version = '2'

    const accountIdList = Array.isArray(dto.accountId)
      ? dto.accountId.map((x: any) => String(x).trim()).filter(Boolean)
      : undefined

    const singleAccountId =
      typeof dto.accountId === 'string' && dto.accountId.trim() ? dto.accountId.trim() : undefined

    console.log('📤 v2 /send API endpoint called with:', {
      templateId: dto.templateId,
      notificationId: dto.notificationId,
      language: dto.language,
      notificationType: dto.notificationType,
      bakongPlatform: dto.bakongPlatform,
      accountId: accountIdList?.length ? accountIdList : singleAccountId || 'N/A',
      fcmToken: dto.fcmToken
        ? `${dto.fcmToken.substring(0, 30)}...`
        : dto.fcmToken === ''
          ? 'EMPTY (explicitly cleared)'
          : 'NOT PROVIDED',
    })

    try {
      /**
       * ✅ Only sync user data when accountId is SINGLE string.
       * If accountId is array -> skip sync (bulk target send).
       */
      if (singleAccountId) {
        const notificationTypeLabel = dto.notificationType || 'UNKNOWN'
        console.log(
          `🔄 [v2 sendNotification] Syncing user data FIRST for ${singleAccountId} before processing ${notificationTypeLabel}`,
        )

        // If notificationType missing for single-user send, default to FLASH (same as your old logic)
        if (!dto.notificationType) {
          dto.notificationType = NotificationType.FLASH_NOTIFICATION
        }

        const syncData: any = { accountId: singleAccountId }

        // Keep your existing sync rules (do not overwrite with empty string)
        if (dto.fcmToken !== undefined && dto.fcmToken !== null && dto.fcmToken !== '') {
          syncData.fcmToken = dto.fcmToken
        }
        if (dto.bakongPlatform !== undefined && dto.bakongPlatform !== null) {
          syncData.bakongPlatform = dto.bakongPlatform
        }
        if (dto.language !== undefined && dto.language !== null) {
          syncData.language = dto.language
        }
        if (
          dto.participantCode !== undefined &&
          dto.participantCode !== null &&
          dto.participantCode !== ''
        ) {
          syncData.participantCode = dto.participantCode
        }

        // ✅ Use only functions that exist
        await this.baseFunctionHelper.updateUserData(syncData)
      } else if (accountIdList?.length) {
        console.log(
          `📌 [v2 sendNotification] accountId list provided (${accountIdList.length}) -> skip sync user step, send only to these users`,
        )

        // Infer bakongPlatform from the first accountId in the list if not provided
        if (!dto.bakongPlatform && accountIdList.length > 0) {
          const inferred = this.inferBakongPlatform(undefined, accountIdList[0])
          if (inferred) {
            console.log(`📌 [v2 sendNotification] Inferred bakongPlatform for list: ${inferred}`)
            dto.bakongPlatform = inferred
          }
        }

        // optional: default type when none provided
        if (!dto.notificationType) {
          dto.notificationType = NotificationType.ANNOUNCEMENT
        }
      } else {
        // No accountId -> current behavior
        if (!dto.notificationType) {
          dto.notificationType = NotificationType.ANNOUNCEMENT
        }
      }

      // ✅ Now call service (service will filter by accountId list)
      const result = await this.service.sendNow(dto, req)
      return result
    } catch (error: any) {
      console.error('❌ [V2 CONTROLLER] Error in sendNotification:', error)

      if (error?.message && error.message.includes('No users found for')) {
        return BaseResponseDto.error({
          errorCode: ErrorCode.NO_USERS_FOR_BAKONG_PLATFORM,
          message: ResponseMessage.NO_USERS_FOR_BAKONG_PLATFORM,
          data: { error: error.message },
        })
      }

      throw error
    }
  }

  @Post('inbox')
  @ApiKeyRequired()
  @Roles(UserRole.ADMINISTRATOR, UserRole.EDITOR)
  async postNotificationInbox(@Body() dto: NotificationInboxDto, @Req() req: any) {
    req.version = '2'
    console.log('📥 /inbox API called V:', {
      accountId: dto.accountId,
      language: dto.language,
      page: dto.page,
      size: dto.size,
      platform: dto.platform,
      bakongPlatform: dto.bakongPlatform,
    })
    return await this.service.getNotificationCenter(dto, req)
  }

  @Post('test-token')
  @ApiKeyRequired()
  @Roles(UserRole.ADMINISTRATOR, UserRole.EDITOR)
  async testToken(@Body() dto: { token: string; bakongPlatform?: BakongApp }, @Req() req: any) {
    req.version = '2'
    try {
      const result = await this.service.testFCMToken(dto.token, dto.bakongPlatform)
      return BaseResponseDto.success({
        data: result,
        message: result.isValid
          ? 'Token is valid! A test notification has been sent.'
          : 'Token validation failed. Check the details below.',
      })
    } catch (error: any) {
      return BaseResponseDto.error({
        errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
        message: `Token test failed: ${error.message}`,
        data: { error: error.message },
      })
    }
  }

  @Post('sync-users')
  @ApiKeyRequired()
  @Roles(UserRole.ADMINISTRATOR, UserRole.EDITOR)
  async syncUsers(@Req() req: any) {
    req.version = '2'
    const result = await this.baseFunctionHelper.syncAllUsers()
    return BaseResponseDto.success({
      data: result,
      message: `User sync completed: ${result.updatedCount} of ${result.totalCount} users updated`,
    })
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
}
