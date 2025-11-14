import { Injectable, OnModuleInit, Inject, forwardRef } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { BakongUser } from 'src/entities/bakong-user.entity'
import { Notification } from 'src/entities/notification.entity'
import { Repository, Between } from 'typeorm'
import { getMessaging, Messaging } from 'firebase-admin/messaging'
import { Template } from 'src/entities/template.entity'
import { TemplateTranslation } from 'src/entities/template-translation.entity'
import { ValidationHelper } from 'src/common/util/validation.helper'
import { BaseFunctionHelper } from 'src/common/util/base-function.helper'
import { PaginationUtils } from '@bakong/shared'
import { BaseResponseDto } from '../../common/base-response.dto'
import SentNotificationDto from './dto/send-notification.dto'
import { NotificationInboxDto } from './dto/notification-inbox.dto'
import { TemplateService } from '../template/template.service'
import { ImageService } from '../image/image.service'
import { DateFormatter } from '@bakong/shared'
import { ResponseMessage, ErrorCode } from '@bakong/shared'
import { Language, NotificationType } from '@bakong/shared'
import { InboxResponseDto } from './dto/inbox-response.dto'

@Injectable()
export class NotificationService implements OnModuleInit {
  private _fcm: Messaging | null

  constructor(
    @InjectRepository(Notification) private readonly notiRepo: Repository<Notification>,
    @InjectRepository(BakongUser) private readonly bkUserRepo: Repository<BakongUser>,
    @InjectRepository(Template) private readonly templateRepo: Repository<Template>,
    @Inject(forwardRef(() => TemplateService))
    private readonly templateService: TemplateService,
    private readonly imageService: ImageService,
    private readonly baseFunctionHelper: BaseFunctionHelper,
  ) {}

  async onModuleInit() {
    try {
      this._fcm = getMessaging()
      console.log('✓ NotificationService: Firebase Messaging initialized successfully')
    } catch (error: any) {
      console.warn(
        '⚠️  NotificationService: Firebase not initialized - notification service will run without FCM capabilities',
      )
      console.warn('⚠️  Error details:', error?.message || String(error))
      if (error?.code) {
        console.warn('⚠️  Error code:', error.code)
      }
      this._fcm = null
    }
  }

  get fcm(): Messaging | null {
    if (!this._fcm) {
      try {
        this._fcm = getMessaging()
      } catch (error: any) {
        console.warn('⚠️  Firebase messaging not available')
        console.warn('⚠️  Error details:', error?.message || String(error))
        if (error?.code) {
          console.warn('⚠️  Error code:', error.code)
        }
        return null
      }
    }
    return this._fcm
  }

