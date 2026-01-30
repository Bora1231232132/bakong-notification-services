import { DateFormatter, PaginationMeta, Language, NotificationType, BakongApp } from '@bakong/shared'
import { BaseResponseDto } from 'src/common/base-response.dto'
import { Message, ApnsConfig } from 'firebase-admin/messaging'
import { ImageService } from '../../image/image.service'
import { TemplateService } from '@/modules/template/template.service'
import { Template } from 'src/entities/template.entity'
import { CategoryType } from '@/entities/category-type.entity'
import { Notification } from 'src/entities/notification.entity'

export interface NotificationData {
  id: number
  templateId: number
  language: string
  notificationType: string

  // ✅ V2 requirement: categoryType is translated display string (not enum, not id)
  categoryType: string
  categoryIcon?: string

  bakongPlatform?: string
  createdDate: string
  timestamp: string
  title: string
  content: string
  imageUrl: string
  linkPreview: string
  sendCount?: number
}

export class InboxResponseDto implements NotificationData {
  id: number
  templateId: number
  language: string
  title: string
  content: string
  imageUrl: string
  linkPreview: string

  notificationType: string
  categoryType: string
  categoryIcon?: string

  bakongPlatform?: string
  createdDate: string
  timestamp: string
  sendCount?: number

  constructor(
    data: Notification,
    language: Language,
    baseUrl: string,
    templateService?: TemplateService,
    imageService?: ImageService,
    req?: any,
  ) {
    const template = (data as any).template as Template | undefined

    const userTranslation =
      (template && templateService?.findBestTranslation(template, language)) || null

    this.id = Number((data as any).id)
    this.templateId = Number((data as any).templateId || template?.id || 0)

    // Detect V1 vs V2
    const isV2 = (req as any)?.version === '2' || req?.url?.includes('/v2/') || req?.originalUrl?.includes('/v2/')

    // Language field: Show the actual stored language (what was sent in FCM push)
    // FCM push always uses KM, so stored language will be KM
    let storedLanguage: Language = Language.KM // Default to KM
    if ((data as any).language) {
      storedLanguage = (data as any).language as Language
    } else if (userTranslation) {
      storedLanguage = userTranslation.language as Language
    }
    this.language = String(storedLanguage)

    // For categoryType and date: Use user's preferred language (with KM fallback)
    // This ensures users see labels in their preferred language even if content is KM
    let displayLanguage: Language = language
        // Check if template has translation in user's language
        if (template?.translations && Array.isArray(template.translations)) {
          const userLangExists = template.translations.some((t: any) => t.language === language)
          if (!userLangExists) {
            // User's language not available, fallback to KM
            displayLanguage = Language.KM
          }
        } else {
          // No translations available, use KM as fallback
          displayLanguage = Language.KM
        }

    // If the stored notification language is EN, prefer English for display
    try {
      if (storedLanguage === Language.EN) {
        displayLanguage = Language.EN
      }
    } catch (e) {
      // ignore
    }

    // If template is for Bakong Tourist, force display language to EN (highest priority)
    try {
      if ((template as any)?.bakongPlatform === BakongApp.BAKONG_TOURIST) {
        displayLanguage = Language.EN
      }
    } catch (e) {
      // ignore
    }

    // Find best translation for user's language (for content display)
    const userLangTranslation = template && templateService?.findBestTranslation(template, language)

    this.notificationType = ((template as any)?.notificationType ||
      NotificationType.ANNOUNCEMENT) as any

    if (isV2) {
      // ✅ V2: categoryType MUST be translated display string using user's preferred language (with KM fallback)
      this.categoryType =
        InboxResponseDto.getCategoryDisplayName(template?.categoryTypeEntity, displayLanguage) || 'Other'

      // ✅ V2: categoryIcon per record
      this.categoryIcon = baseUrl
        ? InboxResponseDto.buildCategoryIconUrl(
          baseUrl,
          template?.categoryTypeId ?? template?.categoryTypeEntity?.id ?? null,
        )
        : undefined
    } else {
      // ✅ V1: categoryType MUST be translated display string using the notification's STORED language (storedLanguage)
      // For Bakong Tourist, always display categoryType in English
      if ((template as any)?.bakongPlatform === BakongApp.BAKONG_TOURIST) {
        this.categoryType =
          InboxResponseDto.getCategoryDisplayName(template?.categoryTypeEntity, Language.EN) || 'Other'
      } else {
        this.categoryType =
          InboxResponseDto.getCategoryDisplayName(template?.categoryTypeEntity, storedLanguage) || 'Other'
      }

      // ✅ V1: No categoryIcon field
      this.categoryIcon = undefined
    }


    this.bakongPlatform =
      (template as any)?.bakongPlatform ||
      (data as any)?.userBakongPlatform ||
      'BAKONG'

    // Use displayLanguage (user's preference with KM fallback) for date formatting
    this.createdDate = DateFormatter.formatDateByLanguage((data as any).createdAt, displayLanguage)
    this.timestamp = (data as any).createdAt.toISOString()

    // Title and content: Use user's preferred language if available, otherwise use stored language (KM)
    // This ensures users see content in their preferred language in the inbox, but falls back to what was sent
    const storedTranslation = template && templateService?.findBestTranslation(template, storedLanguage)
    const contentTranslation = userLangTranslation || storedTranslation || userTranslation
    this.title = contentTranslation?.title || ''
    this.content = contentTranslation?.content || ''

    const imageId =
      (userTranslation as any)?.imageId ??
      (template as any)?.imageId ??
      null

    this.imageUrl =
      imageId
        ? (imageService?.buildImageUrl(imageId, req, baseUrl) ||
          `${baseUrl}/api/v1/image/${imageId}`)
        : ''

    this.linkPreview = storedTranslation?.linkPreview || ''
  }

