import { Injectable, Inject, forwardRef } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { BakongUser } from 'src/entities/bakong-user.entity'
import { Notification } from 'src/entities/notification.entity'
import { Repository, Between } from 'typeorm'
import { Messaging } from 'firebase-admin/messaging'
import { Template } from 'src/entities/template.entity'
import { TemplateTranslation } from 'src/entities/template-translation.entity'
import { ValidationHelper } from 'src/common/util/validation.helper'
import { BaseFunctionHelper } from 'src/common/util/base-function.helper'
import { FirebaseManager } from 'src/common/services/firebase-manager.service'
import { PaginationUtils } from '@bakong/shared'
import { BaseResponseDto } from '../../common/base-response.dto'
import SentNotificationDto from './dto/send-notification.dto'
import { NotificationInboxDto } from './dto/notification-inbox.dto'
import { TemplateService } from '../template/template.service'
import { ImageService } from '../image/image.service'
import { DateFormatter } from '@bakong/shared'
import { ResponseMessage, ErrorCode, BakongApp } from '@bakong/shared'
import { Language, NotificationType } from '@bakong/shared'
import { InboxResponseDto } from './dto/inbox-response.dto'

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification) private readonly notiRepo: Repository<Notification>,
    @InjectRepository(BakongUser) private readonly bkUserRepo: Repository<BakongUser>,
    @InjectRepository(Template) private readonly templateRepo: Repository<Template>,
    @Inject(forwardRef(() => TemplateService))
    private readonly templateService: TemplateService,
    private readonly imageService: ImageService,
    private readonly baseFunctionHelper: BaseFunctionHelper,
  ) {}

  /**
   * Get Firebase Messaging instance for a specific Bakong platform
   * Falls back to default if platform is not specified
   */
  /**
   * Test FCM token validation - sends a test notification to verify token validity
   * This is useful for debugging token issues
   */
  async testFCMToken(
    token: string,
    bakongPlatform?: BakongApp | string | null,
  ): Promise<{
    isValid: boolean
    formatValid: boolean
    firebaseValid: boolean
    error?: string
    errorCode?: string
    messageId?: string
  }> {
    console.log('🧪 [testFCMToken] Starting token test...')
    console.log('🧪 [testFCMToken] Token:', token ? `${token.substring(0, 30)}...` : 'NO TOKEN')
    console.log('🧪 [testFCMToken] Platform:', bakongPlatform || 'DEFAULT')

    // Step 1: Format validation
    const formatValid = ValidationHelper.isValidFCMTokenFormat(token)
    console.log('🧪 [testFCMToken] Format validation:', formatValid ? '✅ PASS' : '❌ FAIL')

    if (!formatValid) {
      return {
        isValid: false,
        formatValid: false,
        firebaseValid: false,
        error: 'Token format is invalid',
        errorCode: 'INVALID_FORMAT',
      }
    }

    // Step 2: Get FCM instance
    const fcm = this.getFCM(bakongPlatform)
    if (!fcm) {
      return {
        isValid: false,
        formatValid: true,
        firebaseValid: false,
        error: 'Firebase FCM is not initialized',
        errorCode: 'FCM_NOT_INITIALIZED',
      }
    }

    // Step 3: Try to send a test notification
    // This will fail if token is invalid
    const testMessage = {
      token: token,
      notification: {
        title: '🧪 Token Test',
        body: 'This is a test notification to validate your token',
      },
      data: {
        test: 'true',
        timestamp: new Date().toISOString(),
      },
    }

    try {
      console.log('🧪 [testFCMToken] Attempting to send test notification...')
      const messageId = await fcm.send(testMessage)
      console.log('✅ [testFCMToken] Token is VALID - notification sent successfully!')
      console.log('✅ [testFCMToken] Message ID:', messageId)

      return {
        isValid: true,
        formatValid: true,
        firebaseValid: true,
        messageId: String(messageId),
      }
    } catch (error: any) {
      const errorCode = error.code || 'UNKNOWN_ERROR'
      const errorMessage = error.message || 'Unknown error'

      console.error('❌ [testFCMToken] Token is INVALID:', {
        errorCode,
        errorMessage,
      })

      // Check for specific invalid token errors
      const isInvalidToken =
        errorCode === 'messaging/registration-token-not-registered' ||
        errorCode === 'messaging/invalid-registration-token' ||
        errorCode === 'messaging/invalid-argument'

      return {
        isValid: false,
        formatValid: true,
        firebaseValid: !isInvalidToken,
        error: errorMessage,
        errorCode: errorCode,
      }
    }
  }

  private getFCM(bakongPlatform?: string | null): Messaging | null {
    const fcm = FirebaseManager.getMessaging(bakongPlatform)
    if (fcm) {
      const appName = bakongPlatform 
        ? FirebaseManager.getAppName(bakongPlatform)
        : 'DEFAULT'
      const serviceAccountPath = bakongPlatform 
        ? FirebaseManager.getServiceAccountPath(bakongPlatform)
        : null
      console.log(`🔥 [getFCM] Using Firebase app: ${appName} for platform: ${bakongPlatform || 'DEFAULT'}`)
      console.log(`🔥 [getFCM] Service account path: ${serviceAccountPath || 'Using default'}`)
      
      // Try to read and log project_id from service account
      if (serviceAccountPath && require('fs').existsSync(serviceAccountPath)) {
        try {
          const fs = require('fs')
          const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
          console.log(`🔥 [getFCM] Firebase Project ID: ${serviceAccount.project_id || 'NOT FOUND'}`)
          console.log(`🔥 [getFCM] Service Account Email: ${serviceAccount.client_email || 'NOT FOUND'}`)
        } catch (e: any) {
          console.warn(`⚠️ [getFCM] Could not read service account file: ${e.message}`)
        }
      }
    } else {
      console.error(`❌ [getFCM] No FCM instance available for platform: ${bakongPlatform || 'DEFAULT'}`)
    }
    return fcm
  }

  async sendWithTemplate(
    template: Template,
  ): Promise<{ successfulCount: number; failedCount: number; failedUsers?: string[] }> {
    console.log('📤 [sendWithTemplate] Starting to send notification for template:', template.id)
    console.log('📤 [sendWithTemplate] Template bakongPlatform:', template.bakongPlatform)

    if (!template.translations?.length) {
      console.warn('⚠️ [sendWithTemplate] No translations found for template:', template.id)
      return { successfulCount: 0, failedCount: 0, failedUsers: [] }
    }

    // Parse platforms using shared helper function
    const platformsArray = ValidationHelper.parsePlatforms(template.platforms)

    console.log('📤 [sendWithTemplate] Parsed platforms:', {
      raw: template.platforms,
      parsed: platformsArray,
      type: typeof template.platforms,
      isArray: Array.isArray(template.platforms),
    })

    // Normalize platforms and ensure they're valid Platform enum values
    const normalizedPlatforms = platformsArray
      .map((p) => ValidationHelper.normalizeEnum(p))
      .filter((p) => p === 'ALL' || p === 'IOS' || p === 'ANDROID') // Only allow valid platform values

    if (normalizedPlatforms.length === 0) {
      console.warn('⚠️ [sendWithTemplate] No valid platforms found, defaulting to ALL')
      normalizedPlatforms.push('ALL')
    }

    console.log('📤 [sendWithTemplate] Target platforms:', {
      raw: template.platforms,
      parsed: platformsArray,
      normalized: normalizedPlatforms,
    })

    // Sync and normalize all users before checking availability
    // This cleans up invalid tokens, normalizes platform/language values
    // Note: This doesn't fetch NEW data from external sources - it only normalizes existing data
    // New user data comes from mobile apps when they call /send or /inbox APIs
    console.log('📤 [sendWithTemplate] Syncing and normalizing all users...')
    const syncResult = await this.baseFunctionHelper.syncAllUsers()
    console.log('📤 [sendWithTemplate] User sync complete:', {
      totalUsers: syncResult.totalCount,
      updatedUsers: syncResult.updatedCount,
      invalidTokensCleaned: syncResult.invalidTokens,
    })

    let users = await this.bkUserRepo.find()
    console.log('📤 [sendWithTemplate] Total users in database:', users.length)

    // Filter by bakongPlatform if template has it
    if (template.bakongPlatform) {
      const beforeCount = users.length
      users = users.filter((user) => user.bakongPlatform === template.bakongPlatform)
      console.log(
        `📤 [sendWithTemplate] Filtered by bakongPlatform (${template.bakongPlatform}): ${beforeCount} → ${users.length} users`,
      )

      // Check if no users found for this bakongPlatform
      if (users.length === 0) {
        const platformName =
          template.bakongPlatform === 'BAKONG_TOURIST'
            ? 'Bakong Tourist'
            : template.bakongPlatform === 'BAKONG_JUNIOR'
              ? 'Bakong Junior'
              : 'Bakong'
        throw new Error(
          `No users found for ${platformName} app. Please ensure there are registered users for this platform before sending notifications.`,
        )
      }
    }

    const targetsAllPlatforms = normalizedPlatforms.includes('ALL')
    console.log('📤 [sendWithTemplate] Targeting ALL platforms?', targetsAllPlatforms)

    if (targetsAllPlatforms) {
      console.log(
        '📤 [sendWithTemplate] ✅ "ALL" detected - will send to iOS, Android, and any platform',
      )
    } else {
      console.log('📤 [sendWithTemplate] Targeting specific platforms:', normalizedPlatforms)
    }

    // Log user platforms before filtering for debugging
    const userPlatformBreakdown: Record<string, number> = {}
    users.forEach((user) => {
      const platform = user.platform || 'NULL'
      const normalizedUserPlatform = user.platform
        ? ValidationHelper.normalizeEnum(user.platform)
        : 'NULL'
      const key = `${platform} (normalized: ${normalizedUserPlatform})`
      userPlatformBreakdown[key] = (userPlatformBreakdown[key] || 0) + 1
    })
    console.log('📤 [sendWithTemplate] User platforms BEFORE filtering:', userPlatformBreakdown)

    const matchingUsers = users.filter((user) => {
      if (!user.platform) {
        console.log(`📤 [sendWithTemplate] Filtering out user ${user.accountId}: no platform set`)
        return false
      }
      if (targetsAllPlatforms) {
        return true
      }
      const normalizedUserPlatform = ValidationHelper.normalizeEnum(user.platform)
      const matches = normalizedPlatforms.some((p) => normalizedUserPlatform === p)
      if (!matches) {
        console.log(
          `📤 [sendWithTemplate] Filtering out user ${user.accountId}: platform "${
            user.platform
          }" (normalized: "${normalizedUserPlatform}") not in target platforms [${normalizedPlatforms.join(
            ', ',
          )}]`,
        )
      }
      return matches
    })

    // Log platform breakdown for debugging
    if (matchingUsers.length > 0) {
      const platformBreakdown: Record<string, number> = {}
      matchingUsers.forEach((user) => {
        const platform = user.platform || 'NULL'
        const normalizedPlatform = user.platform
          ? ValidationHelper.normalizeEnum(user.platform)
          : 'NULL'
        const key = `${platform} (normalized: ${normalizedPlatform})`
        platformBreakdown[key] = (platformBreakdown[key] || 0) + 1
      })
      console.log('📤 [sendWithTemplate] Platform breakdown AFTER filtering:', platformBreakdown)
    } else {
      console.log('📤 [sendWithTemplate] No users match platform filter')
    }

    console.log('📤 [sendWithTemplate] Users matching platform filter:', matchingUsers.length)

    if (!matchingUsers.length) {
      console.warn('⚠️ [sendWithTemplate] No users match the platform filter')
      console.warn(
        `⚠️ [sendWithTemplate] Template platform requirement: ${normalizedPlatforms.join(', ')}`,
      )
      console.warn(
        `⚠️ [sendWithTemplate] Total users checked: ${users.length}, Users filtered out: ${
          users.length - matchingUsers.length
        }`,
      )
      console.warn('⚠️ [sendWithTemplate] Template will be kept as draft - no matching users found')
      return { successfulCount: 0, failedCount: 0, failedUsers: [] }
    }

    const defaultTranslation = this.templateService.findBestTranslation(template, Language.EN)
    if (!defaultTranslation) {
      console.warn('⚠️ [sendWithTemplate] No default translation found')
      return { successfulCount: 0, failedCount: 0, failedUsers: [] }
    }

    const usersWithTokens = matchingUsers.filter((user) => user.fcmToken?.trim())
    console.log('📤 [sendWithTemplate] Users with FCM tokens:', usersWithTokens.length)

    if (!usersWithTokens.length) {
      console.warn('⚠️ [sendWithTemplate] No users have FCM tokens')
      return { successfulCount: 0, failedCount: 0, failedUsers: [] }
    }

    // Get FCM instance for template's bakongPlatform
    const fcm = this.getFCM(template.bakongPlatform)
    if (!fcm) {
      console.error(
        '❌ [sendWithTemplate] Firebase FCM is not initialized. Cannot send notifications.',
      )
      return { successfulCount: 0, failedCount: 0, failedUsers: [] }
    }

    console.log('📤 [sendWithTemplate] Validating FCM tokens...')
    console.log('📤 [sendWithTemplate] Token validation info:', {
      totalUsers: usersWithTokens.length,
      note: 'Only format validation performed - actual validity checked on send',
      note2: 'Invalid tokens will be caught and logged when sending',
    })
    const validUsers = await ValidationHelper.validateFCMTokens(usersWithTokens, fcm)
    console.log('📤 [sendWithTemplate] Valid users after token validation:', validUsers.length)
    
    // Log token prefixes for debugging
    if (validUsers.length > 0) {
      console.log('📤 [sendWithTemplate] Valid user tokens:', validUsers.map(u => ({
        accountId: u.accountId,
        tokenPrefix: u.fcmToken ? `${u.fcmToken.substring(0, 30)}...` : 'NO TOKEN',
        platform: u.platform,
      })))
    }

    if (!validUsers.length) {
      console.warn('⚠️ [sendWithTemplate] No users have valid FCM tokens after validation')
      return { successfulCount: 0, failedCount: 0, failedUsers: [] }
    }

    console.log('📤 [sendWithTemplate] Sending FCM notifications to', validUsers.length, 'users...')
    const result = (await this.sendFCM(
      template,
      defaultTranslation,
      validUsers,
      undefined,
      'individual',
    )) as {
      notificationId: number | null
      successfulCount: number
      failedCount: number
      failedUsers?: string[]
    }

    console.log('✅ [sendWithTemplate] Notification send complete:', {
      successfulCount: result.successfulCount,
      failedCount: result.failedCount,
      failedUsers: result.failedUsers?.length || 0,
      totalUsers: validUsers.length,
    })

    return {
      successfulCount: result.successfulCount,
      failedCount: result.failedCount,
      failedUsers: result.failedUsers || [],
    }
  }

  async sendNow(dto: SentNotificationDto, req?: any) {
    try {
      if (dto.notificationId) {
        // Mobile app fetching specific notification (e.g., after clicking flash notification)
        const notification = await this.notiRepo.findOne({
          where: { id: dto.notificationId },
          relations: ['template', 'template.translations'],
        })
        if (!notification) throw new Error('Notification not found')

        if (notification.template && !notification.template.translations) {
          notification.template.translations = []
        }

        // Get user's bakongPlatform from database
        if (dto.accountId) {
          const user = await this.baseFunctionHelper.findUserByAccountId(dto.accountId)
          if (user && user.bakongPlatform && notification.template.bakongPlatform) {
            if (user.bakongPlatform !== notification.template.bakongPlatform) {
              // User's platform doesn't match template's platform
              return BaseResponseDto.error({
                errorCode: ErrorCode.TEMPLATE_NOT_FOUND,
                message: 'Notification not found for this Bakong platform',
                data: {
                  notificationId: dto.notificationId,
                  userPlatform: user.bakongPlatform,
                  templatePlatform: notification.template.bakongPlatform,
                },
              })
            }
          }
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

      // For flash notifications: User data was already synced in controller when app opened
      // Just fetch the user to get bakongPlatform (already synced in controller)
      let userBakongPlatform: string | undefined = undefined
      if (dto.accountId && dto.notificationType === NotificationType.FLASH_NOTIFICATION) {
        // User data was already synced in controller - just fetch to get bakongPlatform
        const user = await this.baseFunctionHelper.findUserByAccountId(dto.accountId)

        if (user && user.bakongPlatform) {
          userBakongPlatform = user.bakongPlatform
          console.log(
            `✅ [sendNow] Using user ${dto.accountId} bakongPlatform (already synced in controller): ${userBakongPlatform}`,
          )
        } else if (dto.bakongPlatform) {
          // Fallback: Use bakongPlatform from request if user doesn't have it
          userBakongPlatform = dto.bakongPlatform
          console.log(
            `⚠️ [sendNow] User ${dto.accountId} has no bakongPlatform in DB, using from request: ${userBakongPlatform}`,
          )
        } else {
          // Last resort: try to infer
          const inferred = this.inferBakongPlatform(dto.participantCode, dto.accountId)
          if (inferred) {
            userBakongPlatform = inferred
            console.warn(`⚠️ [sendNow] Inferring bakongPlatform for ${dto.accountId}: ${inferred}`)
          }
        }
      }

      // For flash notifications: If user has bakongPlatform, find template matching it
      let template: Template | null = null
      let notificationType: NotificationType

      if (
        dto.accountId &&
        dto.notificationType === NotificationType.FLASH_NOTIFICATION &&
        userBakongPlatform
      ) {
        // Find template matching user's bakongPlatform
        // IMPORTANT: Only include published templates (isSent: true), exclude drafts
        const templates = await this.templateRepo.find({
          where: {
            notificationType: NotificationType.FLASH_NOTIFICATION,
            bakongPlatform: userBakongPlatform as any,
            isSent: true, // Only published templates, exclude drafts
          },
          relations: ['translations', 'translations.image'],
          order: { priority: 'DESC', createdAt: 'DESC' },
        })
        template = templates.find((t) => t.translations && t.translations.length > 0) || null
        notificationType = NotificationType.FLASH_NOTIFICATION

        if (template) {
          console.log(
            `📤 [sendNow] Found template matching user's bakongPlatform: ${userBakongPlatform}`,
          )
        } else {
          console.log(
            `📤 [sendNow] No published template found for bakongPlatform: ${userBakongPlatform}, using default findNotificationTemplate`,
          )
        }
      }

      // If no template found yet, use default method
      if (!template) {
        const result = await this.templateService.findNotificationTemplate(dto)
        template = result.template
        notificationType = result.notificationType
      }

      if (!template) throw new Error(ResponseMessage.TEMPLATE_NOT_FOUND)

      const translationValidation = ValidationHelper.validateTranslation(template, dto.language)
      if (!translationValidation.isValid) throw new Error(translationValidation.errorMessage)
      const translation = translationValidation.translation

      // For flash notifications: If user doesn't have bakongPlatform, infer it from template
      // This is a fallback for users who call /send before /inbox
      // IMPORTANT: Only update if user doesn't have bakongPlatform set (don't overwrite existing value)
      if (
        dto.accountId &&
        notificationType === NotificationType.FLASH_NOTIFICATION &&
        template.bakongPlatform &&
        !userBakongPlatform
      ) {
        const user = await this.baseFunctionHelper.findUserByAccountId(dto.accountId)
        if (user && !user.bakongPlatform) {
          // User exists but doesn't have bakongPlatform set - infer it from template
          await this.baseFunctionHelper.updateUserData({
            accountId: dto.accountId,
            bakongPlatform: template.bakongPlatform,
          })
          console.log(
            `📤 [sendNow] Auto-updated user ${dto.accountId} bakongPlatform to ${template.bakongPlatform} from template (user had no bakongPlatform)`,
          )
        } else if (user && user.bakongPlatform) {
          console.log(
            `📤 [sendNow] User ${dto.accountId} already has bakongPlatform: ${user.bakongPlatform} - not overwriting`,
          )
        }
      }

      // Re-fetch users after potential bakongPlatform update (for flash notifications)
      let allUsers = await this.bkUserRepo.find()
      console.log('📤 [sendNow] Total users in database:', allUsers.length)

      // Filter by bakongPlatform if template has it
      if (template.bakongPlatform) {
        const beforeCount = allUsers.length
        allUsers = allUsers.filter((user) => user.bakongPlatform === template.bakongPlatform)
        console.log(
          `📤 [sendNow] Filtered by bakongPlatform (${template.bakongPlatform}): ${beforeCount} → ${allUsers.length} users`,
        )

        // Check if no users found for this bakongPlatform
        // Skip this check for flash notifications with accountId (they target a specific user)
        if (
          allUsers.length === 0 &&
          !(notificationType === NotificationType.FLASH_NOTIFICATION && dto.accountId)
        ) {
          const platformName =
            template.bakongPlatform === 'BAKONG_TOURIST'
              ? 'Bakong Tourist'
              : template.bakongPlatform === 'BAKONG_JUNIOR'
                ? 'Bakong Junior'
                : 'Bakong'

          // Mark template as draft if templateId is provided
          if (dto.templateId) {
            try {
              await this.templateRepo.update(dto.templateId, { isSent: false })
              console.log(`📤 [sendNow] Marked template ${dto.templateId} as draft due to no users`)
            } catch (e) {
              console.error('Error marking template as draft:', e)
            }
          }

          // Return error response instead of throwing
          return BaseResponseDto.error({
            errorCode: ErrorCode.NO_USERS_FOR_BAKONG_PLATFORM,
            message: ResponseMessage.NO_USERS_FOR_BAKONG_PLATFORM,
            data: {
              bakongPlatform: template.bakongPlatform,
              platformName: platformName,
            },
          })
        }
      }

      const usersWithTokens = allUsers.filter((u) => u.fcmToken?.trim())

      if (notificationType === NotificationType.FLASH_NOTIFICATION) {
        return await this.handleFlashNotification(template, translation, dto, req)
      }

      if (!usersWithTokens.length) throw new Error(ResponseMessage.NO_USERS_CAN_RECEIVE)

      await this.baseFunctionHelper.syncAllUsers()
      let refreshedUsers = await this.bkUserRepo.find()

      // Filter by bakongPlatform again after sync (in case new users were added)
      if (template.bakongPlatform) {
        const beforeCount = refreshedUsers.length
        refreshedUsers = refreshedUsers.filter(
          (user) => user.bakongPlatform === template.bakongPlatform,
        )
        console.log(
          `📤 [sendNow] After sync - Filtered by bakongPlatform (${template.bakongPlatform}): ${beforeCount} → ${refreshedUsers.length} users`,
        )

        // Check again if no users found after sync
        if (refreshedUsers.length === 0) {
          const platformName =
            template.bakongPlatform === 'BAKONG_TOURIST'
              ? 'Bakong Tourist'
              : template.bakongPlatform === 'BAKONG_JUNIOR'
                ? 'Bakong Junior'
                : 'Bakong'

          // Mark template as draft if templateId is provided
          if (dto.templateId) {
            try {
              await this.templateRepo.update(dto.templateId, { isSent: false })
              console.log(
                `📤 [sendNow] After sync - Marked template ${dto.templateId} as draft due to no users`,
              )
            } catch (e) {
              console.error('Error marking template as draft:', e)
            }
          }

          return BaseResponseDto.error({
            errorCode: ErrorCode.NO_USERS_FOR_BAKONG_PLATFORM,
            message: ResponseMessage.NO_USERS_FOR_BAKONG_PLATFORM,
            data: {
              bakongPlatform: template.bakongPlatform,
              platformName: platformName,
            },
          })
        }
      }

      const refreshedWithTokens = refreshedUsers.filter((u) => u.fcmToken?.trim())
      // Get FCM instance for template's bakongPlatform
      const fcm = this.getFCM(template.bakongPlatform)
      if (!fcm) {
        throw new Error('Firebase FCM is not initialized for this platform')
      }
      const validUsers = await ValidationHelper.validateFCMTokens(refreshedWithTokens, fcm)
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

      let fcmResult: { successfulCount: number; failedCount: number; failedUsers?: string[] } | void
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

        // Log failed users if any - Make it very visible in Docker logs
        if (fcmResult.failedUsers && fcmResult.failedUsers.length > 0) {
          console.log('')
          console.log('='.repeat(80))
          console.log(
            `❌ [sendNow] FAILED USERS LIST - ${fcmResult.failedUsers.length} user(s) failed to receive notification:`,
          )
          console.log('='.repeat(80))
          console.log(JSON.stringify(fcmResult.failedUsers, null, 2))
          console.log('='.repeat(80))
          console.log('')
        }

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

      // Include successful count and failed users in response
      const responseData: any = { whatnews: whatNews }
      if (fcmResult && typeof fcmResult === 'object' && 'successfulCount' in fcmResult) {
        responseData.successfulCount = fcmResult.successfulCount
        responseData.failedCount = fcmResult.failedCount
        responseData.failedUsers = fcmResult.failedUsers || []
      }

      return BaseResponseDto.success({
        data: responseData,
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
    failedUsers?: string[]
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
      const sharedFailedUsers: Array<{ accountId: string; error: string; errorCode?: string }> = []

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

          // FLASH_NOTIFICATION now sends FCM push like other notification types
          // Mobile app will display it differently (as popup/flash screen)
          // No need to skip - send FCM push for all notification types

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
              sharedFailedUsers.push({
                accountId: user.accountId,
                error: 'No response from FCM',
              })
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
            sharedFailedUsers.push({
              accountId: user.accountId,
              error: error.message,
              errorCode: error.code,
            })
          }
          // Check if error is due to invalid token
          // STRATEGY: Keep token that fails FCM sends (don't clear immediately)
          // Reasons:
          // 1. Token might become valid again (rare but possible)
          // 2. Mobile app can update it when they call API
          // 3. Preserves historical data for tracking/debugging
          // 4. Users with invalid tokens are already filtered out before sending (line 321: filter by fcmToken?.trim())
          // 5. Prevents data loss - mobile app will sync new token when they call API
          const isInvalidTokenError =
            error.code === 'messaging/registration-token-not-registered' ||
            error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/invalid-argument'
          
          if (isInvalidTokenError) {
            console.log(
              `⚠️ [sendFCM] Invalid token detected for user ${user.accountId} (error: ${error.code})`,
            )
            console.log(
              `📝 [sendFCM] Keeping token for tracking - user will be skipped in future sends until mobile app updates token via API`,
            )
            // NOTE: We keep the token because:
            // - Users are filtered by fcmToken?.trim() before sending, so invalid tokens won't cause repeated failures
            // - Mobile app can update token when they call /send or /inbox
            // - Preserves data for debugging and tracking
            // - Only obviously invalid tokens (too short/wrong format) are cleared in syncAllUsers()
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

      // Log failed users summary if any - Make it very visible in Docker logs
      const allFailedUsers = mode === 'individual' ? failedUsers : sharedFailedUsers
      if (allFailedUsers.length > 0) {
        const failedAccountIds = allFailedUsers.map((u) => u.accountId)
        console.log('')
        console.log('='.repeat(80))
        console.log(`❌ [sendFCM] FAILED USERS SUMMARY - ${allFailedUsers.length} user(s) failed:`)
        console.log('='.repeat(80))
        console.log('Failed Account IDs:', JSON.stringify(failedAccountIds, null, 2))
        console.log('')
        console.log('Detailed Error Information:')
        allFailedUsers.forEach((failedUser, index) => {
          console.log(
            `  ${index + 1}. ${failedUser.accountId}: ${failedUser.error}${
              failedUser.errorCode ? ` (Code: ${failedUser.errorCode})` : ''
            }`,
          )
        })
        console.log('='.repeat(80))
        console.log('')
      }

      return InboxResponseDto.buildFCMResult(
        mode,
        successfulNotifications,
        failedUsers,
        fcmUsers,
        sharedNotificationId,
        sharedSuccessfulCount,
        sharedFailedCount,
        sharedFailedUsers,
      )
    } catch (error: any) {
      console.error('❌ [sendFCM] Critical error in sendFCM:', error.message)
      const allFailedUsers = validUsers.map((u) => ({
        accountId: u.accountId,
        error: error.message || 'Critical error in sendFCM',
      }))
      return InboxResponseDto.buildFCMResult(
        mode,
        [],
        [],
        validUsers,
        undefined,
        0,
        validUsers.length,
        allFailedUsers,
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
    // Parse template platforms using shared helper function
    const templatePlatformsArray = ValidationHelper.parsePlatforms(template.platforms)

    const normalizedTemplatePlatforms = templatePlatformsArray
      .map((p) => ValidationHelper.normalizeEnum(p))
      .filter((p) => p === 'ALL' || p === 'IOS' || p === 'ANDROID')

    const targetsAllPlatforms = normalizedTemplatePlatforms.includes('ALL')
    const normalizedUserPlatform = user.platform
      ? ValidationHelper.normalizeEnum(user.platform)
      : null

    // CRITICAL: Double-check platform match before sending
    if (!targetsAllPlatforms && normalizedUserPlatform) {
      const platformMatches = normalizedTemplatePlatforms.some((p) => normalizedUserPlatform === p)
      if (!platformMatches) {
        console.warn(
          `⚠️ [sendFCMPayloadToPlatform] SKIPPING user ${user.accountId}: platform "${
            user.platform
          }" (normalized: "${normalizedUserPlatform}") does NOT match template platforms [${normalizedTemplatePlatforms.join(
            ', ',
          )}]`,
        )
        return null
      }
    }

    const platform = ValidationHelper.isPlatform(user.platform)
    console.log('📱 [sendFCMPayloadToPlatform] Platform detection:', {
      userPlatform: user.platform,
      normalizedUserPlatform: normalizedUserPlatform,
      templatePlatforms: normalizedTemplatePlatforms,
      targetsAllPlatforms: targetsAllPlatforms,
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

      // Note: Mobile app will determine redirect screen based on notificationType:
      // - FLASH_NOTIFICATION → Home screen
      // - ANNOUNCEMENT → Notification Center screen

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
        // Get FCM instance for user's bakongPlatform
        const fcm = this.getFCM(user.bakongPlatform)
        if (!fcm) {
          console.warn('⚠️  FCM not available - skipping iOS notification send')
          throw new Error(
            'Firebase Cloud Messaging is not initialized. Please check Firebase configuration.',
          )
        }
        // Log iOS payload structure for debugging
        console.log('📱 [sendFCMPayloadToPlatform] iOS payload structure:', {
          token: user.fcmToken ? `${user.fcmToken.substring(0, 30)}...` : 'NO TOKEN',
          hasNotification: !!iosPayloadResponse.notification, // Root-level notification field (like Firebase Console)
          hasApns: !!iosPayloadResponse.apns,
          hasData: !!iosPayloadResponse.data,
          notificationTitle: iosPayloadResponse.notification?.title,
          notificationBody: iosPayloadResponse.notification?.body,
          apnsHeaders: iosPayloadResponse.apns?.headers,
          apsAlert: iosPayloadResponse.apns?.payload?.aps?.alert,
          apsSound: iosPayloadResponse.apns?.payload?.aps?.sound,
          apsBadge: iosPayloadResponse.apns?.payload?.aps?.badge,
          dataKeys: iosPayloadResponse.data ? Object.keys(iosPayloadResponse.data) : [],
        })
        
        // Log full iOS payload (sanitized) for debugging
        const sanitizedIOSPayload = {
          ...iosPayloadResponse,
          token: user.fcmToken ? `${user.fcmToken.substring(0, 30)}...` : 'NO TOKEN',
        }
        console.log('📱 [sendFCMPayloadToPlatform] Full iOS payload:', JSON.stringify(sanitizedIOSPayload, null, 2))
        
        console.log('📱 [sendFCMPayloadToPlatform] Sending iOS FCM message...', {
          token: user.fcmToken ? `${user.fcmToken.substring(0, 30)}...` : 'NO TOKEN',
          title: title?.substring(0, 50),
          body: body ? `${body.substring(0, 50)}...` : 'NO BODY',
          bakongPlatform: user.bakongPlatform || 'NULL',
        })
        const sendResponse = await fcm.send(iosPayloadResponse)
        console.log('✅ [sendFCMPayloadToPlatform] iOS FCM send successful:', {
          response: sendResponse ? `${String(sendResponse).substring(0, 50)}...` : 'NO RESPONSE',
          fullResponse: sendResponse,
          messageId: sendResponse,
          bakongPlatform: user.bakongPlatform,
          accountId: user.accountId,
          tokenPrefix: user.fcmToken ? `${user.fcmToken.substring(0, 30)}...` : 'NO TOKEN',
        })
        
        // Log success with full details
        console.log('='.repeat(80))
        console.log('✅ [FCM SEND SUCCESS] iOS Notification sent successfully!')
        console.log('='.repeat(80))
        console.log('Message ID:', sendResponse)
        console.log('Account ID:', user.accountId)
        console.log('Platform:', user.platform)
        console.log('Bakong Platform:', user.bakongPlatform)
        console.log('Token (first 50 chars):', user.fcmToken ? `${user.fcmToken.substring(0, 50)}...` : 'NO TOKEN')
        console.log('Token length:', user.fcmToken?.length || 0)
        console.log('Title:', title)
        console.log('Body:', body?.substring(0, 100))
        console.log('')
        console.log('⚠️  IMPORTANT: If notification not received on device, check:')
        console.log('   1. iOS app has notification permissions enabled')
        console.log('   2. App is not in Do Not Disturb mode')
        console.log('   3. Firebase project has APNs certificates configured')
        console.log('   4. Token matches the Firebase project (dnode-176823)')
        console.log('   5. App is properly configured to receive FCM notifications')
        console.log('='.repeat(80))
        
        // Verify we got a valid message ID (should be a string)
        if (!sendResponse || typeof sendResponse !== 'string') {
          console.warn('⚠️ [sendFCMPayloadToPlatform] Unexpected FCM response format:', typeof sendResponse)
        }
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
        categoryType: String(template.categoryTypeId || ''),
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

      // Note: Mobile app will determine redirect screen based on notificationType:
      // - FLASH_NOTIFICATION → Home screen
      // - ANNOUNCEMENT → Notification Center screen

      // Use buildAndroidPayload instead of buildAndroidDataOnlyPayload
      // This includes the 'notification' field which makes notifications display automatically
      // (like Firebase Console does)
      const msg = InboxResponseDto.buildAndroidPayload(
        user.fcmToken,
        title,
        body,
        notificationIdStr,
        extraData as Record<string, string>,
      )

      // Log the full payload structure for debugging
      console.log('📱 [sendFCMPayloadToPlatform] Android payload structure:', {
        token: user.fcmToken ? `${user.fcmToken.substring(0, 30)}...` : 'NO TOKEN',
        tokenLength: user.fcmToken?.length || 0,
        hasNotification: !!msg.notification,
        hasAndroid: !!msg.android,
        hasData: !!msg.data,
        notificationTitle: msg.notification?.title,
        notificationBody: msg.notification?.body,
        dataKeys: msg.data ? Object.keys(msg.data) : [],
        androidPriority: msg.android?.priority,
        androidTtl: msg.android?.ttl,
        androidCollapseKey: msg.android?.collapseKey,
        androidNotificationChannelId: msg.android?.notification?.channelId,
        androidNotificationSound: msg.android?.notification?.sound,
      })
      
      // Log full payload (sanitized) for debugging
      const sanitizedPayload = {
        ...msg,
        token: user.fcmToken ? `${user.fcmToken.substring(0, 30)}...` : 'NO TOKEN',
      }
      console.log('📱 [sendFCMPayloadToPlatform] Full Android payload:', JSON.stringify(sanitizedPayload, null, 2))

      try {
        // Get FCM instance for user's bakongPlatform
        const fcm = this.getFCM(user.bakongPlatform)
        if (!fcm) {
          console.warn('⚠️  FCM not available - skipping Android notification send')
          throw new Error(
            'Firebase Cloud Messaging is not initialized. Please check Firebase configuration.',
          )
        }
        console.log('📱 [sendFCMPayloadToPlatform] Sending Android FCM message...', {
          token: user.fcmToken ? `${user.fcmToken.substring(0, 30)}...` : 'NO TOKEN',
          title: title?.substring(0, 50),
          body: body ? `${body.substring(0, 50)}...` : 'NO BODY',
          bakongPlatform: user.bakongPlatform || 'NULL',
          payloadType: 'data-only',
        })
        const sendResponse = await fcm.send(msg)
        console.log('✅ [sendFCMPayloadToPlatform] Android FCM send successful:', {
          response: sendResponse ? `${String(sendResponse).substring(0, 50)}...` : 'NO RESPONSE',
          fullResponse: sendResponse,
          messageId: sendResponse,
          bakongPlatform: user.bakongPlatform,
          accountId: user.accountId,
          tokenPrefix: user.fcmToken ? `${user.fcmToken.substring(0, 30)}...` : 'NO TOKEN',
        })
        
        // Log success with full details
        console.log('='.repeat(80))
        console.log('✅ [FCM SEND SUCCESS] Notification sent successfully!')
        console.log('='.repeat(80))
        console.log('Message ID:', sendResponse)
        console.log('Account ID:', user.accountId)
        console.log('Platform:', user.platform)
        console.log('Bakong Platform:', user.bakongPlatform)
        console.log('Token (first 50 chars):', user.fcmToken ? `${user.fcmToken.substring(0, 50)}...` : 'NO TOKEN')
        console.log('Title:', title)
        console.log('Body:', body?.substring(0, 100))
        console.log('='.repeat(80))
        
        // Verify we got a valid message ID (should be a string)
        if (!sendResponse || typeof sendResponse !== 'string') {
          console.warn('⚠️ [sendFCMPayloadToPlatform] Unexpected FCM response format:', typeof sendResponse)
        }
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

    // Get user's bakongPlatform to ensure we find matching template
    const user = await this.baseFunctionHelper.findUserByAccountId(accountId)
    const userBakongPlatform = user?.bakongPlatform

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

      // Verify template is published (not draft)
      if (!selectedTemplate.isSent) {
        return BaseResponseDto.error({
          errorCode: ErrorCode.TEMPLATE_NOT_FOUND,
          message: 'Template is a draft and cannot be sent. Please publish it first.',
          data: { templateId, isDraft: true },
        })
      }

      // Verify template matches user's bakongPlatform
      if (
        userBakongPlatform &&
        selectedTemplate.bakongPlatform &&
        selectedTemplate.bakongPlatform !== userBakongPlatform
      ) {
        console.warn(
          `⚠️ [handleFlashNotification] Template ${templateId} bakongPlatform (${selectedTemplate.bakongPlatform}) doesn't match user's (${userBakongPlatform})`,
        )
      }

      selectedTranslation = this.templateService.findBestTranslation(selectedTemplate, language)
    } else {
      // Find template matching user's bakongPlatform (excluding templates sent 2+ times)
      // The limit is PER TEMPLATE: Each template can be sent 2 times per user per 24 hours
      // New templates can always be sent (up to 2 times each)
      const bestTemplate = await this.templateService.findBestTemplateForUser(
        accountId,
        language,
        this.notiRepo,
        userBakongPlatform, // Pass user's bakongPlatform
      )
      if (!bestTemplate) {
        // Check if it's because all templates have been sent 2+ times
        const now = new Date()
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)

        // Get all available templates for this user's platform
        const allTemplatesWhere: any = {
          notificationType: NotificationType.FLASH_NOTIFICATION,
          isSent: true,
        }
        if (userBakongPlatform) {
          allTemplatesWhere.bakongPlatform = userBakongPlatform
        }
        const allAvailableTemplates = await this.templateRepo.find({
          where: allTemplatesWhere,
          select: ['id'],
        })

        // Get user's notification history
        const userNotifications = await this.notiRepo.find({
          where: { accountId },
          select: ['templateId', 'createdAt'],
        })

        const todayNotifications = userNotifications.filter((notif) => {
          const createdAt = new Date(notif.createdAt)
          return createdAt >= last24Hours && createdAt <= now
        })

        const templateCounts = todayNotifications.reduce(
          (acc, notif) => {
            if (notif.templateId) {
              acc[notif.templateId] = (acc[notif.templateId] || 0) + 1
            }
            return acc
          },
          {} as Record<number, number>,
        )

        const templatesAtLimit = Object.entries(templateCounts)
          .filter(([_, count]) => count >= 2)
          .map(([templateId]) => parseInt(templateId))

        // If all available templates have reached their limits, return limit error
        // Note: This check is now handled by findBestTemplateForUser which checks per-template limits
        // This is kept for backward compatibility
        if (
          allAvailableTemplates.length > 0 &&
          templatesAtLimit.length === allAvailableTemplates.length &&
          allAvailableTemplates.every((t) => templatesAtLimit.includes(t.id))
        ) {
          console.warn(
            `⚠️ [handleFlashNotification] All ${allAvailableTemplates.length} templates have reached their limits for user ${accountId}`,
          )
          return BaseResponseDto.error({
            errorCode: ErrorCode.FLASH_LIMIT_REACHED_IN_TODAY,
            message: ResponseMessage.FLASH_LIMIT_REACHED_IN_TODAY,
            data: {
              message:
                'You have reached the limit for flash notifications. All available templates have reached their daily or maximum day limits. Please try again later.',
              templatesAtLimit: templatesAtLimit,
              totalTemplates: allAvailableTemplates.length,
            },
          })
        }

        return BaseResponseDto.error({
          errorCode: ErrorCode.NO_FLASH_NOTIFICATION_TEMPLATE_AVAILABLE,
          message: ResponseMessage.NO_FLASH_NOTIFICATION_TEMPLATE_AVAILABLE,
          data: {},
        })
      }
      selectedTemplate = bestTemplate.template
      selectedTranslation = bestTemplate.translation

      console.log(
        `📤 [handleFlashNotification] Found template ${
          selectedTemplate.id
        } for user ${accountId} with bakongPlatform: ${selectedTemplate.bakongPlatform || 'NULL'}`,
      )
    }

    if (!selectedTranslation) {
      return BaseResponseDto.error({
        errorCode: ErrorCode.NO_FLASH_NOTIFICATION_TEMPLATE_AVAILABLE,
        message: ResponseMessage.NO_FLASH_NOTIFICATION_TEMPLATE_AVAILABLE,
      })
    }

    // Get flash notification limit settings from template (default: 1 per day, 1 day max)
    const showPerDay = selectedTemplate.showPerDay ?? 1
    const maxDayShowing = selectedTemplate.maxDayShowing ?? 1

    console.log(
      `📊 [handleFlashNotification] Template ${selectedTemplate.id} limits: showPerDay=${showPerDay}, maxDayShowing=${maxDayShowing}`,
    )

    // Check 1: Has user seen this template showPerDay times TODAY?
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    const todayCount = await this.notiRepo.count({
      where: {
        accountId,
        templateId: selectedTemplate.id,
        createdAt: Between(todayStart, todayEnd),
      },
    })

    console.log(
      `📊 [handleFlashNotification] Template ${selectedTemplate.id} has been sent ${todayCount} times to user ${accountId} today (limit: ${showPerDay} per day)`,
    )

    // Check if user has already received this template showPerDay times today
    if (todayCount >= showPerDay) {
      console.warn(
        `⚠️ [handleFlashNotification] DAILY LIMIT REACHED: User ${accountId} has already received template ${selectedTemplate.id} ${todayCount} times today (limit: ${showPerDay} per day)`,
      )
      return BaseResponseDto.error({
        errorCode: ErrorCode.FLASH_LIMIT_REACHED_IN_TODAY,
        message: ResponseMessage.FLASH_LIMIT_REACHED_IN_TODAY,
        data: {
          templateId: selectedTemplate.id,
          templateTitle: selectedTranslation?.title || 'Unknown',
          sendCount: todayCount,
          limit: showPerDay,
          message: `You have already received this notification ${todayCount} time(s) today. Please try again tomorrow.`,
        },
      })
    }

    // Check 2: Has user seen this template for maxDayShowing days?
    // Count distinct days user has received this template
    const allNotifications = await this.notiRepo.find({
      where: {
        accountId,
        templateId: selectedTemplate.id,
      },
      select: ['createdAt'],
    })

    // Get distinct days (YYYY-MM-DD format)
    const distinctDays = new Set<string>()
    allNotifications.forEach((notif) => {
      const date = new Date(notif.createdAt)
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        '0',
      )}-${String(date.getDate()).padStart(2, '0')}`
      distinctDays.add(dayKey)
    })

    const daysCount = distinctDays.size
    console.log(
      `📊 [handleFlashNotification] Template ${selectedTemplate.id} has been shown to user ${accountId} for ${daysCount} distinct day(s) (limit: ${maxDayShowing} days)`,
    )

    // Check if user has already seen this template for maxDayShowing days
    if (daysCount >= maxDayShowing) {
      console.warn(
        `⚠️ [handleFlashNotification] MAX DAYS LIMIT REACHED: User ${accountId} has already seen template ${selectedTemplate.id} for ${daysCount} days (limit: ${maxDayShowing} days)`,
      )
      return BaseResponseDto.error({
        errorCode: ErrorCode.FLASH_LIMIT_REACHED_IN_TODAY,
        message: ResponseMessage.FLASH_LIMIT_REACHED_IN_TODAY,
        data: {
          templateId: selectedTemplate.id,
          templateTitle: selectedTranslation?.title || 'Unknown',
          daysCount: daysCount,
          limit: maxDayShowing,
          message: `This notification has already been shown to you for ${daysCount} day(s). The maximum limit of ${maxDayShowing} day(s) has been reached.`,
        },
      })
    }

    const newSendCount = todayCount + 1
    console.log(
      `✅ [handleFlashNotification] Proceeding to send template ${
        selectedTemplate.id
      } (will be send #${newSendCount} for this user today, day ${
        daysCount + 1
      } of ${maxDayShowing})`,
    )

    // User already fetched above, reuse it
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
      const {
        accountId,
        fcmToken,
        participantCode,
        platform,
        language,
        page,
        size,
        bakongPlatform,
      } = dto
      const { skip, take } = PaginationUtils.normalizePagination(page, size)

      console.log('📥 [getNotificationCenter] /inbox API called with:', {
        accountId,
        fcmToken: fcmToken
          ? `${fcmToken.substring(0, 30)}...`
          : fcmToken === ''
            ? 'EMPTY (explicitly cleared)'
            : 'NOT PROVIDED',
        platform: platform || 'N/A',
        language: language || 'N/A',
        bakongPlatform: bakongPlatform || 'N/A',
      })

      // bakongPlatform is required - validation will reject if missing
      if (!bakongPlatform) {
        return BaseResponseDto.error({
          errorCode: ErrorCode.FLASH_NOTIFICATION_POPUP_FAILED,
          message: 'bakongPlatform is required. Must be one of: BAKONG, BAKONG_JUNIOR, BAKONG_TOURIST',
        })
      }

      // Check existing user before sync
      const existingUser = await this.baseFunctionHelper.findUserByAccountId(accountId)
      if (existingUser) {
        console.log(
          `📋 [getNotificationCenter] Existing user found: ${accountId}, current fcmToken: ${
            existingUser.fcmToken ? `${existingUser.fcmToken.substring(0, 30)}...` : 'EMPTY'
          }`,
        )
      } else {
        console.log(`📋 [getNotificationCenter] New user: ${accountId}`)
      }

      // Store bakongPlatform when user calls API
      // fcmToken is required in NotificationInboxDto, so it should always be provided
      // If it's an empty string, that means app was deleted - we should clear old token
      // Always pass fcmToken as-is (even if empty string) to ensure sync happens
      console.log(`🔄 [getNotificationCenter] Preparing to sync user data:`, {
        accountId,
        fcmTokenProvided: fcmToken !== undefined,
        fcmTokenValue: fcmToken
          ? `${fcmToken.substring(0, 30)}... (length: ${fcmToken.length})`
          : fcmToken === ''
            ? 'EMPTY STRING'
            : 'UNDEFINED',
        fcmTokenType: typeof fcmToken,
      })
      console.log(`🔄 [getNotificationCenter] Calling updateUserData with:`, {
        accountId,
        fcmToken: fcmToken
          ? `${fcmToken.substring(0, 30)}... (length: ${fcmToken.length}, type: ${typeof fcmToken})`
          : fcmToken === ''
            ? 'EMPTY STRING'
            : 'UNDEFINED',
        participantCode: participantCode || 'NOT PROVIDED',
        platform: platform || 'NOT PROVIDED',
        language: language || 'NOT PROVIDED',
        bakongPlatform: bakongPlatform || 'NOT PROVIDED',
      })

      const syncResult = await this.baseFunctionHelper.updateUserData({
        accountId,
        fcmToken: fcmToken, // Pass as-is (required field, should always be string)
        participantCode,
        platform,
        language,
        bakongPlatform: bakongPlatform, // Required field - always provided
      })

      // Log sync result
      if ('isNewUser' in syncResult) {
        const result = syncResult as any
        console.log(
          `✅ [getNotificationCenter] User sync complete: ${accountId}, isNewUser: ${
            result.isNewUser
          }, savedUser fcmToken: ${
            result.savedUser?.fcmToken
              ? `${result.savedUser.fcmToken.substring(0, 30)}...`
              : 'EMPTY'
          }`,
        )
      } else {
        console.log(
          `✅ [getNotificationCenter] All users sync complete: ${
            (syncResult as any).updatedCount
          } users updated`,
        )
      }

      // Re-fetch user to verify it was saved
      const user = await this.baseFunctionHelper.findUserByAccountId(accountId)
      console.log(`🔍 [getNotificationCenter] Re-fetched user after sync:`, {
        accountId,
        found: !!user,
        fcmToken: user?.fcmToken
          ? `${user.fcmToken.substring(0, 30)}... (length: ${user.fcmToken.length})`
          : 'EMPTY',
        bakongPlatform: user?.bakongPlatform || 'NULL',
        updatedAt: user?.updatedAt,
      })

      if (!user) {
        return BaseResponseDto.error({
          errorCode: ErrorCode.USER_NOT_FOUND,
          message: ResponseMessage.USER_NOT_FOUND,
          data: { accountId },
        })
      }

      // Get user's bakongPlatform from database (stored when user called API)
      const userPlatform = user.bakongPlatform

      const [notifications, totalCount] = await this.notiRepo.findAndCount({
        where: { accountId: accountId.trim() },
        order: { createdAt: 'DESC' },
        skip,
        take,
      })

      // Filter notifications by user's bakongPlatform
      const filteredNotifications = []
      for (const notification of notifications) {
        if (notification.templateId) {
          notification.template = await this.templateRepo.findOne({
            where: { id: notification.templateId },
            relations: ['translations'],
          })

          if (notification.template && !notification.template.translations) {
            notification.template.translations = []
          }

          // Filter: only include if template.bakongPlatform matches user's platform
          // OR if template has no bakongPlatform (backward compatibility)
          if (
            !notification.template.bakongPlatform ||
            notification.template.bakongPlatform === userPlatform
          ) {
            filteredNotifications.push(notification)
          }
        } else {
          // If no template, include notification
          filteredNotifications.push(notification)
        }
      }

      const isNewUser = 'isNewUser' in syncResult ? (syncResult as any).isNewUser : false
      const filteredCount = filteredNotifications.length

      return InboxResponseDto.getNotificationCenterResponse(
        filteredNotifications.map(
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
          filteredNotifications,
          filteredCount,
          page,
          size,
          PaginationUtils.calculatePaginationMeta(
            page,
            size,
            filteredCount,
            filteredNotifications.length,
          ).pageCount,
          isNewUser,
        ),
        PaginationUtils.calculatePaginationMeta(
          page,
          size,
          filteredCount,
          filteredNotifications.length,
        ),
        userPlatform,
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
    // NOTE: Deduplication removed - we now allow multiple records for the same template
    // The limit check (2 times per 24h) is handled in handleFlashNotification BEFORE calling this method
    // This ensures we can store up to 2 records per template per user per 24 hours

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

  async updateNotificationTemplateId(oldTemplateId: number, newTemplateId: number): Promise<void> {
    try {
      console.log(`Updating notification records: templateId ${oldTemplateId} -> ${newTemplateId}`)
      const result = await this.notiRepo.update(
        { templateId: oldTemplateId },
        { templateId: newTemplateId },
      )
      console.log(
        `Updated ${
          result.affected || 0
        } notification records from template ${oldTemplateId} to ${newTemplateId}`,
      )
    } catch (error) {
      console.error(
        `Error updating notification records from template ${oldTemplateId} to ${newTemplateId}:`,
        error,
      )
      throw error
    }
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
