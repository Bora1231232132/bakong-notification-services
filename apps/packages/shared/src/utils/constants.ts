export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    REGISTER: '/api/v1/auth/register',
    LOGOUT: '/api/v1/auth/logout',
    REFRESH: '/api/v1/auth/refresh',
    PROFILE: '/api/v1/auth/profile',
  },
  NOTIFICATIONS: {
    BASE: '/api/v1/notifications',
    SEND: '/api/v1/notifications/send',
    SCHEDULE: '/api/v1/notifications/schedule',
  },
  USERS: {
    BASE: '/api/v1/users',
    PROFILE: '/api/v1/users/profile',
  },
  TEMPLATES: {
    BASE: '/api/v1/templates',
    TRANSLATIONS: '/api/v1/templates/translations',
  },
  MANAGEMENT: {
    HEALTH: '/api/v1/management/healthcheck',
  },
} as const

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZES: [5, 10, 20, 50, 100],
} as const

export const NOTIFICATION_LIMITS = {
  MAX_TITLE_LENGTH: 255,
  MAX_CONTENT_LENGTH: 1000,
  MAX_SCHEDULE_DAYS: 30,
} as const

export const USER_LIMITS = {
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 20,
  MIN_PASSWORD_LENGTH: 8,
  MAX_DISPLAY_NAME_LENGTH: 100,
} as const
export const USER_ROLES = {
  ADMIN_USER: 'ADMIN_USER',
  NORMAL_USER: 'NORMAL_USER',
  API_USER: 'API_USER',
} as const

export const NOTIFICATION_STATUS = {
  SENT: 'SENT',
  SCHEDULED: 'SCHEDULED',
  FAILED: 'FAILED',
  PENDING: 'PENDING',
  DRAFT: 'DRAFT',
} as const

export const TEMPLATE_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DRAFT: 'DRAFT',
} as const