  static getResponse(
    data: NotificationData | NotificationData[],
    message: string,
    pagination?: PaginationMeta,
  ) {
    if (!Array.isArray(data)) {
      return BaseResponseDto.success({
        data,
        message,
      })
    }

    const sorted = [...data].sort((a, b) => Number(b.id) - Number(a.id))

    return BaseResponseDto.success({
      data: {
        notifications: sorted,
        ...pagination,
      },
      message,
    })
  }

  static getNotificationCenterResponse(
    notifications: NotificationData | NotificationData[],
    message: string,
    pagination?: PaginationMeta,
    userBakongPlatform?: string,
  ) {
    // ✅ sanitize: categoryType must never be empty
    const sanitized = (notifications as NotificationData[]).map((n) => ({
      ...n,
      categoryType:
        typeof n.categoryType === 'string' && n.categoryType.trim()
          ? n.categoryType
          : 'Other',
    }))

    const response = this.getResponse(sanitized, message, pagination)

    // attach extra field
    if (userBakongPlatform && response.data && typeof response.data === 'object') {
      ; (response.data as any).userBakongPlatform = userBakongPlatform
    }

    return response
  }

  static getSyncResponse(
    accountId: string,
    bakongPlatform: string,
    dataUpdated: boolean = true,
    syncStatus?: {
      status: 'SUCCESS' | 'FAILED'
      lastSyncAt: string | null
      lastSyncMessage: string | null
    },
  ) {
    return BaseResponseDto.success({
      message: dataUpdated
        ? 'User data synchronized successfully'
        : 'User data is already up to date',
      data: {
        accountId,
        bakongPlatform,
        syncedAt: new Date().toISOString(),
        dataUpdated,
        syncStatus: syncStatus || null,
      },
    })
  }

