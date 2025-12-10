import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
// In dev mode, uses Vite proxy (configured in vite.config.ts)
// In production, uses VITE_API_BASE_URL environment variable
// Empty string means use relative URLs (same protocol as page)
const API_BASE_URL = import.meta.env.DEV
  ? ''
  : import.meta.env.VITE_API_BASE_URL !== undefined && import.meta.env.VITE_API_BASE_URL !== null
    ? import.meta.env.VITE_API_BASE_URL
    : 'http://localhost:4004'

// Helper function to clear auth state (both localStorage and store)
const clearAuthState = () => {
  try {
    const authStore = useAuthStore()
    authStore.logout()
  } catch (e) {
    // If store is not available, just clear localStorage
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // Increased to 120 seconds for large template updates
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
                clearAuthState()
                return Promise.reject(new Error('Token expired. Please login again.'))
              }

              config.headers.Authorization = `Bearer ${token}`
            } catch (e) {
              clearAuthState()
              return Promise.reject(new Error('Invalid token. Please login again.'))
            }
          } else {
            // Invalid token format
            clearAuthState()
            return Promise.reject(new Error('Invalid token format. Please login again.'))
          }
        } else {
          // No token found - clear any stale state
          clearAuthState()
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
      const isAuthEndpoint =
        error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register')
      const isChangePasswordEndpoint = error.config?.url?.includes('/auth/change-password')
      const currentToken = localStorage.getItem('auth_token')
      const isOnAuthPage =
        window.location.pathname.includes('/login') ||
        window.location.pathname.includes('/register')

      // Handle 401 Unauthorized errors
      if (error.response?.status === 401) {
        // Don't auto-redirect for change-password endpoint - let component handle validation errors
        if (isChangePasswordEndpoint) {
          return Promise.reject(error)
        }

        if (isAuthEndpoint) {
          return Promise.reject(error)
        }

        // 401 means unauthorized - token is invalid or expired
        // Clear auth state and redirect to login
        clearAuthState()
        if (!isOnAuthPage) {
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }

      // Handle 500 Internal Server Error - might be caused by invalid token
      if (error.response?.status === 500 && currentToken && !isAuthEndpoint) {
        // Check if token is likely invalid (expired or malformed)
        try {
          const tokenParts = currentToken.split('.')
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]))
            const now = Math.floor(Date.now() / 1000)

            // If token is expired or about to expire, clear it and redirect
            if (payload.exp && payload.exp < now) {
              console.warn('Token expired, clearing and redirecting to login')
              clearAuthState()
              if (!isOnAuthPage) {
                window.location.href = '/login'
              }
              return Promise.reject(new Error('Token expired. Please login again.'))
            }
            // Token appears valid but got 500 error - might be backend issue
            // Don't clear token for non-auth-related 500 errors
            // Let the error propagate normally
          } else {
            // Invalid token format - clear it
            console.warn('Invalid token format detected, clearing token')
            clearAuthState()
            if (!isOnAuthPage) {
              window.location.href = '/login'
            }
            return Promise.reject(new Error('Invalid token format. Please login again.'))
          }
        } catch (e) {
          // Token parsing failed - clear it
          console.warn('Token parsing failed, clearing token')
          clearAuthState()
          if (!isOnAuthPage) {
            window.location.href = '/login'
          }
          return Promise.reject(new Error('Invalid token. Please login again.'))
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
  uploadAvatar: (file: File) => {
    const formData = new FormData()
    formData.append('files', file)
    return uploadApi.post('/api/v1/auth/upload-avatar', formData)
  },
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
