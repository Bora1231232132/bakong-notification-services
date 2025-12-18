import { Injectable, Inject, forwardRef } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { BakongUser } from 'src/entities/bakong-user.entity'
import { Notification } from 'src/entities/notification.entity'
import { Repository, Between } from 'typeorm'
import { Messaging } from 'firebase-admin/messaging'
import { Template } from 'src/entities/template.entity'
import { TemplateTranslation } from 'src/entities/template-translation.entity'
import { CategoryType } from 'src/entities/category-type.entity'
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
      const appName = bakongPlatform ? FirebaseManager.getAppName(bakongPlatform) : 'DEFAULT'
      const serviceAccountPath = bakongPlatform
        ? FirebaseManager.getServiceAccountPath(bakongPlatform)
        : null
      console.log(
        `🔥 [getFCM] Using Firebase app: ${appName} for platform: ${bakongPlatform || 'DEFAULT'}`,
      )
      console.log(`🔥 [getFCM] Service account path: ${serviceAccountPath || 'Using default'}`)

      // Try to read and log project_id from service account
      if (serviceAccountPath && require('fs').existsSync(serviceAccountPath)) {
        try {
          const fs = require('fs')
          const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
          console.log(
            `🔥 [getFCM] Firebase Project ID: ${serviceAccount.project_id || 'NOT FOUND'}`,
          )
          console.log(
            `🔥 [getFCM] Service Account Email: ${serviceAccount.client_email || 'NOT FOUND'}`,
          )
        } catch (e: any) {
          console.warn(`⚠️ [getFCM] Could not read service account file: ${e.message}`)
        }
      }
    } else {
      console.error(
        `❌ [getFCM] No FCM instance available for platform: ${bakongPlatform || 'DEFAULT'}`,
      )
    }
    return fcm
  }

  async sendWithTemplate(
    template: Template,
  ): Promise<{
    successfulCount: number
    failedCount: number
    failedUsers?: string[]
    failedDueToInvalidTokens?: boolean
  }> {
    console.log('📤 [sendWithTemplate] ========== STARTING SEND PROCESS ==========')
    console.log('📤 [sendWithTemplate] Template ID:', template.id)
    console.log('📤 [sendWithTemplate] Template bakongPlatform:', template.bakongPlatform, `(type: ${typeof template.bakongPlatform})`)
    console.log('📤 [sendWithTemplate] Template created at:', template.createdAt)
    console.log('📤 [sendWithTemplate] Template has translations:', template.translations?.length || 0)
    if (template.translations && template.translations.length > 0) {
      template.translations.forEach((t, idx) => {
        console.log(`📤 [sendWithTemplate] Translation ${idx + 1}:`, {
          language: t.language,
          titleLength: t.title?.length || 0,
          contentLength: t.content?.length || 0,
          titlePreview: t.title ? `${t.title.substring(0, 50)}...` : 'NO TITLE',
        })
      })
    }

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
      updatedUserIds: syncResult.updatedIds?.slice(0, 10), // Log first 10 for debugging
    })

    // Query users from database again AFTER sync to ensure we have latest data
    // Use QueryBuilder to ensure fresh data (no caching)
    console.log('📤 [sendWithTemplate] Querying users from database again after sync (fresh query)...')
    let users = await this.bkUserRepo
      .createQueryBuilder('user')
      .getMany()
    console.log('📤 [sendWithTemplate] Total users fetched from database:', users.length)
    
    // DEBUG: Log bakongPlatform values from database to check for NULL or mismatches
    const bakongPlatformDebug: Record<string, number> = {}
    const usersWithNullPlatform: string[] = []
    users.forEach((user) => {
      const platform = user.bakongPlatform || 'NULL'
      bakongPlatformDebug[platform] = (bakongPlatformDebug[platform] || 0) + 1
      if (!user.bakongPlatform) {
        usersWithNullPlatform.push(user.accountId)
      }
    })
    console.log('📤 [sendWithTemplate] DEBUG - BakongPlatform values from database:', bakongPlatformDebug)
    if (usersWithNullPlatform.length > 0) {
      console.warn('⚠️ [sendWithTemplate] DEBUG - Users with NULL bakongPlatform:', usersWithNullPlatform.slice(0, 10))
    }
    
    // Log specific users that were updated during sync for debugging
    if (syncResult.updatedIds && syncResult.updatedIds.length > 0) {
      const updatedUsers = users.filter((u) => syncResult.updatedIds.includes(u.accountId))
      console.log('📤 [sendWithTemplate] Users that were updated during sync:', {
        count: updatedUsers.length,
        accountIds: updatedUsers.map((u) => u.accountId).slice(0, 10),
        // Log token status for updated users
        tokenStatus: updatedUsers.slice(0, 5).map((u) => ({
          accountId: u.accountId,
          hasToken: !!u.fcmToken?.trim(),
          tokenLength: u.fcmToken?.length || 0,
        })),
      })
    }

    // Filter by bakongPlatform if template has it
    if (template.bakongPlatform) {
      const beforeCount = users.length
      
      // Log bakongPlatform distribution BEFORE filtering for debugging
      const bakongPlatformBreakdown: Record<string, number> = {}
      const allUsersBeforeFilter = [...users] // Save copy before filtering
      const usersWithTokensBeforeFilter: Array<{ accountId: string; bakongPlatform: string | null; fcmToken: string }> = []
      
      users.forEach((user) => {
        const platform = user.bakongPlatform || 'NULL'
        bakongPlatformBreakdown[platform] = (bakongPlatformBreakdown[platform] || 0) + 1
        if (user.fcmToken?.trim()) {
          usersWithTokensBeforeFilter.push({
            accountId: user.accountId,
            bakongPlatform: user.bakongPlatform || null,
            fcmToken: user.fcmToken.substring(0, 30) + '...',
          })
        }
      })
      
      console.log('📤 [sendWithTemplate] ========== BAKONGPLATFORM FILTERING DEBUG ==========')
      console.log('📤 [sendWithTemplate] BakongPlatform distribution BEFORE filtering:', bakongPlatformBreakdown)
      console.log('📤 [sendWithTemplate] Template bakongPlatform:', template.bakongPlatform, `(type: ${typeof template.bakongPlatform})`)
      console.log('📤 [sendWithTemplate] Users with tokens BEFORE filtering:', usersWithTokensBeforeFilter.length)
      if (usersWithTokensBeforeFilter.length > 0) {
        console.log('📤 [sendWithTemplate] Sample users with tokens:', usersWithTokensBeforeFilter.slice(0, 5))
      }
      
      // Filter users by bakongPlatform (exact match)
      // Normalize both values to ensure consistent comparison (handle string vs enum)
      const templateBakongPlatform = String(template.bakongPlatform).toUpperCase()
      const filteredOutUsers: Array<{ accountId: string; userPlatform: string | null; templatePlatform: string; hasToken: boolean }> = []
      
      const filteredUsers = users.filter((user) => {
        // Normalize user bakongPlatform for comparison
        const userBakongPlatform = user.bakongPlatform ? String(user.bakongPlatform).toUpperCase() : null
        const matches = userBakongPlatform === templateBakongPlatform
        
        if (!matches) {
          filteredOutUsers.push({
            accountId: user.accountId,
            userPlatform: user.bakongPlatform || null,
            templatePlatform: template.bakongPlatform,
            hasToken: !!user.fcmToken?.trim(),
          })
        }
        return matches
      })
      users = filteredUsers
      
      console.log(
        `📤 [sendWithTemplate] Filtered by bakongPlatform (${template.bakongPlatform}): ${beforeCount} → ${users.length} users`,
      )
      
      // Log users that were filtered out
      if (filteredOutUsers.length > 0) {
        console.log('📤 [sendWithTemplate] Users filtered out due to bakongPlatform mismatch:', filteredOutUsers.length)
        const filteredOutWithTokens = filteredOutUsers.filter((u) => u.hasToken)
        if (filteredOutWithTokens.length > 0) {
          console.warn(
            `⚠️ [sendWithTemplate] ${filteredOutWithTokens.length} user(s) with tokens were filtered out due to bakongPlatform mismatch:`,
            filteredOutWithTokens.slice(0, 10),
          )
        }
      }
      console.log('📤 [sendWithTemplate] ====================================================')

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

    // Track users with empty/invalid tokens BEFORE filtering
    const usersWithoutTokens = matchingUsers.filter((user) => !user.fcmToken?.trim())
    const usersWithEmptyTokens = usersWithoutTokens.map((user) => ({
      accountId: user.accountId,
      error: 'FCM token is empty or missing',
      errorCode: 'messaging/invalid-registration-token',
    }))

    console.log('📤 [sendWithTemplate] Users without FCM tokens:', usersWithoutTokens.length)
    if (usersWithoutTokens.length > 0) {
      console.log(
        '📤 [sendWithTemplate] Users with empty tokens:',
        usersWithoutTokens.map((u) => u.accountId),
      )
    }

    const usersWithTokens = matchingUsers.filter((user) => user.fcmToken?.trim())
    console.log('📤 [sendWithTemplate] Users with FCM tokens:', usersWithTokens.length)
    
    // Log specific users for debugging inconsistent sends
    if (usersWithTokens.length > 0) {
      const userDetails = usersWithTokens.map((u) => ({
        accountId: u.accountId,
        platform: u.platform,
        tokenLength: u.fcmToken?.length || 0,
        tokenPrefix: u.fcmToken ? `${u.fcmToken.substring(0, 30)}...` : 'NO TOKEN',
        bakongPlatform: u.bakongPlatform,
      }))
      console.log('📤 [sendWithTemplate] Users with tokens (for debugging):', userDetails.slice(0, 10))
    }

    // Get FCM instance for template's bakongPlatform
    const fcm = this.getFCM(template.bakongPlatform)
    if (!fcm) {
      console.error(
        '❌ [sendWithTemplate] Firebase FCM is not initialized. Cannot send notifications.',
      )
      // Return users with empty tokens as failed
      return {
        successfulCount: 0,
        failedCount: usersWithoutTokens.length,
        failedUsers: usersWithoutTokens.map((u) => u.accountId),
        failedDueToInvalidTokens: usersWithoutTokens.length > 0,
      }
    }

    console.log('📤 [sendWithTemplate] Preparing to send notifications...')
    console.log('📤 [sendWithTemplate] Strategy: Try all format-valid tokens - Firebase will validate during actual send')
    
    // Skip pre-validation - it's unreliable and slows things down
    // Firebase will reject invalid tokens during actual send, which is more reliable
    // This ensures both old and new templates get the same treatment
    
    // Filter users with valid token format only
    // CRITICAL: Always try sending to ALL format-valid tokens
    // This ensures old notifications and new notifications both get attempted
    const formatValidUsers = usersWithTokens.filter(
      (user) => user.fcmToken && 
                user.fcmToken.length > 50 && 
                ValidationHelper.isValidFCMTokenFormat(user.fcmToken)
    )
    
    console.log('📤 [sendWithTemplate] Users with valid token format:', formatValidUsers.length)
    console.log('📤 [sendWithTemplate] Will attempt to send to ALL format-valid tokens (skipping pre-validation for better reliability)')

    // Track users filtered out due to invalid format (too short or wrong format)
    const usersWithInvalidFormat = usersWithTokens.filter(
      (user) => !formatValidUsers.some((vu) => vu.accountId === user.accountId),
    )
    const invalidFormatUsers = usersWithInvalidFormat.map((user) => ({
      accountId: user.accountId,
      error: 'FCM token format is invalid',
      errorCode: 'messaging/invalid-registration-token',
    }))

    console.log(
      '📤 [sendWithTemplate] Users filtered out due to invalid token format:',
      invalidFormatUsers.length,
    )
    if (invalidFormatUsers.length > 0) {
      console.log(
        '📤 [sendWithTemplate] Users with invalid format:',
        invalidFormatUsers.map((u) => u.accountId),
      )
    }

    // ALWAYS try all format-valid tokens - no pre-validation filtering
    // This ensures both old and new templates get the same treatment
    // Firebase will reject invalid tokens during actual send, which is more reliable than pre-validation
    const usersToSend = formatValidUsers
    
    console.log('📤 [sendWithTemplate] Sending strategy:', {
      formatValid: formatValidUsers.length,
      willSendTo: usersToSend.length,
      note: 'Trying all format-valid tokens - Firebase will reject invalid ones during actual send',
    })

    // Log token prefixes for debugging
    if (usersToSend.length > 0) {
      console.log(
        '📤 [sendWithTemplate] Users that will receive notification:',
        usersToSend.map((u) => ({
          accountId: u.accountId,
          tokenPrefix: u.fcmToken ? `${u.fcmToken.substring(0, 30)}...` : 'NO TOKEN',
          platform: u.platform,
        })),
      )
    }
    
    if (!usersToSend.length) {
      console.warn('⚠️ [sendWithTemplate] No users available to send to')
      // Return all users with invalid tokens as failed
      const allInvalidUsers = [...usersWithEmptyTokens, ...invalidFormatUsers]
      return {
        successfulCount: 0,
        failedCount: allInvalidUsers.length,
        failedUsers: allInvalidUsers.map((u) => u.accountId),
        failedDueToInvalidTokens: allInvalidUsers.length > 0,
      }
    }

    console.log(`📤 [sendWithTemplate] Attempting to send FCM notifications to ${usersToSend.length} users (all format-valid tokens)...`)
    const result = (await this.sendFCM(
      template,
      defaultTranslation,
      usersToSend,
      undefined,
      'individual',
    )) as {
      notificationId: number | null
      successfulCount: number
      failedCount: number
      failedUsers?: string[]
      failedDueToInvalidTokens?: boolean
    }

    // Combine users filtered out BEFORE sending (empty/invalid format) with users that failed DURING sending
    const allFailedUsers = [
      ...usersWithEmptyTokens.map((u) => u.accountId),
      ...invalidFormatUsers.map((u) => u.accountId),
      ...(result.failedUsers || []),
    ]

    const totalFailedCount =
      usersWithoutTokens.length + invalidFormatUsers.length + result.failedCount

    // Check if failures are due to invalid tokens (empty, invalid format, or FCM errors)
    // A failure is due to invalid tokens if:
    // 1. Users have empty tokens (filtered before sending) - these are invalid tokens
    // 2. Users have invalid token format (filtered before sending) - these are invalid tokens  
    // 3. FCM send failed due to invalid token errors (during actual send) - check result flag from buildFCMResult
    // Note: buildFCMResult checks error codes to determine if failures are due to invalid tokens
    const hasInvalidTokens =
      usersWithoutTokens.length > 0 ||
      invalidFormatUsers.length > 0 ||
      (result.failedDueToInvalidTokens === true)

    console.log('✅ [sendWithTemplate] Notification send complete:', {
      successfulCount: result.successfulCount,
      failedCount: totalFailedCount,
      failedUsers: allFailedUsers.length,
      failedDueToEmptyTokens: usersWithoutTokens.length,
      failedDueToInvalidFormat: invalidFormatUsers.length,
      failedDuringSend: result.failedCount,
      failedDueToInvalidTokensFromResult: result.failedDueToInvalidTokens,
      hasInvalidTokens: hasInvalidTokens,
      totalUsers: matchingUsers.length,
      formatValidUsersAttempted: formatValidUsers.length,
      note: 'Attempted to send to ALL format-valid tokens (no pre-validation filtering)',
    })

    return {
      successfulCount: result.successfulCount,
      failedCount: totalFailedCount,
      failedUsers: allFailedUsers,
      failedDueToInvalidTokens: hasInvalidTokens,
    }
  }

  async sendNow(dto: SentNotificationDto, req?: any) {
    try {
      if (dto.notificationId) {
        // Mobile app fetching specific notification (e.g., after clicking flash notification)
        const notification = await this.notiRepo.findOne({
          where: { id: dto.notificationId },
          relations: ['template', 'template.translations', 'template.categoryTypeEntity'],
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
          relations: ['translations', 'translations.image', 'categoryTypeEntity'],
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

      let fcmResult: { successfulCount: number; failedCount: number; failedUsers?: string[]; failedDueToInvalidTokens?: boolean } | void
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
        responseData.failedDueToInvalidTokens = fcmResult.failedDueToInvalidTokens || false
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
    failedDueToInvalidTokens?: boolean
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
        let notificationId: number | null = null
        try {
          console.log('📨 [sendFCM] Sending to user:', {
            accountId: user.accountId,
            platform: user.platform,
            normalizedPlatform: ValidationHelper.normalizeEnum(user.platform),
            fcmToken: user.fcmToken ? `${user.fcmToken.substring(0, 30)}...` : 'NO TOKEN',
          })

          // For individual mode, we need to create notification record first to get ID for payload
          // But we'll delete it if FCM send fails
          if (mode === 'individual') {
            const saved = await this.storeNotification({
              accountId: user.accountId,
              templateId: template.id,
              fcmToken: user.fcmToken,
              sendCount: 1,
              firebaseMessageId: 0,
            })
            notificationId = saved.id
            console.log('📨 [sendFCM] Created notification record (temporary):', notificationId)
          } else {
            notificationId = sharedNotificationId ?? 0
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

          console.log('📨 [sendFCM] Response from sendFCMPayloadToPlatform:', {
            accountId: user.accountId,
            hasResponse: !!response,
            responseType: typeof response,
            responseValue: response ? `${String(response).substring(0, 50)}...` : 'NULL',
            userPlatform: user.platform,
            userBakongPlatform: user.bakongPlatform,
            templatePlatforms: template.platforms,
            templateBakongPlatform: template.bakongPlatform,
          })

          if (response) {
            const responseString =
              typeof response === 'string' ? response : JSON.stringify(response)
            await this.updateNotificationRecord(
              user,
              template,
              notificationId!,
              responseString,
              mode,
            )
            console.log('✅ [sendFCM] Successfully sent to user:', user.accountId)
            if (mode === 'individual') {
              successfulNotifications.push({ id: notificationId! })
            } else if (mode === 'shared') {
              sharedSuccessfulCount++
            }
          } else {
            console.warn('⚠️ [sendFCM] No response from FCM for user:', user.accountId)
            // Delete notification record if it was created but FCM send failed
            if (mode === 'individual' && notificationId) {
              try {
                await this.notiRepo.delete({ id: notificationId })
                console.log(
                  `🗑️ [sendFCM] Deleted notification record ${notificationId} due to failed FCM send`,
                )
              } catch (deleteError) {
                console.error(
                  `❌ [sendFCM] Failed to delete notification record ${notificationId}:`,
                  deleteError,
                )
              }
            }
            // Count as failed for BOTH individual and shared modes
            if (mode === 'individual') {
              failedUsers.push({
                accountId: user.accountId,
                error: 'No response from FCM (platform mismatch or unrecognized platform)',
                errorCode: 'NO_RESPONSE',
              })
            } else if (mode === 'shared') {
              sharedFailedCount++
              sharedFailedUsers.push({
                accountId: user.accountId,
                error: 'No response from FCM (platform mismatch or unrecognized platform)',
              })
            }
          }
        } catch (error: any) {
          // Extract Firebase error code from wrapped error or original error
          // Check multiple possible locations for the error code
          const errorCode = 
            error?.firebaseErrorCode || // Explicit Firebase code property we set
            error?.code || // Direct code property
            error?.originalError?.code || // From original Firebase error
            error?.originalError?.errorInfo?.code || // From Firebase errorInfo structure
            (error?.message?.match(/\(code: ([^)]+)\)/)?.[1]) || // Extract from message like "(code: messaging/invalid-argument)"
            'UNKNOWN_ERROR'
          const errorMessage = error?.message || 'Unknown error'
          
          console.error('❌ [sendFCM] Failed to send to user:', {
            accountId: user.accountId,
            errorMessage: errorMessage,
            errorCode: errorCode,
            errorDetails: error?.details || error?.originalError?.details || 'N/A',
            userPlatform: user.platform,
            userBakongPlatform: user.bakongPlatform,
            templatePlatforms: template.platforms,
            templateBakongPlatform: template.bakongPlatform,
            tokenPrefix: user.fcmToken ? `${user.fcmToken.substring(0, 30)}...` : 'NO TOKEN',
            tokenLength: user.fcmToken?.length || 0,
            fullError: process.env.NODE_ENV === 'development' ? error : 'Hidden in production',
          })

          // Delete notification record if it was created but FCM send failed
          if (mode === 'individual' && notificationId) {
            try {
              await this.notiRepo.delete({ id: notificationId })
              console.log(
                `🗑️ [sendFCM] Deleted notification record ${notificationId} due to FCM send error: ${errorMessage} (code: ${errorCode})`,
              )
            } catch (deleteError) {
              console.error(
                `❌ [sendFCM] Failed to delete notification record ${notificationId}:`,
                deleteError,
              )
            }
          }

          if (mode === 'individual') {
            failedUsers.push({
              accountId: user.accountId,
              error: errorMessage,
              errorCode: errorCode,
            })
          } else if (mode === 'shared') {
            sharedFailedCount++
            sharedFailedUsers.push({
              accountId: user.accountId,
              error: errorMessage,
              errorCode: errorCode,
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
            errorCode === 'messaging/registration-token-not-registered' ||
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/invalid-argument' ||
            errorCode === 'messaging/authentication-error' ||
            errorCode === 'messaging/server-unavailable'

          if (isInvalidTokenError) {
            console.log(
              `⚠️ [sendFCM] Invalid token detected for user ${user.accountId} (error: ${errorCode})`,
            )
            console.log(
              `📝 [sendFCM] Token format was valid but Firebase rejected it. Possible reasons:`,
            )
            console.log(
              `   1. Token expired or invalidated by Firebase`,
            )
            console.log(
              `   2. Token belongs to different Firebase project`,
            )
            console.log(
              `   3. APNs certificate not configured (for iOS tokens)`,
            )
            console.log(
              `   4. Device uninstalled app or token revoked`,
            )
            console.log(
              `📝 [sendFCM] User will be skipped in future sends until mobile app updates token via API`,
            )
            // NOTE: We keep the token because:
            // - Users are filtered by fcmToken?.trim() before sending, so invalid tokens won't cause repeated failures
            // - Mobile app can update token when they call /send or /inbox
            // - Preserves data for debugging and tracking
            // - Only obviously invalid tokens (too short/wrong format) are cleared in syncAllUsers()
          } else {
            // Check if error code is actually an invalid token error but wasn't caught above
            // This can happen if error code extraction failed
            const mightBeInvalidToken = 
              errorCode.includes('registration-token') ||
              errorCode.includes('invalid-registration') ||
              errorCode.includes('invalid-argument') ||
              errorCode.includes('invalid-token')
            
            if (mightBeInvalidToken) {
              console.warn(
                `⚠️ [sendFCM] FCM send failed for user ${user.accountId} - error code suggests invalid token but wasn't recognized (code: ${errorCode})`,
              )
              console.warn(
                `   This might indicate: Token expired, invalidated, or belongs to different Firebase project`,
              )
            } else {
              console.warn(
                `⚠️ [sendFCM] FCM send failed for user ${user.accountId} but error is NOT invalid token (code: ${errorCode})`,
              )
              console.warn(
                `   This might indicate: Firebase configuration issue, network problem, or other FCM error`,
              )
            }
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

      // CRITICAL: iOS APNs has strict size limits:
      // - Alert title: ~40 characters (recommended, can be up to 50 but may be truncated by iOS)
      // - Alert body: ~100 characters (recommended, can be up to 200 but may be truncated by iOS)
      // - Total payload: 4KB maximum
      // For Unicode/Khmer characters, we need to be more conservative
      // Truncate title and body specifically for iOS to prevent "invalid-argument" errors
      const iosTitleMaxLength = 40 // Conservative limit for APNs alert title
      const iosBodyMaxLength = 100 // Conservative limit for APNs alert body
      
      const iosTitle = title && title.length > iosTitleMaxLength 
        ? title.substring(0, iosTitleMaxLength - 3) + '...' 
        : title || ''
      const iosBody = body && body.length > iosBodyMaxLength 
        ? body.substring(0, iosBodyMaxLength - 3) + '...' 
        : body || ''
      
      console.log('📱 [sendFCMPayloadToPlatform] iOS text truncation:', {
        originalTitleLength: title?.length || 0,
        truncatedTitleLength: iosTitle.length,
        originalBodyLength: body?.length || 0,
        truncatedBodyLength: iosBody.length,
        note: 'Full text still available in data payload for app to display',
      })

      // Build notification data - truncate content in data payload if too long to prevent FCM payload size issues
      // FCM has a 4KB limit for the entire payload, so we need to be careful with long content
      const whatNews = InboxResponseDto.buildBaseNotificationData(
        template,
        translation,
        translation.language,
        imageUrlString,
        parseInt(notificationIdStr),
      )
      
      // CRITICAL FIX: Truncate content to ensure iOS payload stays under 4KB limit
      // FCM rejects iOS payloads over 4KB with "messaging/invalid-argument" error
      // The payload includes: token, notification (title/body), apns.payload.aps.notification (full data), and data payload
      // Content is duplicated in BOTH aps.payload.aps.notification.content AND data.content
      // Base payload overhead: ~800-1000 bytes (token ~142, headers ~100, other fields ~600-800)
      // Available for content: ~3000 bytes, but content appears TWICE, so max ~1500 bytes per instance
      // For Unicode/Khmer text: ~3-4 bytes per char in UTF-8, so we need to be VERY conservative
      if (whatNews && typeof whatNews === 'object') {
        // VERY AGGRESSIVE truncation: Start with 500 chars for Khmer text (3-4 bytes per char)
        // 500 chars × 3.5 bytes × 2 (duplication) = ~3500 bytes, leaving ~500 bytes for other fields
        // We'll iteratively truncate further if needed after building the payload
        const MAX_CONTENT_LENGTH_FOR_IOS = 500 // Very conservative limit for Khmer/Unicode text
        const MAX_TITLE_LENGTH_FOR_IOS = 100 // Title also appears multiple times
        
        const originalContent = String((whatNews as any).content || '')
        const originalTitle = String((whatNews as any).title || '')
        
        if (originalContent.length > MAX_CONTENT_LENGTH_FOR_IOS) {
          console.warn('⚠️ [sendFCMPayloadToPlatform] CRITICAL: Content exceeds iOS 4KB payload limit, truncating:', {
            originalContentLength: originalContent.length,
            truncatedLength: MAX_CONTENT_LENGTH_FOR_IOS,
            accountId: user.accountId,
            note: 'Full content available via API - mobile app can fetch separately if needed',
          })
          ;(whatNews as any).content = originalContent.substring(0, MAX_CONTENT_LENGTH_FOR_IOS - 3) + '...'
        }
        
        // Also truncate title more aggressively (though alert title is already truncated to 40 chars)
        // Title appears in multiple places (aps.notification.title, data.title), so keep it reasonable
        if (originalTitle.length > MAX_TITLE_LENGTH_FOR_IOS) {
          console.warn('⚠️ [sendFCMPayloadToPlatform] Title in data payload is very long, truncating:', {
            originalTitleLength: originalTitle.length,
            truncatedLength: MAX_TITLE_LENGTH_FOR_IOS,
            accountId: user.accountId,
          })
          ;(whatNews as any).title = originalTitle.substring(0, MAX_TITLE_LENGTH_FOR_IOS - 3) + '...'
        }
      }

      // Note: Mobile app will determine redirect screen based on notificationType:
      // - FLASH_NOTIFICATION → Home screen
      // - ANNOUNCEMENT → Notification Center screen

      let iosPayloadResponse =
        mode === 'individual'
          ? InboxResponseDto.buildIOSAlertPayload(
              user.fcmToken,
              iosTitle,
              iosBody,
              notificationIdStr,
              whatNews as unknown as Record<string, string | number>,
            )
          : InboxResponseDto.buildIOSPayload(
              user.fcmToken,
              template.notificationType,
              iosTitle,
              iosBody,
              notificationIdStr,
              whatNews as unknown as Record<string, string | number>,
            )

      try {
        // Get FCM instance for user's bakongPlatform
        // CRITICAL: Use user's bakongPlatform to get correct Firebase instance
        // If user's bakongPlatform doesn't match template's bakongPlatform, this could cause failures
        const fcm = this.getFCM(user.bakongPlatform)
        if (!fcm) {
          console.error('❌ [sendFCMPayloadToPlatform] FCM not available for iOS notification:', {
            accountId: user.accountId,
            userBakongPlatform: user.bakongPlatform,
            templateBakongPlatform: template.bakongPlatform,
            error: 'Firebase Cloud Messaging is not initialized for this bakongPlatform',
          })
          throw new Error(
            `Firebase Cloud Messaging is not initialized for bakongPlatform: ${user.bakongPlatform || 'DEFAULT'}. Please check Firebase configuration.`,
          )
        }
        
        // Log Firebase instance info for debugging
        console.log('📱 [sendFCMPayloadToPlatform] Using FCM instance:', {
          accountId: user.accountId,
          userBakongPlatform: user.bakongPlatform,
          templateBakongPlatform: template.bakongPlatform,
          fcmAvailable: !!fcm,
          note: user.bakongPlatform !== template.bakongPlatform 
            ? '⚠️ WARNING: User bakongPlatform differs from template bakongPlatform - this might cause issues'
            : '✅ User and template bakongPlatform match',
        })
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
        console.log(
          '📱 [sendFCMPayloadToPlatform] Full iOS payload:',
          JSON.stringify(sanitizedIOSPayload, null, 2),
        )

        // Check payload size before sending (FCM has 4KB limit for iOS)
        // CRITICAL: Use Buffer.byteLength to get UTF-8 byte size, not character count
        // JSON.stringify().length counts UTF-16 characters, but FCM counts UTF-8 bytes
        // For Unicode/Khmer text, each character can be 2-4 bytes in UTF-8
        // Iteratively truncate content until payload is under 4KB
        let payloadJsonString = JSON.stringify(iosPayloadResponse)
        let payloadSizeBytes = Buffer.byteLength(payloadJsonString, 'utf8')
        let payloadSizeChars = payloadJsonString.length
        let currentContentLength = (whatNews as any)?.content?.length || 0
        let currentTitleLength = (whatNews as any)?.title?.length || 0
        let truncationAttempts = 0
        const MAX_TRUNCATION_ATTEMPTS = 10
        
        // Iteratively truncate content if payload exceeds 4KB
        while (payloadSizeBytes >= 4096 && truncationAttempts < MAX_TRUNCATION_ATTEMPTS) {
          truncationAttempts++
          console.warn(`⚠️ [sendFCMPayloadToPlatform] Payload exceeds 4KB (${(payloadSizeBytes / 1024).toFixed(2)}KB), truncating further (attempt ${truncationAttempts})...`, {
            sizeBytes: payloadSizeBytes,
            sizeKB: (payloadSizeBytes / 1024).toFixed(2),
            currentContentLength,
            currentTitleLength,
            accountId: user.accountId,
          })
          
          // Reduce content length by 20% each iteration
          if (whatNews && typeof whatNews === 'object' && (whatNews as any).content) {
            const newContentLength = Math.floor(currentContentLength * 0.8)
            const originalContent = String((whatNews as any).content || '')
            if (originalContent.length > newContentLength && newContentLength > 50) {
              ;(whatNews as any).content = originalContent.substring(0, newContentLength - 3) + '...'
              currentContentLength = newContentLength
              
              // Rebuild payload with truncated content
              iosPayloadResponse =
                mode === 'individual'
                  ? InboxResponseDto.buildIOSAlertPayload(
                      user.fcmToken,
                      iosTitle,
                      iosBody,
                      notificationIdStr,
                      whatNews as unknown as Record<string, string | number>,
                    )
                  : InboxResponseDto.buildIOSPayload(
                      user.fcmToken,
                      template.notificationType,
                      iosTitle,
                      iosBody,
                      notificationIdStr,
                      whatNews as unknown as Record<string, string | number>,
                    )
              
              // Recalculate size
              payloadJsonString = JSON.stringify(iosPayloadResponse)
              payloadSizeBytes = Buffer.byteLength(payloadJsonString, 'utf8')
              payloadSizeChars = payloadJsonString.length
            } else {
              // Can't truncate further, break
              break
            }
          } else {
            break
          }
        }
        
        const payloadSizeKB = (payloadSizeBytes / 1024).toFixed(2)
        console.log('📱 [sendFCMPayloadToPlatform] iOS payload size check:', {
          sizeBytes: payloadSizeBytes,
          sizeChars: payloadSizeChars,
          sizeKB: payloadSizeKB,
          isWithinLimit: payloadSizeBytes < 4096,
          accountId: user.accountId,
          contentLength: currentContentLength,
          titleLength: currentTitleLength,
          truncationAttempts,
          note: 'FCM checks UTF-8 byte size, not character count',
        })
        
        if (payloadSizeBytes >= 4096) {
          console.error('❌ [sendFCMPayloadToPlatform] iOS payload STILL exceeds 4KB limit after truncation!', {
            sizeBytes: payloadSizeBytes,
            sizeChars: payloadSizeChars,
            sizeKB: payloadSizeKB,
            accountId: user.accountId,
            contentLength: currentContentLength,
            titleLength: currentTitleLength,
            truncationAttempts,
            warning: 'Payload will be rejected by FCM - content too large even after truncation',
          })
          // CRITICAL: Throw error to prevent sending oversized payload
          throw new Error(`iOS payload exceeds 4KB limit (${payloadSizeKB}KB, ${payloadSizeBytes} bytes) for user ${user.accountId}. Content truncated ${truncationAttempts} times but still too large.`)
        }
        
        console.log('📱 [sendFCMPayloadToPlatform] Sending iOS FCM message...', {
          token: user.fcmToken ? `${user.fcmToken.substring(0, 30)}...` : 'NO TOKEN',
          title: title?.substring(0, 50),
          body: body ? `${body.substring(0, 50)}...` : 'NO BODY',
          bakongPlatform: user.bakongPlatform || 'NULL',
          payloadSizeKB: payloadSizeKB,
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
        console.log(
          'Token (first 50 chars):',
          user.fcmToken ? `${user.fcmToken.substring(0, 50)}...` : 'NO TOKEN',
        )
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
          console.warn(
            '⚠️ [sendFCMPayloadToPlatform] Unexpected FCM response format:',
            typeof sendResponse,
          )
        }
        return sendResponse
      } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error'
        // Extract Firebase error code from multiple possible locations
        const errorCode = error?.code || error?.errorInfo?.code || 'N/A'
        console.error('❌ [sendFCMPayloadToPlatform] iOS FCM send failed:', {
          accountId: user.accountId,
          errorMessage: errorMessage,
          errorCode: errorCode,
          errorDetails: error?.details || 'N/A',
          fullError: process.env.NODE_ENV === 'development' ? error : 'Hidden in production',
        })
        // Preserve the original Firebase error code by attaching it to the Error object
        const wrappedError: any = new Error(`iOS FCM send failed: ${errorMessage} (code: ${errorCode})`)
        wrappedError.code = errorCode !== 'N/A' ? errorCode : undefined // Only set if we have a valid code
        wrappedError.originalError = error // Keep reference to original error for deeper extraction
        wrappedError.firebaseErrorCode = errorCode !== 'N/A' ? errorCode : undefined // Explicit Firebase code property
        throw wrappedError
      }
    }
    if (platform.android) {
      console.log('📱 [sendFCMPayloadToPlatform] Preparing Android notification...')

      // Ensure categoryType is always a string, never null or undefined
      // Android mobile app requires this field to be a string value
      // Use the same robust check as buildBaseNotificationData
      const categoryTypeName = template.categoryTypeEntity?.name
      const safeCategoryType =
        categoryTypeName &&
        typeof categoryTypeName === 'string' &&
        categoryTypeName.trim() !== ''
          ? categoryTypeName
          : 'NEWS'

      console.log('📱 [sendFCMPayloadToPlatform] Android categoryType check:', {
        templateId: template.id,
        categoryTypeEntityExists: !!template.categoryTypeEntity,
        categoryTypeName: categoryTypeName,
        categoryTypeNameType: typeof categoryTypeName,
        safeCategoryType: safeCategoryType,
        finalCategoryType: String(safeCategoryType),
      })

      // CRITICAL FIX: Truncate content to ensure Android payload stays under 4KB limit
      // FCM rejects Android payloads over 4KB with "Android message is too big" error
      // Base payload overhead: ~800-1000 bytes (token ~142, headers ~100, other fields ~600-800)
      // Available for content: ~3000 bytes
      // For Unicode/Khmer text: ~3-4 bytes per char in UTF-8, so we need to be conservative
      const MAX_CONTENT_LENGTH_FOR_ANDROID_INITIAL = 800 // Initial conservative limit for Android
      const MAX_TITLE_LENGTH_FOR_ANDROID = 200 // Title limit for Android
      
      let androidContent = String(translation.content || '')
      let androidTitle = String(title || '')
      
      // Initial truncation before building payload
      if (androidContent.length > MAX_CONTENT_LENGTH_FOR_ANDROID_INITIAL) {
        console.warn('⚠️ [sendFCMPayloadToPlatform] CRITICAL: Content exceeds Android 4KB payload limit, truncating:', {
          originalContentLength: androidContent.length,
          truncatedLength: MAX_CONTENT_LENGTH_FOR_ANDROID_INITIAL,
          accountId: user.accountId,
          note: 'Full content available via API - mobile app can fetch separately if needed',
        })
        androidContent = androidContent.substring(0, MAX_CONTENT_LENGTH_FOR_ANDROID_INITIAL - 3) + '...'
      }
      
      if (androidTitle.length > MAX_TITLE_LENGTH_FOR_ANDROID) {
        console.warn('⚠️ [sendFCMPayloadToPlatform] Title exceeds Android limit, truncating:', {
          originalTitleLength: androidTitle.length,
          truncatedLength: MAX_TITLE_LENGTH_FOR_ANDROID,
          accountId: user.accountId,
        })
        androidTitle = androidTitle.substring(0, MAX_TITLE_LENGTH_FOR_ANDROID - 3) + '...'
      }

      const extraData = {
        templateId: String(template.id),
        notificationType: String(template.notificationType),
        // Use categoryTypeEntity.name (string enum) instead of categoryTypeId (numeric ID)
        // Mobile app expects category name like "NEWS", "ANNOUNCEMENT", etc., not numeric ID
        // CRITICAL: Use robust null/empty/type check to ensure it's always a valid string
        categoryType: String(safeCategoryType),
        language: String(translation.language),
        accountId: String(user.accountId),
        platform: String(user.platform || 'android'),
        imageUrl: imageUrlString || '',
        content: androidContent, // Use truncated content
        linkPreview: translation.linkPreview || '',
        createdDate: template.createdAt
          ? DateFormatter.formatDateByLanguage(
              template.createdAt instanceof Date ? template.createdAt : new Date(template.createdAt),
              translation.language,
            )
          : DateFormatter.formatDateByLanguage(new Date(), translation.language),
        notification_title: androidTitle, // Use truncated title
        notification_body: body,
      }

      // Note: Mobile app will determine redirect screen based on notificationType:
      // - FLASH_NOTIFICATION → Home screen
      // - ANNOUNCEMENT → Notification Center screen

      // Use buildAndroidPayload instead of buildAndroidDataOnlyPayload
      // This includes the 'notification' field which makes notifications display automatically
      // (like Firebase Console does)
      let androidPayload = InboxResponseDto.buildAndroidPayload(
        user.fcmToken,
        androidTitle, // Use truncated title
        body,
        notificationIdStr,
        extraData as Record<string, string>,
      )

      // Check payload size before sending (FCM has 4KB limit for Android too)
      // CRITICAL: Use Buffer.byteLength to get UTF-8 byte size, not character count
      // JSON.stringify().length counts UTF-16 characters, but FCM counts UTF-8 bytes
      // For Unicode/Khmer text, each character can be 2-4 bytes in UTF-8
      let androidPayloadJsonString = JSON.stringify(androidPayload)
      let androidPayloadSizeBytes = Buffer.byteLength(androidPayloadJsonString, 'utf8')
      let androidPayloadSizeChars = androidPayloadJsonString.length
      let androidContentLength = String(extraData.content || '').length
      let androidTitleLength = String(title || '').length
      let androidTruncationAttempts = 0
      const MAX_ANDROID_TRUNCATION_ATTEMPTS = 10
      const MAX_ANDROID_PAYLOAD_BYTES = 4096 // FCM 4KB limit
      
      // Iteratively truncate content if payload exceeds 4KB
      while (androidPayloadSizeBytes >= MAX_ANDROID_PAYLOAD_BYTES && androidTruncationAttempts < MAX_ANDROID_TRUNCATION_ATTEMPTS) {
        androidTruncationAttempts++
        console.warn(`⚠️ [sendFCMPayloadToPlatform] Android payload exceeds 4KB (${(androidPayloadSizeBytes / 1024).toFixed(2)}KB), truncating content (attempt ${androidTruncationAttempts})...`, {
          sizeBytes: androidPayloadSizeBytes,
          sizeKB: (androidPayloadSizeBytes / 1024).toFixed(2),
          currentContentLength: androidContentLength,
          currentTitleLength: androidTitleLength,
          accountId: user.accountId,
        })
        
        // Reduce content length by 20% each iteration
        const newContentLength = Math.floor(androidContentLength * 0.8)
        if (newContentLength > 50 && androidContentLength > newContentLength) {
          const originalContent = String(extraData.content || '')
          extraData.content = originalContent.substring(0, newContentLength - 3) + '...'
          androidContentLength = newContentLength
          
          // Rebuild payload with truncated content
          androidPayload = InboxResponseDto.buildAndroidPayload(
            user.fcmToken,
            title,
            body,
            notificationIdStr,
            extraData as Record<string, string>,
          )
          
          // Recalculate size
          androidPayloadJsonString = JSON.stringify(androidPayload)
          androidPayloadSizeBytes = Buffer.byteLength(androidPayloadJsonString, 'utf8')
          androidPayloadSizeChars = androidPayloadJsonString.length
        } else {
          // Can't truncate further, break
          break
        }
      }
      
      const androidPayloadSizeKB = (androidPayloadSizeBytes / 1024).toFixed(2)
      console.log('📱 [sendFCMPayloadToPlatform] Android payload size check:', {
        sizeBytes: androidPayloadSizeBytes,
        sizeChars: androidPayloadSizeChars,
        sizeKB: androidPayloadSizeKB,
        isWithinLimit: androidPayloadSizeBytes < MAX_ANDROID_PAYLOAD_BYTES,
        accountId: user.accountId,
        contentLength: androidContentLength,
        titleLength: androidTitleLength,
        truncationAttempts: androidTruncationAttempts,
        note: 'FCM checks UTF-8 byte size, not character count',
      })
      
      if (androidPayloadSizeBytes >= MAX_ANDROID_PAYLOAD_BYTES) {
        console.error('❌ [sendFCMPayloadToPlatform] Android payload STILL exceeds 4KB limit after truncation!', {
          sizeBytes: androidPayloadSizeBytes,
          sizeChars: androidPayloadSizeChars,
          sizeKB: androidPayloadSizeKB,
          accountId: user.accountId,
          contentLength: androidContentLength,
          titleLength: androidTitleLength,
          truncationAttempts: androidTruncationAttempts,
          warning: 'Payload will be rejected by FCM - need to truncate content further',
        })
        // CRITICAL: Throw error to prevent sending oversized payload
        throw new Error(`Android payload exceeds 4KB limit (${androidPayloadSizeKB}KB) for user ${user.accountId}. Content truncated ${androidTruncationAttempts} times but still too large.`)
      }

      const msg = androidPayload

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
      console.log(
        '📱 [sendFCMPayloadToPlatform] Full Android payload:',
        JSON.stringify(sanitizedPayload, null, 2),
      )

      try {
        // Get FCM instance for user's bakongPlatform
        // CRITICAL: Use user's bakongPlatform to get correct Firebase instance
        // If user's bakongPlatform doesn't match template's bakongPlatform, this could cause failures
        const fcm = this.getFCM(user.bakongPlatform)
        if (!fcm) {
          console.error('❌ [sendFCMPayloadToPlatform] FCM not available for Android notification:', {
            accountId: user.accountId,
            userBakongPlatform: user.bakongPlatform,
            templateBakongPlatform: template.bakongPlatform,
            error: 'Firebase Cloud Messaging is not initialized for this bakongPlatform',
          })
          throw new Error(
            `Firebase Cloud Messaging is not initialized for bakongPlatform: ${user.bakongPlatform || 'DEFAULT'}. Please check Firebase configuration.`,
          )
        }
        
        // Log Firebase instance info for debugging
        console.log('📱 [sendFCMPayloadToPlatform] Using FCM instance:', {
          accountId: user.accountId,
          userBakongPlatform: user.bakongPlatform,
          templateBakongPlatform: template.bakongPlatform,
          fcmAvailable: !!fcm,
          note: user.bakongPlatform !== template.bakongPlatform 
            ? '⚠️ WARNING: User bakongPlatform differs from template bakongPlatform - this might cause issues'
            : '✅ User and template bakongPlatform match',
        })
        console.log('📱 [sendFCMPayloadToPlatform] Sending Android FCM message...', {
          token: user.fcmToken ? `${user.fcmToken.substring(0, 30)}...` : 'NO TOKEN',
          title: title?.substring(0, 50),
          body: body ? `${body.substring(0, 50)}...` : 'NO BODY',
          bakongPlatform: user.bakongPlatform || 'NULL',
          payloadType: 'notification+data',
          hasClickAction: !!msg.android?.notification?.clickAction,
          clickAction: msg.android?.notification?.clickAction || 'NONE',
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
        console.log(
          'Token (first 50 chars):',
          user.fcmToken ? `${user.fcmToken.substring(0, 50)}...` : 'NO TOKEN',
        )
        console.log('Title:', title)
        console.log('Body:', body?.substring(0, 100))
        console.log('='.repeat(80))

        // Verify we got a valid message ID (should be a string)
        if (!sendResponse || typeof sendResponse !== 'string') {
          console.warn(
            '⚠️ [sendFCMPayloadToPlatform] Unexpected FCM response format:',
            typeof sendResponse,
          )
        }
        return sendResponse
      } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error'
        // Extract Firebase error code from multiple possible locations
        const errorCode = error?.code || error?.errorInfo?.code || 'N/A'
        console.error('❌ [sendFCMPayloadToPlatform] Android FCM send failed:', {
          accountId: user.accountId,
          errorMessage: errorMessage,
          errorCode: errorCode,
          errorDetails: error?.details || 'N/A',
          fullError: process.env.NODE_ENV === 'development' ? error : 'Hidden in production',
        })
        console.error('❌ Error code:', errorCode)
        // Preserve the original Firebase error code by attaching it to the Error object
        const wrappedError: any = new Error(`Android FCM send failed: ${errorMessage} (code: ${errorCode})`)
        wrappedError.code = errorCode !== 'N/A' ? errorCode : undefined // Only set if we have a valid code
        wrappedError.originalError = error // Keep reference to original error for deeper extraction
        wrappedError.firebaseErrorCode = errorCode !== 'N/A' ? errorCode : undefined // Explicit Firebase code property
        throw wrappedError
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
        relations: ['translations', 'categoryTypeEntity'],
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

        const templateCounts = todayNotifications.reduce((acc, notif) => {
          if (notif.templateId) {
            acc[notif.templateId] = (acc[notif.templateId] || 0) + 1
          }
          return acc
        }, {} as Record<number, number>)

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

      // Detect flow: sync data (no page/size) vs notification center (with page/size)
      const isSyncFlow = page === null || page === undefined || size === null || size === undefined

      console.log('📥 [getNotificationCenter] /inbox API called with:', {
        accountId,
        flow: isSyncFlow ? 'SYNC_DATA' : 'NOTIFICATION_CENTER',
        page: page ?? 'null',
        size: size ?? 'null',
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
          message:
            'bakongPlatform is required. Must be one of: BAKONG, BAKONG_JUNIOR, BAKONG_TOURIST',
          data: { accountId },
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

      // CRITICAL: Only include fields if they have actual values
      // Exception: fcmToken empty string means app deleted - should clear token
      // If a field is not provided (undefined) or null, we keep the existing value in database
      // This prevents accidentally overwriting existing data with null/undefined values
      const syncData: any = {
        accountId,
      }

      // fcmToken: Include even if empty string (means app deleted, should clear token)
      // Only skip if undefined or null
      if (fcmToken !== undefined && fcmToken !== null) {
        syncData.fcmToken = fcmToken
      }

      // bakongPlatform: Enum type (BakongApp) - only check for undefined/null
      if (bakongPlatform !== undefined && bakongPlatform !== null) {
        syncData.bakongPlatform = bakongPlatform
      }

      // participantCode: String - check for undefined/null/empty
      if (participantCode !== undefined && participantCode !== null && participantCode !== '') {
        syncData.participantCode = participantCode
      }

      // platform: Enum type (Platform) - only check for undefined/null
      if (platform !== undefined && platform !== null) {
        syncData.platform = platform
      }

      // language: Enum type (Language) - only check for undefined/null
      if (language !== undefined && language !== null) {
        syncData.language = language
      }

      const syncResult = await this.baseFunctionHelper.updateUserData(syncData)

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

      // SYNC FLOW: Return sync response without notifications
      if (isSyncFlow) {
        const isNewUser = 'isNewUser' in syncResult ? (syncResult as any).isNewUser : false
        // dataUpdated only exists in SingleUserSyncResult, not AllUsersSyncResult
        const dataUpdated =
          'isNewUser' in syncResult && 'dataUpdated' in syncResult
            ? (syncResult as any).dataUpdated
            : true // Default to true if not available (shouldn't happen for single user sync)
        console.log(
          `✅ [getNotificationCenter] Sync flow complete for ${accountId}, isNewUser: ${isNewUser}, dataUpdated: ${dataUpdated}`,
        )

        // Get syncStatus from user after sync
        const syncedUser = await this.baseFunctionHelper.findUserByAccountId(accountId)
        const syncStatus = syncedUser?.syncStatus || null

        return InboxResponseDto.getSyncResponse(accountId, userPlatform, dataUpdated, syncStatus)
      }

      // NOTIFICATION CENTER FLOW: Return paginated notifications (existing behavior)
      const { skip, take } = PaginationUtils.normalizePagination(page || 1, size || 10)

      // Use query builder with proper LEFT JOINs to ensure categoryTypeEntity is always loaded
      // This prevents null categoryType issues on Android
      const queryBuilder = this.notiRepo
        .createQueryBuilder('notification')
        .leftJoinAndSelect('notification.template', 'template')
        .leftJoinAndSelect('template.translations', 'translations')
        .leftJoinAndSelect('template.categoryTypeEntity', 'categoryTypeEntity')
        .where('notification.accountId = :accountId', { accountId: accountId.trim() })
        .orderBy('notification.createdAt', 'DESC')
        .skip(skip)
        .take(take)

      const [notifications, totalCount] = await queryBuilder.getManyAndCount()

      // Filter notifications by user's bakongPlatform
      const filteredNotifications = []
      for (const notification of notifications) {
        if (notification.templateId && notification.template) {
          // Ensure translations array exists
          if (!notification.template.translations) {
            notification.template.translations = []
          }

          // Log if categoryTypeEntity is missing for debugging
          if (!notification.template.categoryTypeEntity && notification.template.categoryTypeId) {
            console.warn(
              `⚠️ [getNotificationCenter] Template ${notification.templateId} has categoryTypeId ${notification.template.categoryTypeId} but categoryTypeEntity is null`,
            )
            // Try to reload the categoryTypeEntity if it's missing
            if (notification.template.categoryTypeId) {
              const categoryType = await this.templateRepo.manager.findOne(CategoryType, {
                where: { id: notification.template.categoryTypeId },
              })
              if (categoryType) {
                notification.template.categoryTypeEntity = categoryType
              } else {
                console.error(
                  `❌ [getNotificationCenter] CategoryType with id ${notification.template.categoryTypeId} not found in database`,
                )
              }
            }
          }

          // Filter: only include if template exists and bakongPlatform matches user's platform
          // OR if template has no bakongPlatform (backward compatibility)
          if (
            notification.template &&
            (!notification.template.bakongPlatform ||
              notification.template.bakongPlatform === userPlatform)
          ) {
            filteredNotifications.push(notification)
          }
        } else if (!notification.templateId) {
          // If no templateId, include notification (backward compatibility)
          // But ensure it has a valid categoryType
          filteredNotifications.push(notification)
        } else {
          // Template ID exists but template not found - this is a data integrity issue
          // Log error and skip this notification to prevent null categoryType issues
          console.error(
            `❌ [getNotificationCenter] Notification ${notification.id} has templateId ${notification.templateId} but template not found in database. Skipping to prevent null categoryType.`,
          )
          // Skip this notification to prevent Android from receiving null categoryType
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
      const errorMessage = (error as any).message || ResponseMessage.INTERNAL_SERVER_ERROR
      console.error(`❌ [getNotificationCenter] Error for ${dto.accountId}:`, errorMessage)
      return BaseResponseDto.error({
        errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
        message: ResponseMessage.INTERNAL_SERVER_ERROR,
        data: {
          accountId: dto.accountId,
          error: errorMessage,
        },
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
