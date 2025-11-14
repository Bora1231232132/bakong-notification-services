export interface Notification {
  id: number | string
  author: string
  title: string
  description: string
  content?: string
  image?: string
  date: string
  status: 'published' | 'scheduled' | 'draft'
  scheduledTime?: string
  nextSendAt?: string | Date
  lastSentAt?: string | Date
  sendType?: 'SEND_NOW' | 'SEND_SCHEDULED' | 'SEND_INTERVAL' | 'SEND_SCHEDULE' | string
  type?:
    | 'announcement'
    | 'maintenance'
    | 'system'
    | 'NOTIFICATION'
    | 'ANNOUNCEMENT'
    | 'FLASH_NOTIFICATION'
    | string
  createdAt?: Date | string
  templateId?: number
  isSent?: boolean
  sendInterval?: number | object
  sendCount?: number
  templateStartAt?: string
  templateEndAt?: string
  linkPreview?: string
  language?: string
}

export interface NotificationCardProps {
  notification: Notification
  selected?: boolean
  showActions?: boolean
  variant?: 'default' | 'compact' | 'detailed'
}

export interface NotificationCardEmits {
  select: [id: number]
  edit: [notification: Notification]
  delete: [notification: Notification]
  publish: [notification: Notification]
}
