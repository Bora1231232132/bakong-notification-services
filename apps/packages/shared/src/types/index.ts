export interface User {
  id: number
  username: string
  displayName?: string
  role: string
  createdAt: Date
  updatedAt: Date
}

export interface BakongUser {
  id: number
  accountId: string
  fcmToken: string
  participantCode?: string
  platform?: string
  language: string
  createdAt: Date
  updatedAt: Date
}

export interface Notification {
  id: number
  accountId: string
  fcmToken: string
  templateId?: number
  createdAt: Date
  firebaseMessageId?: number
  sendCount: number
}

export interface Template {
  id: number
  platforms: string
  sendType: string
  notificationType: string
  categoryType: string
  priority: number
  sendInterval?: number
  isSent: boolean
  sendSchedule?: Date
  createdAt: Date
  updatedAt: Date
}
