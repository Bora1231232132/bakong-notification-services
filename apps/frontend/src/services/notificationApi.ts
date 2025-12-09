import { api, uploadApi } from './api'
import { TimezoneUtils } from '@bakong/shared'

export interface CreateTemplateRequest {
  imageId?: string
  platforms: string[]
  bakongPlatform?: string
  sendType: string
  sendInterval?: {
    cron: string
    startAt: string
    endAt: string
  }
  isSent: boolean
  sendSchedule?: string
  translations: {
    language: string
    title: string
    content: string
    image?: string
    linkPreview?: string
  }[]
  notificationType?: string
  categoryTypeId?: number
  priority?: number
}

export interface Notification {
  author: any
  image: string
  id: number | string
  type: string
  title: string
  description: string
  content: string
  status: string
  date: string
  createdAt?: Date
  templateId?: number
  isSent?: boolean
  sendSchedule?: string
  sendType?: string
  sendInterval?: number | { cron: string; startAt: string; endAt: string }
  lastSentAt?: Date
  nextSendAt?: Date
  accountId?: string
  fcmToken?: string
  firebaseMessageId?: number
  sendCount?: number
  templateStartAt?: string
  templateEndAt?: string
}

enum NotificationType {
  FLASH_NOTIFICATION = 'FLASH_NOTIFICATION',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  NOTIFICATION = 'NOTIFICATION',
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface NotificationFilters {
  page?: number
  pageSize?: number
  status?: string
  type?: string
  search?: string
  language?: string
}

const toCambodiaTime = (utcDate: Date | string): Date => {
  return TimezoneUtils.toCambodiaTime(utcDate)
}

const formatNotificationDate = (date: Date | string): string => {
  const cambodiaDate = toCambodiaTime(date)
  return cambodiaDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export interface TestTokenRequest {
  token: string
  bakongPlatform?: string
}

export interface TestTokenResponse {
  isValid: boolean
  formatValid: boolean
  firebaseValid: boolean
  error?: string
  errorCode?: string
  messageId?: string
}

export const testFCMToken = async (data: TestTokenRequest): Promise<TestTokenResponse> => {
  const response = await api.post('/api/v1/notification/test-token', data)
  console.log('🔍 [testFCMToken] Full API response:', response.data)
  
  // Handle response structure: response.data.data contains the TestTokenResponse
  const result = response.data?.data || response.data
  
  console.log('🔍 [testFCMToken] Parsed result:', result)
  
  // Ensure we have the expected structure
  if (!result || typeof result !== 'object') {
    throw new Error('Invalid response structure from token test endpoint')
  }
  
  return result as TestTokenResponse
}

export interface SyncUsersResponse {
  totalCount: number
  updatedCount: number
  platformUpdates: number
  languageUpdates: number
  invalidTokens: number
  updatedIds: string[]
  updatedIdsCount: number
}

export const syncUsers = async (): Promise<SyncUsersResponse> => {
  const response = await api.post('/api/v1/notification/sync-users')
  console.log('🔍 [syncUsers] Full API response:', response.data)
  
  // Handle response structure: response.data.data contains the SyncUsersResponse
  const result = response.data?.data || response.data
  
  console.log('🔍 [syncUsers] Parsed result:', result)
  
  // Ensure we have the expected structure
  if (!result || typeof result !== 'object') {
    throw new Error('Invalid response structure from sync users endpoint')
  }
  
  return result as SyncUsersResponse
}

export interface InboxRequest {
  fcmToken: string
  accountId: string
  platform?: string
  participantCode?: string
  language?: string
  bakongPlatform: string
  page?: number | null
  size?: number | null
}

export interface InboxSyncResponse {
  accountId: string
  bakongPlatform: string
  syncedAt: string
}

export interface InboxNotificationCenterResponse {
  notifications: any[]
  page: number
  size: number
  itemCount: number
  pageCount: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  userBakongPlatform?: string
}

export const testInbox = async (data: InboxRequest): Promise<any> => {
  const response = await api.post('/api/v1/notification/inbox', data)
  console.log('🔍 [testInbox] Full API response:', response.data)
  
  // Backend returns BaseResponseDto format:
  // { responseCode, errorCode, responseMessage, data }
  // Return the full response object so TestView can access all fields
  return response.data
}

const mapBackendStatusToFrontend = (backendStatus: string): string => {
  switch (backendStatus) {
    case 'SENT':
      return 'published'
    case 'SCHEDULED':
      return 'scheduled'
    case 'INTERVALED':
      return 'scheduled'
    case 'ERROR':
      return 'draft'
    default:
      return 'draft'
  }
}

const getAuthorName = (template: any): string => {
  if (template.publishedBy) {
    return template.publishedBy
  }
  if (template.updatedBy) {
    return template.updatedBy
  }
  if (template.createdBy) {
    return template.createdBy
  }
  return 'System'
}

export const notificationApi = {
  async getAllNotifications(
    filters: NotificationFilters = {},
  ): Promise<PaginatedResponse<Notification>> {
    try {
      const response = await api.get('/api/v1/template', {
        params: {
          page: filters.page || 1,
          size: filters.pageSize || 100,
          language: filters.language || 'KM',
          format: 'notification',
          isAscending: false,
        },
      })

      if (response.status === 304) {
        return {
          data: [],
          total: 0,
          page: 1,
          pageSize: 100,
          totalPages: 0,
        }
      }

      let notifications = []
      let meta = null

      if (response.data && Array.isArray(response.data)) {
        notifications = response.data

        meta = {
          page: filters.page || 1,
          size: filters.pageSize || 100,
          itemCount: notifications.length,
          pageCount: 1,
          totalCount: notifications.length,
          hasPreviousPage: false,
          hasNextPage: false,
        }
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        notifications = response.data.data
        meta = response.data.meta
      } else if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
        notifications = response.data.data.data
        meta = response.data.data.meta
      } else if (!response.data) {
        return {
          data: [],
          total: 0,
          page: 1,
          pageSize: 100,
          totalPages: 0,
        }
      } else {
        throw new Error('Invalid response format from backend')
      }

      const mappedNotifications = notifications.map((notification: any) => {
        return {
          id: notification.id,
          author: notification.author,
          title: notification.title,
          description: notification.description,
          content: notification.content,
          image: notification.image,
          date: notification.date,
          status: notification.status,
          type: notification.type,
          createdAt: notification.createdAt,
          templateId: notification.templateId,
          isSent: notification.isSent,
          sendType: notification.sendType,
          scheduledTime: notification.scheduledTime,
          language: notification.language,
        }
      })

      return {
        data: mappedNotifications,
        total: meta?.total || mappedNotifications.length,
        page: meta?.page || 1,
        pageSize: meta?.pageSize || 100,
        totalPages: meta?.totalPages || 1,
      }
    } catch (error: any) {
      console.error('Error fetching notifications:', error)

      if (error.response?.status === 401) {
        console.log('User does not have permission to view notifications')
        return {
          data: [],
          total: 0,
          page: 1,
          pageSize: 100,
          totalPages: 0,
        }
      }

      throw error
    }
  },

  async getNotifications(
    filters: NotificationFilters = {},
  ): Promise<PaginatedResponse<Notification>> {
    try {
      const response = await api.get('/api/v1/template/all')
      if (Array.isArray(response.data)) {
        const notifications = response.data
          .map((template: any) => {
            const translation = template.translations?.[0]
            if (!translation) return null

            return {
              id: template.templateId || template.id,
              author: getAuthorName(template),
              title: translation.title,
              description: translation.content,
              content: translation.content,
              image: translation.image ? `/api/v1/image/${translation.image.fileId}` : '',
              linkPreview: translation.linkPreview,
              date: template.date,
              // Map status based on isSent and sendType
              // If isSent is true, it's published (regardless of sendType)
              // If isSent is false and has sendSchedule, it's scheduled
              // Otherwise it's draft
              status: template.isSent
                ? 'published'
                : template.sendSchedule || template.sendType === 'SEND_SCHEDULE'
                  ? 'scheduled'
                  : 'draft',
              type: template.notificationType,
              createdAt: template.createdAt,
              templateId: template.templateId || template.id,
              isSent: template.isSent,
              sendType: template.sendType,
            }
          })
          .filter(Boolean)

        let filteredNotifications = notifications.filter((n) => n !== null) as Notification[]
        if (filters.status) {
          filteredNotifications = filteredNotifications.filter((n) => n.status === filters.status)
        }
        if (filters.type) {
          filteredNotifications = filteredNotifications.filter((n) => n.type === filters.type)
        }
        if (filters.search) {
          const searchLower = filters.search.toLowerCase()
          filteredNotifications = filteredNotifications.filter(
            (n) =>
              n.title.toLowerCase().includes(searchLower) ||
              n.description.toLowerCase().includes(searchLower) ||
              n.type.toLowerCase().includes(searchLower),
          )
        }

        const page = filters.page || 1
        const pageSize = filters.pageSize || 10
        const startIndex = (page - 1) * pageSize
        const endIndex = startIndex + pageSize
        const paginatedData = filteredNotifications.slice(startIndex, endIndex)

        return {
          data: paginatedData,
          total: filteredNotifications.length,
          page,
          pageSize,
          totalPages: Math.ceil(filteredNotifications.length / pageSize),
        }
      }

      return {
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      }
    } catch (error: any) {
      console.error('Error fetching notifications:', error)
      throw error
    }
  },

  async getNotificationById(id: number): Promise<Notification> {
    const response = await api.get(`/api/v1/template/${id}`)
    const template = response.data

    const translation = template.translations?.[0]

    return {
      id: template.id,
      type: template.notificationType || template.categoryType || NotificationType.ANNOUNCEMENT,
      title: translation?.title || 'Notification',
      description: translation?.content || 'No content available',
      content: translation?.content || 'No content available',
      status: template.isSent ? 'SENT' : 'SCHEDULED',
      date: template.date,
      createdAt: template.createdAt,
      templateId: template.id,
      isSent: template.isSent,
      sendSchedule: template.sendSchedule,
      author: getAuthorName(template),
      image: '',
    }
  },

  async createNotification(notification: Omit<Notification, 'id'>): Promise<Notification> {
    const response = await api.post('/api/v1/template/create', notification)
    return response.data
  },

  async createTemplate(templateData: CreateTemplateRequest): Promise<any> {
    try {
      const response = await api.post('/api/v1/template/create', templateData)
      return response.data
    } catch (error: any) {
      console.error('Error creating template:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        responseData: error.response?.data,
        status: error.response?.status,
      })
      // Re-throw to let the calling component handle the error display
      throw error
    }
  },