  static buildBaseNotificationData(
    template: any,
    translation: any,
    language: Language,
    imageUrl = '',
    notificationId?: number,
    sendCount?: number,
    baseUrl?: string,
    req?: any,
    categoryIcon?: string,
    failedUsers?: string[],
  ): NotificationData {
    // Detect V1 vs V2
    const isV2 = (req as any)?.version === '2' || req?.url?.includes('/v2/') || req?.originalUrl?.includes('/v2/')

    // Language field: Show the actual translation language used (KM for FCM push)
    const storedLanguage: Language = translation?.language
      ? (translation.language as Language)
      : Language.KM

    // For categoryType and date: Use user's preferred language (with KM fallback)
    // This ensures users see categoryType and date in their preferred language
    let displayLanguage: Language = language // User's preferred language
    // Check if user's language translation exists in template
    if (template?.translations && Array.isArray(template.translations)) {
      const userLangExists = template.translations.some((t: any) => t.language === language)
      if (!userLangExists) {
        // User's language not available, fallback to KM
        displayLanguage = Language.KM
      }
    } else {
      // No translations available, use KM
      displayLanguage = Language.KM
    }

    // If the stored translation language is EN, prefer English for display
    try {
      if (storedLanguage === Language.EN) displayLanguage = Language.EN
    } catch (e) {
      // ignore
    }

    // If template is for Bakong Tourist, force display language to EN (highest priority)
    try {
      if ((template as any)?.bakongPlatform === BakongApp.BAKONG_TOURIST) displayLanguage = Language.EN
    } catch (e) {
      // ignore
    }

    let categoryType: string
    let finalCategoryIcon: string | undefined

    if (isV2) {
      // ✅ V2: categoryType MUST be translated display string using user's preferred language (with KM fallback)
      categoryType =
        InboxResponseDto.getCategoryDisplayName(template?.categoryTypeEntity, displayLanguage) || 'Other'

      // ✅ V2: categoryIcon per record
      finalCategoryIcon = baseUrl
        ? (categoryIcon || InboxResponseDto.buildCategoryIconUrl(baseUrl, template?.categoryTypeId))
        : undefined
    } else {
      // ✅ V1: Normally categoryType is raw enum value from database, converted to UPPERCASE
      // However for Bakong Tourist, force English translated display string (single source of truth)
      if ((template as any)?.bakongPlatform === BakongApp.BAKONG_TOURIST) {
        categoryType = InboxResponseDto.getCategoryDisplayName(template?.categoryTypeEntity, Language.EN) || 'Other'
      } else {
        const rawName = template?.categoryTypeEntity?.name || 'Other'
        let upperName = rawName.toUpperCase()
        upperName = upperName.replace(/\s+&\s+/g, '_AND_')
        upperName = upperName.replace(/\s+/g, '_')
        categoryType = upperName
      }

      // ✅ V1: No categoryIcon field
      finalCategoryIcon = undefined
    }

    const baseData: NotificationData = {
      id: Number(notificationId),
      templateId: Number(template?.id),
      language: String(storedLanguage), // Show actual language used (KM for FCM push)
      notificationType: template?.notificationType,

      categoryType,
      categoryIcon: finalCategoryIcon,


      bakongPlatform: template?.bakongPlatform,
      createdDate: DateFormatter.formatDateByLanguage(new Date(), displayLanguage), // Use user's language for date
      timestamp: new Date().toISOString(),
      title: translation?.title || '', // Content from translation (KM for FCM push)
      content: translation?.content || '', // Content from translation (KM for FCM push)
      imageUrl: imageUrl || '',
      linkPreview: translation?.linkPreview || '',
    }

    if (template?.notificationType === NotificationType.FLASH_NOTIFICATION) {
      baseData.sendCount = sendCount || 1
    }

    return baseData
  }

  static buildSendApiNotificationData(
    template: any,
    translation: any,
    language: Language,
    imageUrl = '',
    notificationId?: number,
    sendCount?: number,
    baseUrl?: string,
    req?: any,
    categoryIcon?: string,
    failedUsers?: string[],
  ): NotificationData {
    return this.buildBaseNotificationData(
      template,
      translation,
      language,
      imageUrl,
      notificationId,
      sendCount,
      baseUrl,
      req,
      categoryIcon,
      failedUsers,
    )
  }