  async sendWithTemplate(template: Template): Promise<number> {
    console.log('📤 [sendWithTemplate] Starting to send notification for template:', template.id)

    if (!template.translations?.length) {
      console.warn('⚠️ [sendWithTemplate] No translations found for template:', template.id)
      return 0
    }

    const normalizedPlatforms = template.platforms.map((p) => ValidationHelper.normalizeEnum(p))
    console.log('📤 [sendWithTemplate] Target platforms:', {
      raw: template.platforms,
      normalized: normalizedPlatforms,
    })

    const users = await this.bkUserRepo.find()
    console.log('📤 [sendWithTemplate] Total users in database:', users.length)

    const targetsAllPlatforms = normalizedPlatforms.includes('ALL')
    console.log('📤 [sendWithTemplate] Targeting ALL platforms?', targetsAllPlatforms)

    if (targetsAllPlatforms) {
      console.log(
        '📤 [sendWithTemplate] ✅ "ALL" detected - will send to iOS, Android, and any platform',
      )
    } else {
      console.log('📤 [sendWithTemplate] Targeting specific platforms:', normalizedPlatforms)
    }

    const matchingUsers = users.filter((user) => {
      if (!user.platform) return false
      if (targetsAllPlatforms) return true
      return normalizedPlatforms.some((p) => ValidationHelper.normalizeEnum(user.platform) === p)
    })

    // Log platform breakdown for debugging
    if (matchingUsers.length > 0) {
      const platformBreakdown = {}
      matchingUsers.forEach((user) => {
        const platform = user.platform || 'NULL'
        platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1
      })
      console.log('📤 [sendWithTemplate] Platform breakdown:', platformBreakdown)
    }

    console.log('📤 [sendWithTemplate] Users matching platform filter:', matchingUsers.length)

    if (!matchingUsers.length) {
      console.warn('⚠️ [sendWithTemplate] No users match the platform filter')
      return 0
    }

    const defaultTranslation = this.templateService.findBestTranslation(template, Language.EN)
    if (!defaultTranslation) {
      console.warn('⚠️ [sendWithTemplate] No default translation found')
      return 0
    }

    const usersWithTokens = matchingUsers.filter((user) => user.fcmToken?.trim())
    console.log('📤 [sendWithTemplate] Users with FCM tokens:', usersWithTokens.length)

    if (!usersWithTokens.length) {
      console.warn('⚠️ [sendWithTemplate] No users have FCM tokens')
      return 0
    }

    if (!this.fcm) {
      console.error(
        '❌ [sendWithTemplate] Firebase FCM is not initialized. Cannot send notifications.',
      )
      return 0
    }

    console.log('📤 [sendWithTemplate] Validating FCM tokens...')
    const validUsers = await ValidationHelper.validateFCMTokens(usersWithTokens, this.fcm)
    console.log('📤 [sendWithTemplate] Valid users after token validation:', validUsers.length)

    if (!validUsers.length) {
      console.warn('⚠️ [sendWithTemplate] No users have valid FCM tokens after validation')
      return 0
    }

    console.log('📤 [sendWithTemplate] Sending FCM notifications to', validUsers.length, 'users...')
    const result = (await this.sendFCM(
      template,
      defaultTranslation,
      validUsers,
      undefined,
      'individual',
    )) as { notificationId: number | null; successfulCount: number; failedCount: number }

    console.log('✅ [sendWithTemplate] Notification send complete:', {
      successfulCount: result.successfulCount,
      failedCount: result.failedCount,
      totalUsers: validUsers.length,
    })

    return result.successfulCount
  }