  async uploadImage(file: File): Promise<string> {
    try {
      const formData = new FormData()
      formData.append('files', file)

      const response = await uploadApi.post('/api/v1/image/upload', formData)

      return response.data.data.fileId || response.data.data.files?.[0]?.fileId
    } catch (error) {
      console.error('Error uploading image:', error)
      throw error
    }
  },

  async uploadImages(
    items: { file: File; language?: string }[] | File[],
  ): Promise<{ language?: string; fileId: string; mimeType: string; originalFileName: string }[]> {
    try {
      const formData = new FormData()
      const normalized: { file: File; language?: string }[] =
        Array.isArray(items) && (items as any[])[0] && (items as any[])[0].file
          ? (items as any)
          : (items as File[]).map((f) => ({ file: f }))

      // Validate total size before upload (safety check)
      // Nginx limit is 20MB, but we'll use 18MB as safe limit (leaves 2MB buffer for FormData overhead)
      const MAX_TOTAL_SIZE = 18 * 1024 * 1024 // 18MB
      const MAX_SINGLE_FILE_SIZE = 10 * 1024 * 1024 // 10MB per file (backend limit)
      
      let totalSize = 0
      const sizeErrors: string[] = []
      
      normalized.forEach((item, index) => {
        const fileSize = item.file.size
        
        // Check individual file size
        if (fileSize > MAX_SINGLE_FILE_SIZE) {
          sizeErrors.push(
            `File ${index + 1} (${item.file.name}) is ${(fileSize / 1024 / 1024).toFixed(2)}MB, exceeds 10MB limit`,
          )
        }
        
        totalSize += fileSize
      })
      
      // Check total size
      if (totalSize > MAX_TOTAL_SIZE) {
        const totalMB = (totalSize / 1024 / 1024).toFixed(2)
        throw new Error(
          `Total upload size (${totalMB}MB) exceeds limit (18MB). Please compress images further or upload fewer images.`,
        )
      }
      
      // Check individual file errors
      if (sizeErrors.length > 0) {
        throw new Error(sizeErrors.join('; '))
      }

      const languages: string[] = []
      normalized.forEach((item) => {
        formData.append('files', item.file)
        if (item.language) languages.push(item.language)
      })
      if (languages.length) {
        formData.append('languages', JSON.stringify(languages))
      }

      const response = await uploadApi.post('/api/v1/image/upload', formData)

      return (
        response.data.data.files ||
        (response.data.data.fileId
          ? [
              {
                language: languages[0],
                fileId: response.data.data.fileId,
                mimeType: normalized[0].file.type,
                originalFileName: normalized[0].file.name,
              },
            ]
          : [])
      )
    } catch (error) {
      console.error('Error uploading images:', error)
      throw error
    }
  },

