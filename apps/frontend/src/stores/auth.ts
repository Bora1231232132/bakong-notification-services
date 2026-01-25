import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { authApi } from '@/services/api'
import { handleApiError, showSuccess, getApiErrorMessage } from '@/services/errorHandler'
import { getPermissions } from '@/utils/permissions'
import { ErrorCode } from '@bakong/shared'

export enum UserRole {
  ADMINISTRATOR = 'ADMINISTRATOR',
  APPROVAL = 'APPROVAL',
  EDITOR = 'EDITOR',
  VIEW_ONLY = 'VIEW_ONLY',
}

export interface User {
  id: number
  username: string
  email?: string
  displayName: string
  role: UserRole
  image?: string | null
  mustChangePassword?: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  username: string
  password: string
  displayName: string
  role: UserRole
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const loading = ref(false)
  const error = ref<string | null>(null)
  const userAvatar = ref<string | null>(localStorage.getItem('user_avatar') || null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  watch(token, (newToken) => {
    if (newToken) {
      localStorage.setItem('auth_token', newToken)
    } else {
      localStorage.removeItem('auth_token')
    }
  })

  watch(userAvatar, (newAvatar) => {
    if (newAvatar) {
      localStorage.setItem('user_avatar', newAvatar)
    } else {
      localStorage.removeItem('user_avatar')
    }
  })

  let isRefreshing = false

  const checkAndRefreshToken = async (): Promise<boolean> => {
    const currentToken = token.value
    if (!currentToken) return false

    if (isRefreshing) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!isRefreshing) {
            clearInterval(checkInterval)
            resolve(!!token.value)
          }
        }, 100)
      })
    }

    if (isTokenExpired(currentToken)) {
      isRefreshing = true

      try {
        const success = await refreshToken()
        if (!success) {
          logout()
          return false
        }
        return true
      } finally {
        isRefreshing = false
      }
    }

    return true
  }

  const login = async (credentials: LoginCredentials) => {
    loading.value = true
    error.value = null

    try {
      const response = await authApi.login(credentials)

      // DEBUG: Log API response
      console.log('🔍 API Response:', response.data)

      if (response.data.responseCode === 0) {
        const { accessToken, user: userData, mustChangePassword } = response.data.data

        // DEBUG: Log extracted values
        console.log('🔍 Extracted from API:')
        console.log('  - accessToken:', !!accessToken)
        console.log('  - userData:', userData)
        console.log('  - mustChangePassword:', mustChangePassword)

        token.value = accessToken
        user.value = userData

        // Use image path directly from backend response
        if (userData.image) {
          // In dev mode, use relative URL as-is (goes through Vite proxy)
          // In production, prepend base URL if needed
          const avatarUrl = import.meta.env.DEV
            ? userData.image // Use relative URL in dev (goes through Vite proxy)
            : import.meta.env.VITE_API_BASE_URL && !userData.image.startsWith('http')
              ? `${import.meta.env.VITE_API_BASE_URL}${userData.image}`
              : userData.image
          userAvatar.value = avatarUrl
          localStorage.setItem('user_avatar', avatarUrl)
        } else {
          // Clear avatar if backend doesn't provide image
          userAvatar.value = null
          localStorage.removeItem('user_avatar')
        }

        localStorage.setItem('auth_token', accessToken)

        // Propagate mustChangePassword flag so caller can redirect user
        const returnValue = { success: true, mustChangePassword: !!mustChangePassword }
        console.log('🔍 Returning from login():', returnValue)
        return returnValue
      } else {
        // Handle failed login response from API
        const apiError = {
          responseCode: response.data.responseCode ?? 1,
          responseMessage: response.data.responseMessage ?? 'Unknown error',
          errorCode: response.data.errorCode ?? ErrorCode.INTERNAL_SERVER_ERROR,
          data: response.data.data,
        }
        
        // Get error message without showing notification (view will handle notification)
        const errorMessage = getApiErrorMessage(apiError, { operation: 'login', component: 'AuthStore' })
        error.value = errorMessage
        return {
          success: false,
          error: errorMessage, // mapped fallback
          errorCode: apiError.errorCode,
          responseMessage: apiError.responseMessage, // ✅ backend message
        }
        
      }
    } catch (err: any) {
      // Handle network errors or other unexpected errors
      const errorMessage = getApiErrorMessage(err, { operation: 'login', component: 'AuthStore' })
      error.value = errorMessage

      const apiResponseMessage =
        typeof err?.response?.data?.responseMessage === 'string' ? err.response.data.responseMessage : ''

      const apiErrorCode =
        typeof err?.response?.data?.errorCode === 'number' ? err.response.data.errorCode : ErrorCode.INTERNAL_SERVER_ERROR

      return {
        success: false,
        error: errorMessage,               // mapped fallback
        errorCode: apiErrorCode,
        responseMessage: apiResponseMessage, // ✅ backend message (if any)
      }

    } finally {
      loading.value = false
    }
  }

  const refreshToken = async (): Promise<boolean> => {
    return false
  }

  const isTokenExpired = (tokenString: string): boolean => {
    try {
      const payload = JSON.parse(atob(tokenString.split('.')[1]))
      const now = Math.floor(Date.now() / 1000)
      const expirationTime = payload.exp

      if (!expirationTime) {
        return false
      }

      const bufferTime = 5 * 60
      return expirationTime < now + bufferTime
    } catch (error) {
      return true
    }
  }

  const register = async (userData: RegisterCredentials) => {
    loading.value = true
    error.value = null

    try {
      const response = await authApi.register(userData)
      if (response.data.responseCode === 0) {
        const { accessToken, user: newUserData } = response.data.data

        token.value = accessToken
        user.value = newUserData
        localStorage.setItem('auth_token', accessToken)
        showSuccess('Registration successful!', { operation: 'register' })

        return { success: true, data: response.data }
      } else {
        const errorMessage = response.data.responseMessage || 'Registration failed'
        error.value = errorMessage
        return { success: false, error: errorMessage }
      }
    } catch (err: any) {
      const errorMessage = handleApiError(err, {
        operation: 'register',
        component: 'AuthStore',
      })
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    user.value = null
    token.value = null
    userAvatar.value = null
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    localStorage.removeItem('user_avatar')
  }

  const updateUserAvatar = (avatarUrl: string | null) => {
    userAvatar.value = avatarUrl
  }

  const clearError = () => {
    error.value = null
  }

  const resetAuthState = () => {
    error.value = null
    loading.value = false
    throw Error('Auth state reset')
  }

  const initializeAuth = async () => {
    const storedToken = localStorage.getItem('auth_token')

    if (!storedToken) {
      token.value = null
      user.value = null
      return
    }

    try {
      const payload = JSON.parse(atob(storedToken.split('.')[1]))

      if (storedToken.includes('mock-signature')) {
        localStorage.removeItem('auth_token')
        token.value = null
        user.value = null
        return
      }

      const now = Math.floor(Date.now() / 1000)
      if (payload.exp && payload.exp < now) {
        localStorage.removeItem('auth_token')
        token.value = null
        user.value = null
        return
      }

      if (!user.value || !token.value) {
        // Get avatar from localStorage if available
        const storedAvatar = localStorage.getItem('user_avatar')
        user.value = {
          id: parseInt(payload.sub),
          username: payload.username,
          role: payload.role,
          displayName: payload.username,
          image: storedAvatar || null,
          mustChangePassword: payload.mustChangePassword || false,
        }
        token.value = storedToken
        if (storedAvatar) {
          userAvatar.value = storedAvatar
        }
      }
    } catch (error) {
      localStorage.removeItem('auth_token')
      token.value = null
      user.value = null
    }
  }

  const hasRole = (role: UserRole) => {
    return user.value?.role === role
  }

  const isAdmin = computed(() => user.value?.role === 'ADMINISTRATOR')
  const isApproval = computed(() => hasRole(UserRole.APPROVAL))
  const isEditor = computed(() => hasRole(UserRole.EDITOR))
  const isViewOnly = computed(() => hasRole(UserRole.VIEW_ONLY))

  // Permission helpers
  const permissions = computed(() => {
    return getPermissions(user.value?.role)
  })

  return {
    user,
    token,
    loading,
    error,
    userAvatar,
    isAuthenticated,
    isAdmin,
    isApproval,
    isEditor,
    isViewOnly,
    permissions,
    login,
    register,
    logout,
    clearError,
    resetAuthState,
    hasRole,
    initializeAuth,
    refreshToken,
    isTokenExpired,
    checkAndRefreshToken,
    updateUserAvatar,
  }
})