  async sendNow(dto: SentNotificationDto, req?: any) {
    try {
      if (dto.notificationId) {
        const notification = await this.notiRepo.findOne({
          where: { id: dto.notificationId },
          relations: ['template', 'template.translations'],
        })
        if (!notification) throw new Error('Notification not found')

        if (notification.template && !notification.template.translations) {
          notification.template.translations = []
        }

        const trans = this.templateService.findBestTranslation(notification.template, dto.language)
        const imageUrl = trans?.imageId ? this.imageService.buildImageUrl(trans.imageId, req) : ''

        const result = InboxResponseDto.buildSendApiNotificationData(
          notification.template,
          trans,
          dto.language,
          typeof imageUrl === 'string' ? imageUrl : '',
          notification.id,
          notification.sendCount,
        )

        return BaseResponseDto.success({
          data: { whatnews: result },
          message: `Send ${notification.template.notificationType} to users successfully.`,
        })
      }

      await this.baseFunctionHelper.updateUserData()

      const { template, notificationType } =
        await this.templateService.findNotificationTemplate(dto)
      if (!template) throw new Error(ResponseMessage.TEMPLATE_NOT_FOUND)

      const translationValidation = ValidationHelper.validateTranslation(template, dto.language)
      if (!translationValidation.isValid) throw new Error(translationValidation.errorMessage)
      const translation = translationValidation.translation

      const allUsers = await this.bkUserRepo.find()
      const usersWithTokens = allUsers.filter((u) => u.fcmToken?.trim())

      if (notificationType === NotificationType.FLASH_NOTIFICATION) {
        return await this.handleFlashNotification(template, translation, dto, req)
      }

      if (!usersWithTokens.length) throw new Error(ResponseMessage.NO_USERS_CAN_RECEIVE)

      await this.baseFunctionHelper.syncAllUsers()
      const refreshedUsers = await this.bkUserRepo.find()
      const refreshedWithTokens = refreshedUsers.filter((u) => u.fcmToken?.trim())
      const validUsers = await ValidationHelper.validateFCMTokens(refreshedWithTokens, this.fcm)
      if (!validUsers.length) throw new Error('No valid FCM tokens found after user data sync')

      const savedRecords = await Promise.all(
        validUsers.map((u) =>
          this.storeNotification({
            accountId: u.accountId,
            templateId: template.id,
            fcmToken: u.fcmToken,
            sendCount: 1,
            firebaseMessageId: 0,
          }),
        ),
      )

      const firstRecord = savedRecords[0]

      let fcmResult: { successfulCount: number; failedCount: number } | void
      try {
        fcmResult = await this.sendFCM(
          template,
          translation,
          validUsers,
          req,
          'shared',
          firstRecord.id,
        )
      } catch (err) {
        throw new Error(`FCM ASYNC SEND ERROR: ${err}`)
      }

      // Check if FCM send was successful
      if (fcmResult && typeof fcmResult === 'object' && 'successfulCount' in fcmResult) {
        console.log(
          `📊 FCM send result: ${fcmResult.successfulCount} successful, ${fcmResult.failedCount} failed`,
        )
        if (fcmResult.successfulCount === 0 && fcmResult.failedCount > 0) {
          throw new Error(
            `Failed to send notification to any users. All ${fcmResult.failedCount} attempts failed.`,
          )
        }
        if (fcmResult.successfulCount === 0) {
          throw new Error('No notifications were sent. FCM send returned 0 successful sends.')
        }
      }

      const responseTranslation = this.templateService.findBestTranslation(template, dto.language)
      const imageUrl = responseTranslation?.imageId
        ? this.imageService.buildImageUrl(responseTranslation.imageId, req)
        : ''

      // Only mark as published if FCM send was successful
      await this.templateService.markAsPublished(template.id, req?.user)

      const whatNews = InboxResponseDto.buildSendApiNotificationData(
        template,
        responseTranslation,
        dto.language,
        typeof imageUrl === 'string' ? imageUrl : '',
        firstRecord.id,
        firstRecord.sendCount,
      )
      return BaseResponseDto.success({
        data: { whatnews: whatNews },
        message: `Send ${template.notificationType} to users successfully`,
      })
    } catch (error: any) {
      return BaseResponseDto.error({
        errorCode: error?.code || ErrorCode.INTERNAL_SERVER_ERROR,
        message: `Invalid ${error?.message || ResponseMessage.INTERNAL_SERVER_ERROR}`,
        data: { notification: {} },
      })
    }
  }

