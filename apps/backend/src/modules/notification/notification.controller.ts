import { Body, Controller, Post, Req } from '@nestjs/common'
import { ApiKeyRequired } from 'src/common/middleware/api-key.guard'
import { NotificationInboxDto } from './dto/notification-inbox.dto'
import { NotificationService } from './notification.service'
import SentNotificationDto from './dto/send-notification.dto'
import { BaseResponseDto } from 'src/common/base-response.dto'
import { ErrorCode, ResponseMessage } from '@bakong/shared'
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
    })

    try {
      if (dto.accountId) {
        dto.notificationType = NotificationType.FLASH_NOTIFICATION

        // Auto-sync/register user with data from mobile app
        // Mobile app MUST provide bakongPlatform - backend uses exactly what mobile sends
        await this.baseFunctionHelper.updateUserData({
          accountId: dto.accountId,
          language: dto.language,
          fcmToken: dto.fcmToken || '', // Use empty string as placeholder if not provided
          platform: dto.platform,
          participantCode: dto.participantCode,
          bakongPlatform: dto.bakongPlatform, // Mobile app must provide this
        })
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
}
