export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    REGISTER: '/api/v1/auth/register',
    REFRESH: '/api/v1/auth/refresh',
    LOGOUT: '/api/v1/auth/logout',
  },
  NOTIFICATIONS: {
    LIST: '/api/v1/notifications',
    CREATE: '/api/v1/notifications',
    SEND: '/api/v1/notifications/send',
    INBOX: '/api/v1/notifications/inbox',
  },
  TEMPLATES: {
    LIST: '/api/v1/templates',
    CREATE: '/api/v1/templates',
    UPDATE: '/api/v1/templates/:id',
    DELETE: '/api/v1/templates/:id',
  },
  USERS: {
    LIST: '/api/v1/users',
    CREATE: '/api/v1/users',
    UPDATE: '/api/v1/users/:id',
    DELETE: '/api/v1/users/:id',
  },
} as const

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const