  private async sendFCM(
    template: Template,
    translation: TemplateTranslation,
    validUsers: BakongUser[],
    req?: any,
    mode: 'individual' | 'shared' = 'individual',
    sharedNotificationId?: number,
  ): Promise<{
    notificationId: number | null
    successfulCount: number
    failedCount: number
  } | void> {
    console.log('📨 [sendFCM] Starting FCM send process:', {
      templateId: template.id,
      validUsersCount: validUsers.length,
      mode: mode,
    })

    try {
      const successfulNotifications: Array<{ id: number }> = []
      const failedUsers: Array<{ accountId: string; error: string; errorCode?: string }> = []
      let sharedSuccessfulCount = 0
      let sharedFailedCount = 0

      const imageUrl = translation.imageId
        ? this.imageService.buildImageUrl(translation.imageId, req)
        : ''
      const imageUrlString = typeof imageUrl === 'string' ? imageUrl : ''
      const title = this.baseFunctionHelper.truncateText('title', translation.title)
      const body = this.baseFunctionHelper.truncateText('content', translation.content)

      console.log('📨 [sendFCM] Notification details:', {
        title: title,
        bodyLength: body?.length || 0,
        hasImage: !!imageUrlString,
      })

      const fcmUsers = this.baseFunctionHelper.filterValidFCMUsers(validUsers, mode)
      console.log('📨 [sendFCM] Filtered FCM users:', fcmUsers.length)

      for (const user of fcmUsers) {
        try {
          console.log('📨 [sendFCM] Sending to user:', {
            accountId: user.accountId,
            platform: user.platform,
            normalizedPlatform: ValidationHelper.normalizeEnum(user.platform),
            fcmToken: user.fcmToken ? `${user.fcmToken.substring(0, 30)}...` : 'NO TOKEN',
          })

          let notificationId = sharedNotificationId ?? 0
          if (mode === 'individual') {
            const saved = await this.storeNotification({
              accountId: user.accountId,
              templateId: template.id,
              fcmToken: user.fcmToken,
              sendCount: 1,
              firebaseMessageId: 0,
            })
            notificationId = saved.id
            console.log('📨 [sendFCM] Created notification record:', notificationId)
          }

          const notificationIdStr = String(notificationId)

          if (
            mode === 'shared' &&
            template.notificationType === NotificationType.FLASH_NOTIFICATION
          ) {
            console.log('📨 [sendFCM] Skipping FLASH_NOTIFICATION in shared mode')
            continue
          }

          console.log('📨 [sendFCM] Calling sendFCMPayloadToPlatform for user:', user.accountId)
          const response = await this.sendFCMPayloadToPlatform(
            user,
            template,
            translation,
            title,
            body,
            notificationIdStr,
            imageUrlString,
            mode,
          )

          if (response) {
            const responseString =
              typeof response === 'string' ? response : JSON.stringify(response)
            await this.updateNotificationRecord(
              user,
              template,
              notificationId,
              responseString,
              mode,
            )
            console.log('✅ [sendFCM] Successfully sent to user:', user.accountId)
            if (mode === 'individual') {
              successfulNotifications.push({ id: notificationId })
            } else if (mode === 'shared') {
              sharedSuccessfulCount++
            }
          } else {
            console.warn('⚠️ [sendFCM] No response from FCM for user:', user.accountId)
            if (mode === 'shared') {
              sharedFailedCount++
            }
          }
        } catch (error: any) {
          console.error(
            '❌ [sendFCM] Failed to send to user:',
            user.accountId,
            'Error:',
            error.message,
          )
          if (mode === 'individual') {
            failedUsers.push({
              accountId: user.accountId,
              error: error.message,
              errorCode: error.code,
            })
          } else if (mode === 'shared') {
            sharedFailedCount++
          }
          // Continue to next user instead of throwing - don't stop sending to other users
          continue
        }
      }

      const totalSuccessful =
        mode === 'individual' ? successfulNotifications.length : sharedSuccessfulCount
      const totalFailed = mode === 'individual' ? failedUsers.length : sharedFailedCount

      console.log('📨 [sendFCM] Send process complete:', {
        successful: totalSuccessful,
        failed: totalFailed,
        total: fcmUsers.length,
        mode: mode,
      })

      return InboxResponseDto.buildFCMResult(
        mode,
        successfulNotifications,
        failedUsers,
        fcmUsers,
        sharedNotificationId,
        sharedSuccessfulCount,
        sharedFailedCount,
      )
    } catch (error: any) {
      console.error('❌ [sendFCM] Critical error in sendFCM:', error.message)
      return InboxResponseDto.buildFCMResult(
        mode,
        [],
        [],
        validUsers,
        undefined,
        0,
        validUsers.length,
      )
    }
  }