  // =========================
  // ✅ CATEGORY HELPERS (single source of truth)
  // =========================

  static getCategoryDisplayName(
    categoryType: CategoryType | undefined,
    lang: Language,
  ): string {
    const defaultOther =
      lang === Language.KM ? 'ផ្សេងៗ'
        : lang === Language.JP ? 'その他'
          : 'Other'

    if (!categoryType) return defaultOther

    const safe = (v?: string) => (typeof v === 'string' ? v.trim() : '')

    if (lang === Language.KM) return safe(categoryType.namekh) || safe(categoryType.name) || defaultOther
    if (lang === Language.JP) return safe(categoryType.namejp) || safe(categoryType.name) || defaultOther
    return safe(categoryType.name) || defaultOther
  }

  private static DEFAULT_OTHER_CATEGORY_ID = 3

  static buildCategoryIconUrl(baseUrl: string, categoryTypeId?: number | null): string {
    const id = categoryTypeId ?? InboxResponseDto.DEFAULT_OTHER_CATEGORY_ID
    return `${baseUrl}/api/v2/category-type/${id}/icon`
  }

  static buildFCMResult(
    mode: 'individual' | 'shared',
    successfulNotifications: any[],
    failedUsers: any[],
    fcmUsers: any[],
    sharedNotificationId?: number,
    sharedSuccessfulCount?: number,
    sharedFailedCount?: number,
    sharedFailedUsers?: Array<{ accountId: string; error: string; errorCode?: string }>,
  ) {
    // Check if failures are due to invalid tokens
    const checkInvalidTokens = (
      users: Array<{ accountId: string; error?: string; errorCode?: string }>,
    ): boolean => {
      if (!users || users.length === 0) return false

      const invalidTokenErrorCodes = [
        'messaging/registration-token-not-registered',
        'messaging/invalid-registration-token',
        'messaging/invalid-argument',
      ]

      // Check if all failures are due to invalid tokens
      const allInvalidTokens = users.every(
        (u) => u.errorCode && invalidTokenErrorCodes.includes(u.errorCode),
      )

      // Or check if majority are invalid tokens (more than 50%)
      const invalidTokenCount = users.filter(
        (u) => u.errorCode && invalidTokenErrorCodes.includes(u.errorCode),
      ).length
      const majorityInvalidTokens = invalidTokenCount > users.length / 2

      return allInvalidTokens || majorityInvalidTokens
    }

    const allFailedUsers = mode === 'individual' ? failedUsers : sharedFailedUsers || []
    const failedDueToInvalidTokens = checkInvalidTokens(allFailedUsers)

    // Extract error codes for debugging
    const failedUserDetails = allFailedUsers.map((u) => ({
      accountId: u.accountId,
      error: u.error,
      errorCode: u.errorCode,
    }))

    if (mode === 'individual') {
      return {
        notificationId: successfulNotifications.length > 0 ? successfulNotifications[0].id : null,
        successfulCount: successfulNotifications.length,
        failedCount: failedUsers.length,
        failedUsers: failedUsers.map((u) => u.accountId),
        failedDueToInvalidTokens,
        failedUserDetails, // Include detailed error info for debugging
      }
    } else {
      return {
        notificationId: sharedNotificationId || null,
        successfulCount: sharedSuccessfulCount ?? 0,
        failedCount: sharedFailedCount ?? 0,
        failedUsers: (sharedFailedUsers || []).map((u) => u.accountId),
        failedDueToInvalidTokens,
        failedUserDetails, // Include detailed error info for debugging
      }
    }
  }

