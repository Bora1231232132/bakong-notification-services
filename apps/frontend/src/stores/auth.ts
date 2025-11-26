import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { authApi } from '@/services/api'
import { handleApiError, getApiErrorMessage, showSuccess } from '@/services/errorHandler'
import { ErrorCode } from '@bakong/shared'

export enum UserRole {
  ADMIN_USER = 'ADMIN_USER',
  NORMAL_USER = 'NORMAL_USER',
  API_USER = 'API_USER',
}

export interface User {
  id: number
  username: string
  email?: string
  displayName: string
  role: UserRole
}

export interface LoginCredentials {
  username: string
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

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  watch(token, (newToken) => {
    if (newToken) {
      localStorage.setItem('auth_token', newToken)
    } else {
      localStorage.removeItem('auth_token')
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

      if (response.data.responseCode === 0) {
        const { accessToken, user: userData } = response.data.data

        token.value = accessToken
        user.value = userData

        localStorage.setItem('auth_token', accessToken)

        return { success: true }
      } else {
        // Use error handler to get the correct message based on errorCode (without showing notification)
        const apiError = {
          responseCode: response.data.responseCode ?? 1,
          responseMessage: response.data.responseMessage ?? 'Unknown error',
          errorCode: response.data.errorCode ?? ErrorCode.INTERNAL_SERVER_ERROR,
          data: response.data.data,
        }
        const errorMessage = getApiErrorMessage(
          { response: { data: apiError } },
          { operation: 'login', component: 'AuthStore' },
        )
        error.value = errorMessage
        return { success: false, error: errorMessage }
      }
    } catch (err: any) {
      const errorMessage = handleApiError(err, {
        operation: 'login',
        component: 'AuthStore',
      })
      error.value = errorMessage
      return { success: false, error: errorMessage }
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
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
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
        user.value = {
          id: parseInt(payload.sub),
          username: payload.username,
          role: payload.role,
          displayName: payload.username,
        }
        token.value = storedToken
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

  const isAdmin = computed(() => hasRole(UserRole.ADMIN_USER))
  const isNormalUser = computed(() => hasRole(UserRole.NORMAL_USER))
  const isApiUser = computed(() => hasRole(UserRole.API_USER))

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    isNormalUser,
    isApiUser,
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
  }
})
