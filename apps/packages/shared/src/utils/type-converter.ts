import { UserRole } from '../enums/user-role.enum'

export const formatUserRole = (role: UserRole | string): string => {
  switch (role) {
    case UserRole.ADMIN_USER:
      return 'Admin User'
    case UserRole.NORMAL_USER:
      return 'Normal User'
    case UserRole.API_USER:
      return 'API User'
    default:
      return role || 'Unknown'
  }
}

export const formatUserRoleShort = (role: UserRole | string): string => {
  switch (role) {
    case UserRole.ADMIN_USER:
      return 'Admin'
    case UserRole.NORMAL_USER:
      return 'User'
    case UserRole.API_USER:
      return 'API'
    default:
      return role || 'Unknown'
  }
}

export const formatNotificationType = (type: string): string => {
  switch (type?.toUpperCase()) {
    case 'ANNOUNCEMENT':
      return 'Announcement'
    case 'ALERT':
      return 'Alert'
    case 'REMINDER':
      return 'Reminder'
    case 'PROMOTION':
      return 'Promotion'
    case 'SYSTEM':
      return 'System'
    default:
      return type || 'Unknown'
  }
}

export const formatSendType = (type: string): string => {
  switch (type?.toUpperCase()) {
    case 'IMMEDIATE':
      return 'Immediate'
    case 'SCHEDULED':
      return 'Scheduled'
    case 'RECURRING':
      return 'Recurring'
    default:
      return type || 'Unknown'
  }
}

export const formatPlatform = (platform: string): string => {
  switch (platform?.toUpperCase()) {
    case 'IOS':
      return 'iOS'
    case 'ANDROID':
      return 'Android'
    case 'WEB':
      return 'Web'
    case 'BOTH':
      return 'Both iOS & Android'
    case 'ALL':
      return 'All Platforms'
    default:
      return platform || 'Unknown'
  }
}

export const formatPriority = (priority: string): string => {
  switch (priority?.toUpperCase()) {
    case 'HIGH':
      return 'High'
    case 'MEDIUM':
      return 'Medium'
    case 'LOW':
      return 'Low'
    case 'CRITICAL':
      return 'Critical'
    default:
      return priority || 'Unknown'
  }
}

export const formatStatus = (status: string): string => {
  switch (status?.toUpperCase()) {
    case 'ACTIVE':
      return 'Active'
    case 'INACTIVE':
      return 'Inactive'
    case 'PENDING':
      return 'Pending'
    case 'COMPLETED':
      return 'Completed'
    case 'FAILED':
      return 'Failed'
    case 'CANCELLED':
      return 'Cancelled'
    case 'DRAFT':
      return 'Draft'
    case 'PUBLISHED':
      return 'Published'
    case 'SCHEDULED':
      return 'Scheduled'
    default:
      return status || 'Unknown'
  }
}

export const formatDate = (
  date: string | Date,
  format: 'short' | 'long' | 'time' = 'short',
): string => {
  if (!date) return 'Unknown'

  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (isNaN(dateObj.getTime())) return 'Invalid Date'

  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString()
    case 'long':
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    case 'time':
      return dateObj.toLocaleString()
    default:
      return dateObj.toLocaleDateString()
  }
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const formatValue = (value: any, type?: string): string => {
  if (value === null || value === undefined) return 'Unknown'

  if (type) {
    switch (type.toLowerCase()) {
      case 'role':
        return formatUserRole(value)
      case 'role_short':
        return formatUserRoleShort(value)
      case 'notification_type':
        return formatNotificationType(value)
      case 'send_type':
        return formatSendType(value)
      case 'platform':
        return formatPlatform(value)
      case 'priority':
        return formatPriority(value)
      case 'status':
        return formatStatus(value)
      case 'date':
        return formatDate(value)
      case 'date_long':
        return formatDate(value, 'long')
      case 'date_time':
        return formatDate(value, 'time')
      case 'file_size':
        return formatFileSize(value)
      default:
        return String(value)
    }
  }

  return String(value)
}