  static buildAndroidPayload(
    token: string,
    title: string,
    body: string,
    notificationId: string,
    extra?: Record<string, string>,
  ): Message {
    const dataPayload = {
      type: 'NOTIFICATION',
      notificationId,
      title: title,
      body: body,
      timestamp: new Date().toISOString(),
      ...(extra ?? {}),
      content: extra?.content || '',
      linkPreview: extra?.linkPreview || '',
      createdDate:
        extra?.createdDate ||
        DateFormatter.formatDateByLanguage(new Date(), Language.EN),
      notification_title: extra?.notification_title || title,
      notification_body: extra?.notification_body || body,
    }

    const stringDataPayload: Record<string, string> = {}
    Object.entries(dataPayload).forEach(([key, value]) => {
      // CRITICAL: Ensure categoryType is never empty string
      if (key === 'categoryType' && (!value || String(value).trim() === '')) {
        stringDataPayload[key] = 'NEWS'
      } else {
        stringDataPayload[key] = String(value || '')
      }
    })

    return {
      token,
      data: dataPayload,
      android: {
        priority: 'high',
      },
    }
  }


  static buildAndroidDataOnlyPayload(
    token: string,
    title: string,
    body: string,
    notificationId: string,
    extra?: Record<string, any>,
  ): Message {
    const data: Record<string, string> = {
      type: 'NOTIFICATION',
      notificationId: String(notificationId),
      title: String(title),
      body: String(body),
      timestamp: new Date().toISOString(),
      ...(extra
        ? Object.fromEntries(
          Object.entries(extra).map(([key, value]) => [key, String(value || '')]),
        )
        : {}),
    }

    return {
      token,
      android: {
        priority: 'high',
        ttl: 3600000,
        collapseKey: `template_${String(extra?.templateId ?? 'unknown')}`,
      },
      data,
    }
  }

  static buildIOSAlertPayload(
    token: string,
    title: string,
    body: string,
    notificationId: string,
    notification?: Record<string, string | number>,
  ): Message {
    // APS (Apple Push Notification service) payload - only valid APNs fields allowed
    // Valid fields: alert, badge, sound, content-available, category, thread-id, mutable-content
    // Note: Do NOT include content-available when you have alert - it's for silent notifications only
    // When both are present, iOS may not display the notification properly
    const aps: Record<string, any> = {
      alert: { title, body },
      sound: 'default',
      badge: 1,
      type: 'NOTIFICATION',
      notification: notification || [] // Mobile app reads this from aps payload (non-standard but was working before)
      // Removed content-available - it's only for silent background notifications
      // When combined with alert, it can prevent notification from displaying
    }

    // Build data payload for iOS (accessible when app is opened from notification)
    // Data fields must be strings for FCM
    // Note: Mobile app will determine redirect screen based on notificationType field
    // IMPORTANT: Set 'type' AFTER adding other fields to ensure it's never overwritten
    const dataPayload: Record<string, string> = {
      notificationId: String(notificationId),
    }

    // Add other notification data fields if present (in data, not APS)
    // This includes notificationType which mobile app uses for routing
    if (notification) {
      Object.entries(notification).forEach(([key, value]) => {
        // Skip 'type' field from notification object to prevent overwriting
        if (key !== 'type') {
          dataPayload[key] = String(value ?? '')
        }
      })
    }

    // IMPORTANT: Set 'type' AFTER all other fields to ensure it's always 'NOTIFICATION'
    // Mobile app requires this field and expects it to be 'NOTIFICATION'
    dataPayload.type = 'NOTIFICATION'

    const apns: ApnsConfig = {
      headers: {
        'apns-push-type': 'alert',
        'apns-priority': '10',
      },
      payload: { aps },
    }

    // IMPORTANT: Add 'notification' field at root level (like Firebase Console does)
    // This ensures iOS displays the notification even when app is in background/terminated
    // Firebase Console uses this structure, so we match it for consistency
    return {
      token,
      notification: {
        title,
        body,
      },
      apns,
      data: dataPayload,
    }
  }

  static buildIOSPayload(
    token: string,
    type: NotificationType,
    title: string,
    body: string,
    notificationId: string,
    notification?: Record<string, string | number>,
  ): Message {
    // FLASH_NOTIFICATION now sends FCM push like other notification types
    // Mobile app will display it differently (as popup/flash screen)
    return this.buildIOSAlertPayload(token, title, body, notificationId, notification)
  }
}
