import { Notification } from 'src/entities/notification.entity'
import { DateFormatter } from '@bakong/shared'
import { BaseResponseDto } from 'src/common/base-response.dto'
import { Message, ApnsConfig } from 'firebase-admin/messaging'
import { TemplateService } from '../../template/template.service'
import { ImageService } from '../../image/image.service'
import { PaginationMeta } from '@bakong/shared'
import { Language, NotificationType } from '@bakong/shared'

export interface NotificationData {
  id: number
  templateId: number
  language: string
  notificationType: string
  categoryType: string
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
  ) {
    const userTranslation =
      templateService?.findBestTranslation(data.template, language) ||
      (data.template?.translations && data.template.translations.length > 0
        ? data.template.translations.find((t) => t.language === language)
        : null) ||
      (data.template?.translations && data.template.translations.length > 0
        ? data.template.translations[0]
        : null)

    this.id = Number(data.id)
    this.templateId = data.templateId || 0
    this.language = language
    this.notificationType = data.template?.notificationType || NotificationType.ANNOUNCEMENT
    
    // CRITICAL FIX: Ensure categoryType is always a string, never null or undefined
    // Android mobile app requires this field to be a string value
    // Try multiple fallback strategies to ensure we always have a valid string
    let categoryTypeName: string | null | undefined = null
    
    // Strategy 1: Try categoryTypeEntity.name (preferred)
    if (data.template?.categoryTypeEntity?.name) {
      categoryTypeName = data.template.categoryTypeEntity.name
    }
    
    // Strategy 2: If categoryTypeEntity is missing but categoryTypeId exists, log warning
    if (!categoryTypeName && data.template?.categoryTypeId) {
      console.warn(
        `⚠️ [InboxResponseDto] Template ${data.templateId} has categoryTypeId ${data.template.categoryTypeId} but categoryTypeEntity is missing`,
      )
    }
    
    // Strategy 3: Fallback to 'NEWS' if no categoryType found
    // This ensures Android always receives a valid string value
    this.categoryType =
      categoryTypeName && typeof categoryTypeName === 'string' && categoryTypeName.trim() !== ''
        ? categoryTypeName.trim()
        : 'NEWS'
    
    // Final validation: Ensure categoryType is never null/undefined/empty
    if (!this.categoryType || typeof this.categoryType !== 'string' || this.categoryType.trim() === '') {
      console.error(
        `❌ [InboxResponseDto] CRITICAL: categoryType is still invalid after all fallbacks! Template: ${data.templateId}, Setting to 'NEWS'`,
      )
      this.categoryType = 'NEWS'
    }
    
    this.bakongPlatform = data.template?.bakongPlatform

    // Ensure createdAt is a Date object before formatting
    const createdAtDate = data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt)
    this.createdDate = DateFormatter.formatDateByLanguage(createdAtDate, language)
    this.timestamp = createdAtDate.toISOString()
    this.title = userTranslation?.title || ''
    this.content = userTranslation?.content || ''
    this.imageUrl =
      imageService?.buildImageUrl(userTranslation?.imageId, undefined, baseUrl) ||
      (userTranslation?.imageId ? `${baseUrl}/api/v1/image/${userTranslation.imageId}` : '')
    this.linkPreview = userTranslation?.linkPreview || ''
  }

  static getResponse(
    data: NotificationData | NotificationData[],
    message: string,
    pagination?: PaginationMeta,
  ) {
    if (!Array.isArray(data)) {
      return BaseResponseDto.success({
        data: { whatnews: data },
        message,
      })
    }

    const sortedNotifications = data.sort((a, b) => b.id - a.id)
    return BaseResponseDto.success({
      data: {
        notifications: sortedNotifications,
        ...pagination,
      },
      message,
    })
  }

  static getNotificationCenterResponse(
    notifications: NotificationData[],
    message: string,
    pagination?: PaginationMeta,
    userBakongPlatform?: string,
  ) {
    // CRITICAL FIX: Ensure all notifications have valid categoryType before serialization
    // This prevents Android from receiving null categoryType values
    const sanitizedNotifications = notifications.map((notif) => {
      // Ensure categoryType is always a valid string, never null or undefined
      if (!notif.categoryType || typeof notif.categoryType !== 'string' || notif.categoryType.trim() === '') {
        console.warn(
          `⚠️ [getNotificationCenterResponse] Notification ${notif.id} has invalid categoryType: ${notif.categoryType}, setting to 'NEWS'`,
        )
        notif.categoryType = 'NEWS'
      }
      return notif
    })

    const response = this.getResponse(sanitizedNotifications, message, pagination)
    if (
      userBakongPlatform &&
      response.data &&
      typeof response.data === 'object' &&
      'notifications' in response.data
    ) {
      ;(response.data as any).userBakongPlatform = userBakongPlatform
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
    language: string,
    imageUrl = '',
    notificationId?: number,
    sendCount?: number,
  ): NotificationData {
    // Use translation.language if available, otherwise fall back to requested language
    const responseLanguage = translation?.language || language
    
    const baseData: NotificationData = {
      id: Number(notificationId),
      templateId: Number(template.id),
      language: responseLanguage,
      notificationType: template.notificationType,
      // Use categoryTypeEntity.name (string enum) instead of categoryTypeId (numeric ID)
      // Mobile app expects category name like "NEWS", "ANNOUNCEMENT", etc., not numeric ID
      // Ensure categoryType is always a string, never null or undefined (required for Android)
      categoryType:
        template.categoryTypeEntity?.name &&
        typeof template.categoryTypeEntity.name === 'string' &&
        template.categoryTypeEntity.name.trim() !== ''
          ? template.categoryTypeEntity.name
          : 'NEWS',
      bakongPlatform: template.bakongPlatform,
      createdDate: DateFormatter.formatDateByLanguage(
        template.createdAt instanceof Date ? template.createdAt : new Date(template.createdAt),
        responseLanguage as Language,
      ),
      timestamp: (template.createdAt instanceof Date ? template.createdAt : new Date(template.createdAt)).toISOString(),
      title: translation.title,
      content: translation.content,
      imageUrl: imageUrl || '',
      linkPreview: translation.linkPreview || '',
    }

    if (template.notificationType === NotificationType.FLASH_NOTIFICATION) {
      baseData.sendCount = sendCount || 1
    }

    return baseData
  }

  static buildSendApiNotificationData(
    template: any,
    translation: any,
    language: string,
    imageUrl = '',
    notificationId?: number,
    sendCount?: number,
  ): NotificationData {
    const baseData = this.buildBaseNotificationData(
      template,
      translation,
      language,
      imageUrl,
      notificationId,
      sendCount,
    )

    if (template.notificationType === NotificationType.FLASH_NOTIFICATION) {
      baseData.sendCount = sendCount || 1
    }

    return baseData
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
      notification : notification || [] // Mobile app reads this from aps payload (non-standard but was working before)
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