  private async sendFCMPayloadToPlatform(
    user: BakongUser,
    template: Template,
    translation: TemplateTranslation,
    title: string,
    body: string,
    notificationIdStr: string,
    imageUrlString: string,
    mode: 'individual' | 'shared',
  ): Promise<string | null> {
    const platform = ValidationHelper.isPlatform(user.platform)
    console.log('📱 [sendFCMPayloadToPlatform] Platform detection:', {
      userPlatform: user.platform,
      isIOS: platform.ios,
      isAndroid: platform.android,
      mode: mode,
    })

    const response: string | null = null

    if (platform.ios) {
      console.log('📱 [sendFCMPayloadToPlatform] Preparing iOS notification...')
      const whatNews = InboxResponseDto.buildBaseNotificationData(
        template,
        translation,
        translation.language,
        imageUrlString,
        parseInt(notificationIdStr),
      )

      const iosPayloadResponse =
        mode === 'individual'
          ? InboxResponseDto.buildIOSAlertPayload(
              user.fcmToken,
              title,
              body,
              notificationIdStr,
              whatNews as unknown as Record<string, string | number>,
            )
          : InboxResponseDto.buildIOSPayload(
              user.fcmToken,
              template.notificationType,
              title,
              body,
              notificationIdStr,
              whatNews as unknown as Record<string, string | number>,
            )

      try {
        if (!this.fcm) {
          console.warn('⚠️  FCM not available - skipping iOS notification send')
          throw new Error(
            'Firebase Cloud Messaging is not initialized. Please check Firebase configuration.',
          )
        }
        console.log('📱 [sendFCMPayloadToPlatform] Sending iOS FCM message...', {
          token: user.fcmToken ? `${user.fcmToken.substring(0, 30)}...` : 'NO TOKEN',
          title: title?.substring(0, 50),
          body: body ? `${body.substring(0, 50)}...` : 'NO BODY',
        })
        const sendResponse = await this.fcm.send(iosPayloadResponse)
        console.log('✅ [sendFCMPayloadToPlatform] iOS FCM send successful:', {
          response: sendResponse ? `${String(sendResponse).substring(0, 50)}...` : 'NO RESPONSE',
        })
        return sendResponse
      } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error'
        const errorCode = error?.code || 'N/A'
        console.error('❌ [sendFCMPayloadToPlatform] iOS FCM send failed:', {
          accountId: user.accountId,
          errorMessage: errorMessage,
          errorCode: errorCode,
          errorDetails: error?.details || 'N/A',
          fullError: process.env.NODE_ENV === 'development' ? error : 'Hidden in production',
        })
        throw new Error(`iOS FCM send failed: ${errorMessage} (code: ${errorCode})`)
      }
    }
    if (platform.android) {
      console.log('📱 [sendFCMPayloadToPlatform] Preparing Android notification...')
      const extraData = {
        templateId: String(template.id),
        notificationType: String(template.notificationType),
        categoryType: String(template.categoryType),
        language: String(translation.language),
        accountId: String(user.accountId),
        platform: String(user.platform || 'android'),
        imageUrl: imageUrlString || '',
        content: translation.content || '',
        linkPreview: translation.linkPreview || '',
        createdDate: template.createdAt
          ? DateFormatter.formatDateByLanguage(template.createdAt, translation.language)
          : DateFormatter.formatDateByLanguage(new Date(), translation.language),

        notification_title: title,
        notification_body: body,
      }

      const msg = InboxResponseDto.buildAndroidDataOnlyPayload(
        user.fcmToken,
        title,
        body,
        notificationIdStr,
        extraData,
      )

      try {
        if (!this.fcm) {
          console.warn('⚠️  FCM not available - skipping Android notification send')
          throw new Error(
            'Firebase Cloud Messaging is not initialized. Please check Firebase configuration.',
          )
        }
        console.log('📱 [sendFCMPayloadToPlatform] Sending Android FCM message...', {
          token: user.fcmToken ? `${user.fcmToken.substring(0, 30)}...` : 'NO TOKEN',
          title: title?.substring(0, 50),
          body: body ? `${body.substring(0, 50)}...` : 'NO BODY',
        })
        const sendResponse = await this.fcm.send(msg)
        console.log('✅ [sendFCMPayloadToPlatform] Android FCM send successful:', {
          response: sendResponse ? `${String(sendResponse).substring(0, 50)}...` : 'NO RESPONSE',
        })
        return sendResponse
      } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error'
        const errorCode = error?.code || 'N/A'
        console.error('❌ [sendFCMPayloadToPlatform] Android FCM send failed:', {
          accountId: user.accountId,
          errorMessage: errorMessage,
          errorCode: errorCode,
          errorDetails: error?.details || 'N/A',
          fullError: process.env.NODE_ENV === 'development' ? error : 'Hidden in production',
        })
        console.error('❌ Error code:', errorCode)
        throw new Error(`Android FCM send failed: ${errorMessage} (code: ${errorCode})`)
      }
    }

    // If platform is neither iOS nor Android
    if (!platform.ios && !platform.android) {
      console.warn('⚠️ [sendFCMPayloadToPlatform] Platform not recognized:', {
        userPlatform: user.platform,
        accountId: user.accountId,
        isIOS: platform.ios,
        isAndroid: platform.android,
      })
      console.warn(
        '⚠️ [sendFCMPayloadToPlatform] Skipping notification - platform must be IOS or ANDROID',
      )
      return null
    }

    return response
  }

  private async handleFlashNotification(
    template: Template,
    translation: TemplateTranslation,
    dto: SentNotificationDto,
    req?: any,
  ) {
    const { accountId, language, templateId } = dto

    if (!accountId) {
      return BaseResponseDto.error({
        errorCode: ErrorCode.USER_NOT_FOUND,
        message: ResponseMessage.USER_NOT_FOUND,
        data: { accountId: 'No accountId provided for flash notification' },
      })
    }

    let selectedTemplate = template
    let selectedTranslation = translation

    if (templateId) {
      selectedTemplate = await this.templateRepo.findOne({
        where: { id: templateId, notificationType: NotificationType.FLASH_NOTIFICATION },
        relations: ['translations'],
      })

      if (!selectedTemplate) {
        return BaseResponseDto.error({
          errorCode: ErrorCode.TEMPLATE_NOT_FOUND,
          message: ResponseMessage.TEMPLATE_NOT_FOUND,
          data: { templateId },
        })
      }
      selectedTranslation = this.templateService.findBestTranslation(selectedTemplate, language)
    } else {
      const bestTemplate = await this.templateService.findBestTemplateForUser(
        accountId,
        language,
        this.notiRepo,
      )
      if (!bestTemplate) {
        return BaseResponseDto.error({
          errorCode: ErrorCode.NO_FLASH_NOTIFICATION_TEMPLATE_AVAILABLE,
          message: ResponseMessage.NO_FLASH_NOTIFICATION_TEMPLATE_AVAILABLE,
          data: {},
        })
      }
      selectedTemplate = bestTemplate.template
      selectedTranslation = bestTemplate.translation
    }

    if (!selectedTranslation) {
      return BaseResponseDto.error({
        errorCode: ErrorCode.NO_FLASH_NOTIFICATION_TEMPLATE_AVAILABLE,
        message: ResponseMessage.NO_FLASH_NOTIFICATION_TEMPLATE_AVAILABLE,
      })
    }

    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const existingCount = await this.notiRepo.count({
      where: {
        accountId,
        templateId: selectedTemplate.id,
        createdAt: Between(twentyFourHoursAgo, now),
      },
    })
    const newSendCount = existingCount + 1

    const user = await this.baseFunctionHelper.findUserByAccountId(accountId)
    const saved = await this.storeNotification({
      accountId,
      templateId: selectedTemplate.id,
      fcmToken: user?.fcmToken,
      sendCount: newSendCount,
      firebaseMessageId: 0,
    })

    await this.templateService.markAsPublished(selectedTemplate.id, req?.user)

    const imageUrl = selectedTranslation?.imageId
      ? this.imageService.buildImageUrl(selectedTranslation.imageId, req)
      : ''
    const whatNews = InboxResponseDto.buildSendApiNotificationData(
      selectedTemplate,
      selectedTranslation,
      language,
      typeof imageUrl === 'string' ? imageUrl : '',
      saved.id,
      saved.sendCount,
    )
    return BaseResponseDto.success({
      data: { whatnews: whatNews },
      message: ResponseMessage.FLASH_NOTIFICATION_POPUP_SUCCESS,
    })
  }

  async getNotificationCenter(dto: NotificationInboxDto, req?: any) {
    try {
      const { accountId, fcmToken, participantCode, platform, language, page, size } = dto
      const { skip, take } = PaginationUtils.normalizePagination(page, size)

      const syncResult = await this.baseFunctionHelper.updateUserData({
        accountId,
        fcmToken,
        participantCode,
        platform,
        language,
      })
      const user = await this.baseFunctionHelper.findUserByAccountId(accountId)

      if (!user) {
        return BaseResponseDto.error({
          errorCode: ErrorCode.USER_NOT_FOUND,
          message: ResponseMessage.USER_NOT_FOUND,
          data: { accountId },
        })
      }

      const [notifications, totalCount] = await this.notiRepo.findAndCount({
        where: { accountId: accountId.trim() },
        order: { createdAt: 'DESC' },
        skip,
        take,
      })
      for (const notification of notifications) {
        if (notification.templateId) {
          notification.template = await this.templateRepo.findOne({
            where: { id: notification.templateId },
            relations: ['translations'],
          })

          if (notification.template && !notification.template.translations) {
            notification.template.translations = []
          }
        }
      }

      const isNewUser = 'isNewUser' in syncResult ? (syncResult as any).isNewUser : false

      return InboxResponseDto.getNotificationCenterResponse(
        notifications.map(
          (notif) =>
            new InboxResponseDto(
              notif as Notification,
              language as Language,
              this.baseFunctionHelper.getBaseUrl(req),
              this.templateService,
              this.imageService,
            ),
        ),
        PaginationUtils.generateResponseMessage(
          notifications,
          totalCount,
          page,
          size,
          PaginationUtils.calculatePaginationMeta(page, size, totalCount, notifications.length)
            .pageCount,
          isNewUser,
        ),
        PaginationUtils.calculatePaginationMeta(page, size, totalCount, notifications.length),
      )
    } catch (error) {
      return BaseResponseDto.error({
        errorCode: ErrorCode.FLASH_NOTIFICATION_POPUP_FAILED,
        message: ResponseMessage.FLASH_NOTIFICATION_POPUP_FAILED,
        data: { accountId: dto.accountId, error: (error as any).message },
      })
    }
  }

  private async storeNotification(params: {
    accountId: string
    templateId: number
    fcmToken?: string
    sendCount?: number
    firebaseMessageId?: number
  }): Promise<Notification> {
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

    const existingNotification = await this.notiRepo.findOne({
      where: {
        accountId: params.accountId,
        templateId: params.templateId,
        createdAt: Between(fiveMinutesAgo, now),
      },
      order: {
        createdAt: 'DESC',
      },
    })

    if (existingNotification) {
      return existingNotification
    }

    const entity = this.notiRepo.create({
      accountId: params.accountId,
      templateId: params.templateId,
      fcmToken: params.fcmToken ?? '',
      sendCount: params.sendCount ?? 1,
      firebaseMessageId: params.firebaseMessageId ?? 0,
    })
    return this.notiRepo.save(entity)
  }

  private async updateNotificationRecord(
    user: BakongUser,
    template: Template,
    notificationId: number,
    response: string,
    mode: 'individual' | 'shared',
  ): Promise<void> {
    const firebaseMessageId = ValidationHelper.validateFirebaseMessageId(response)

    if (mode === 'individual') {
      try {
        await this.notiRepo.update({ id: notificationId }, { firebaseMessageId })
        return
      } catch (error) {
        throw error
      }
    }
    try {
      if (notificationId > 0) {
        const notification = await this.notiRepo.findOne({
          where: { id: notificationId, accountId: user.accountId },
        })
        if (notification) {
          await this.notiRepo.update({ id: notificationId }, { firebaseMessageId })
          return
        }
      }

      const latest = await this.notiRepo
        .createQueryBuilder('notification')
        .select('notification.id')
        .where('notification.accountId = :accountId', { accountId: user.accountId })
        .andWhere('notification.templateId = :templateId', { templateId: template.id })
        .andWhere('notification.firebaseMessageId = 0')
        .orderBy('notification.createdAt', 'DESC')
        .getOne()

      if (latest) {
        await this.notiRepo.update({ id: latest.id }, { firebaseMessageId })
        return
      }

      const fallbackNotification = await this.notiRepo
        .createQueryBuilder('notification')
        .select('notification.id')
        .where('notification.accountId = :accountId', { accountId: user.accountId })
        .orderBy('notification.createdAt', 'DESC')
        .getOne()

      if (fallbackNotification) {
        await this.notiRepo.update({ id: fallbackNotification.id }, { firebaseMessageId })
        return
      }
    } catch (error) {}
  }

  async deleteNotificationsByTemplateId(templateId: number): Promise<void> {
    try {
      console.log(`Deleting all notification records for template ID: ${templateId}`)
      const result = await this.notiRepo.delete({ templateId })
      console.log(`Deleted ${result.affected || 0} notification records for template ${templateId}`)
    } catch (error) {
      console.error(`Error deleting notification records for template ${templateId}:`, error)
      throw error
    }
  }
}
