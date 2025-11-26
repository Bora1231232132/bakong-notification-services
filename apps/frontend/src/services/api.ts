import axios from 'axios'
// In dev mode, uses Vite proxy (configured in vite.config.ts)
// In production, uses VITE_API_BASE_URL environment variable
// Empty string means use relative URLs (same protocol as page)
const API_BASE_URL = import.meta.env.DEV
  ? ''
  : import.meta.env.VITE_API_BASE_URL !== undefined && import.meta.env.VITE_API_BASE_URL !== null
    ? import.meta.env.VITE_API_BASE_URL
    : 'http://localhost:4004'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})
export const uploadApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
})
const addAuthInterceptor = (axiosInstance: typeof api) => {
  axiosInstance.interceptors.request.use(
    async (config) => {
      if (
        config.url?.includes('/auth/login') ||
        config.url?.includes('/auth/register') ||
        config.url?.includes('/notification/')
      ) {
        config.headers['x-api-key'] = 'BAKONG'
      }
      if (!config.url?.includes('/auth/login') && !config.url?.includes('/auth/register')) {
        const token = localStorage.getItem('auth_token')
        if (token && token.trim() !== '') {
          const tokenParts = token.split('.')
          if (tokenParts.length === 3) {
            try {
              const payload = JSON.parse(atob(tokenParts[1]))
              const now = Math.floor(Date.now() / 1000)

              // Check if token is expired
              if (payload.exp && payload.exp < now) {
                localStorage.removeItem('auth_token')
                localStorage.removeItem('user')
                return Promise.reject(new Error('Token expired. Please login again.'))
              }

              config.headers.Authorization = `Bearer ${token}`
            } catch (e) {
              localStorage.removeItem('auth_token')
              localStorage.removeItem('user')
              return Promise.reject(new Error('Invalid token. Please login again.'))
            }
          } else {
            // Invalid token format
            localStorage.removeItem('auth_token')
            localStorage.removeItem('user')
            return Promise.reject(new Error('Invalid token format. Please login again.'))
          }
        } else {
          // No token found
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user')
          return Promise.reject(new Error('No authentication token found. Please login.'))
        }
      }

      return config
    },
    (error) => {
      return Promise.reject(error)
    },
  )
}
addAuthInterceptor(api)
addAuthInterceptor(uploadApi)
const addResponseInterceptor = (axiosInstance: typeof api) => {
  axiosInstance.interceptors.response.use(
    (response) => {
      return response
    },
    async (error) => {
      if (error.response?.status === 401) {
        // Don't auto-redirect for change-password endpoint - let component handle validation errors
        if (error.config?.url?.includes('/auth/change-password')) {
          return Promise.reject(error)
        }

        if (
          error.config?.url?.includes('/auth/login') ||
          error.config?.url?.includes('/auth/register')
        ) {
          return Promise.reject(error)
        }

        const currentToken = localStorage.getItem('auth_token')
        if (currentToken) {
          try {
            const tokenParts = currentToken.split('.')
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]))

              if (!payload.exp || payload.exp > Math.floor(Date.now() / 1000)) {
                return Promise.reject(error)
              }
            }
          } catch (e) {
            localStorage.removeItem('auth_token')
          }
        }
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
        if (
          !window.location.pathname.includes('/login') &&
          !window.location.pathname.includes('/register')
        ) {
          window.location.href = '/login'
        }
      }
      return Promise.reject(error)
    },
  )
}
addResponseInterceptor(api)
addResponseInterceptor(uploadApi)

export const authApi = {
  login: (credentials: { username: string; password: string }) => {
    const formData = new URLSearchParams()
    formData.append('username', credentials.username)
    formData.append('password', credentials.password)
    const requestConfig = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }

    return api.post('/api/v1/auth/login', formData.toString(), requestConfig)
  },
  register: (userData: { username: string; password: string; displayName: string; role: string }) =>
    api.post('/api/v1/auth/register', userData),
  logout: () => api.post('/api/v1/auth/logout'),
  refreshToken: () => api.post('/api/v1/auth/refresh'),
}

export const notificationApi = {
  getNotifications: (params?: { page?: number; limit?: number }) =>
    api.get('/api/v1/notifications', { params }),
  sendNotification: (data: any) => api.post('/api/v1/notifications', data),
  getNotificationById: (id: string) => api.get(`/api/v1/notifications/${id}`),
}

export const managementApi = {
  healthCheck: () => api.get('/api/v1/management/healthcheck'),
}

export default api
