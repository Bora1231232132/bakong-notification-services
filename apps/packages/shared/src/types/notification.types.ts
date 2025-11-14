import { NotificationStatus } from '../enums/notification-status.enum'

export interface Notification {
  id: number
  type: string
  title: string
  content: string
  status: NotificationStatus
  date: string
  createdAt?: Date
  templateId?: number
  isSent?: boolean
  sendSchedule?: Date
  accountId?: string
  fcmToken?: string
  firebaseMessageId?: number
  sendCount?: number
}

export interface NotificationCreateRequest {
  type: string
  title: string
  content: string
  templateId?: number
  sendSchedule?: Date
  accountId?: string
  fcmToken?: string
}

export interface NotificationUpdateRequest {
  type?: string
  title?: string
  content?: string
  status?: NotificationStatus
  sendSchedule?: Date
}

export interface NotificationResponse {
  id: number
  type: string
  title: string
  content: string
  status: NotificationStatus
  date: string
  createdAt: Date
  templateId?: number
  sendSchedule?: Date
  sendCount: number
}

export interface NotificationListResponse {
  data: NotificationResponse[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface NotificationFilters {
  page?: number
  pageSize?: number
  status?: NotificationStatus
  type?: string
  search?: string
}