  async updateNotification(id: number, notification: Partial<Notification>): Promise<Notification> {
    const response = await api.put(`/api/v1/template/${id}`, notification)
    return response.data
  },

  async deleteNotification(id: number): Promise<void> {
    await api.post(`/api/v1/template/${id}/remove`)
  },

  async sendNotificationNow(id: number): Promise<void> {
    await api.post(`/api/v1/template/${id}/send-now`)
  },

  async sendNotification(
    templateId: number,
    language: string = 'KM',
    notificationType?: string,
  ): Promise<any> {
    try {
      const payload: any = {
        language: language,
        templateId: templateId,
      }

      if (notificationType) {
        payload.notificationType = notificationType
      }

      const response = await api.post('/api/v1/notification/send', payload)
      return response.data
    } catch (error) {
      console.error(`Error sending notification with templateId ${templateId}:`, error)
      throw error
    }
  },

  async scheduleNotification(id: number, scheduleTime: string): Promise<void> {
    await api.post(`/api/v1/template/${id}/schedule`, { scheduleTime })
  },

  async updateTemplate(id: number, templateData: CreateTemplateRequest): Promise<any> {
    try {
      // Ensure no file buffers are included in the request - only fileIds (strings)
      const sanitizedData = {
        ...templateData,
        translations: templateData.translations?.map((t) => ({
          language: t.language,
          title: t.title,
          content: t.content,
          image: typeof t.image === 'string' ? t.image : '', // Ensure image is only a string (fileId), not a File or Buffer
          linkPreview: t.linkPreview,
        })),
      }

      // Use longer timeout for template updates (60 seconds)
      const response = await api.post(`/api/v1/template/${id}/update`, sanitizedData, {
        timeout: 60000,
      })
      return response.data
    } catch (error: any) {
      console.error(`Error updating template ${id}:`, error)
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        responseData: error.response?.data,
        status: error.response?.status,
      })
      // Re-throw to let the calling component handle the error display
      throw error
    }
  },
}
