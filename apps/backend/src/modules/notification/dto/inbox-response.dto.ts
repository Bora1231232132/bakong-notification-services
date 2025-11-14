import { Notification } from 'src/entities/notification.entity'
import { DateFormatter } from '@bakong/shared'
import { BaseResponseDto } from 'src/common/base-response.dto'
import { Message, ApnsConfig } from 'firebase-admin/messaging'
import { TemplateService } from '../../template/template.service'
import { ImageService } from '../../image/image.service'
import { PaginationMeta } from '@bakong/shared'
import { Language, NotificationType, CategoryType } from '@bakong/shared'

export interface NotificationData {
  id: number
  templateId: number
  language: string
  notificationType: string
  categoryType: string
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
    this.categoryType = data.template?.categoryType || CategoryType.NEWS

    this.createdDate = DateFormatter.formatDateByLanguage(data.createdAt, language)
    this.timestamp = data.createdAt.toISOString()
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
  ) {
    return this.getResponse(notifications, message, pagination)
  }

  static buildBaseNotificationData(
    template: any,
    translation: any,
    language: string,
    imageUrl = '',
    notificationId?: number,
    sendCount?: number,
  ): NotificationData {
    const baseData: NotificationData = {
      id: Number(notificationId),
      templateId: Number(template.id),
      language: translation.language,
      notificationType: template.notificationType,
      categoryType: template.categoryType,
      createdDate: DateFormatter.formatDateByLanguage(template.createdAt, language as Language),
      timestamp: new Date().toISOString(),
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
  ) {
    if (mode === 'individual') {
      return {
        notificationId: successfulNotifications.length > 0 ? successfulNotifications[0].id : null,
        successfulCount: successfulNotifications.length,
        failedCount: failedUsers.length,
      }
    } else {
      return {
        notificationId: sharedNotificationId || null,
        successfulCount: sharedSuccessfulCount ?? 0,
        failedCount: sharedFailedCount ?? 0,
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
        new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      notification_title: extra?.notification_title || title,
      notification_body: extra?.notification_body || body,
    }

    const stringDataPayload: Record<string, string> = {}
    Object.entries(dataPayload).forEach(([key, value]) => {
      stringDataPayload[key] = String(value || '')
    })

    const payload = {
      token,
      notification: {
        title,
        body,
        ...(extra?.imageUrl ? { imageUrl: extra.imageUrl } : {}),
      },
      data: stringDataPayload,
      android: {
        priority: 'high' as const,
        ttl: 3600000,
        collapseKey: `template_${extra?.templateId || 'unknown'}`,
        notification: {
          title,
          body,
          channelId: 'whatnews',
          sound: 'default',
          notificationCount: 1,
          tag: `notification_${notificationId}`,
          color: '#FF5722',
          icon: 'ic_notification',
          clickAction: 'OPEN_NOTIFICATION',
          ...(extra?.imageUrl ? { imageUrl: extra.imageUrl } : {}),
        },
      },
    }
    return payload
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
    const aps: Record<string, any> = {
      alert: { title, body },
      sound: 'default',
      badge: 1,
      type: 'NOTIFICATION',
      notification: notification || {},
    }

    const apns: ApnsConfig = {
      headers: {
        'apns-push-type': 'alert',
        'apns-priority': '10',
      },
      payload: { aps },
    }

    return { token, apns }
  }

  static buildIOSPayload(
    token: string,
    type: NotificationType,
    title: string,
    body: string,
    notificationId: string,
    notification?: Record<string, string | number>,
  ): Message {
    if (type === NotificationType.FLASH_NOTIFICATION) {
      throw new Error('Flash notifications should not send FCM - use API only')
    }
    return this.buildIOSAlertPayload(token, title, body, notificationId, notification)
  }
}
