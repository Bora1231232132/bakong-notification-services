import { api } from './api'
import { UserRole } from '@bakong/shared'

export interface User {
  id: number
  name: string // Backend returns 'name' (mapped from displayName)
  email: string // Backend returns 'email' (mapped from username)
  phoneNumber: string
  role: UserRole
  status: string
  imageId?: string
  createdAt: string | Date
  updatedAt?: string | Date
}

export interface UserFilters {
  page?: number
  pageSize?: number
  search?: string
  role?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CreateUserData {
  username: string
  email: string
  displayName: string
  password: string
  role: UserRole
  phoneNumber: string
}

export interface UpdateUserData {
  email?: string
  displayName?: string
  password?: string
  role?: UserRole
  phoneNumber?: string
  status?: string // UserStatus: 'ACTIVE' or 'DEACTIVATED'
}

export const userApi = {
  async getAllUsers(filters: UserFilters = {}): Promise<PaginatedResponse<User>> {
    try {
      const token = localStorage.getItem('auth_token')

      if (!token) {
        throw new Error('Authentication required')
      }

      try {
        // Call the correct endpoint: /api/v1/user
        const response = await api.get('/api/v1/user', {
          params: {
            page: filters.page || 1,
            size: filters.pageSize || 10, // Backend uses 'size' not 'pageSize'
            search: filters.search,
            role: filters.role,
          },
        })

        // Backend response format: { responseCode: 0, data: { users: [...], pagination: {...} } }
        if (response.data && response.data.responseCode === 0 && response.data.data) {
          const responseData = response.data.data
          const users = responseData.users || []
          const pagination = responseData.pagination || {}

          return {
            data: users,
            total: pagination.total || users.length,
            page: pagination.page || filters.page || 1,
            pageSize: pagination.size || filters.pageSize || 10,
            totalPages:
              pagination.totalPages ||
              Math.ceil(
                (pagination.total || users.length) / (pagination.size || filters.pageSize || 10),
              ),
          }
        }

        throw new Error('Invalid response format from backend')
      } catch (apiError: any) {
        throw apiError
      }
    } catch (error: any) {
      throw error
    }
  },

  async getUserById(userId: number): Promise<User | null> {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('Authentication required')
      }

      try {
        // Call the correct endpoint: /api/v1/user/:id
        const response = await api.get(`/api/v1/user/${userId}`)

        // Backend response format: { responseCode: 0, data: { id, name, email, ... } }
        if (response.data && response.data.responseCode === 0 && response.data.data) {
          return response.data.data
        }

        return null
      } catch (apiError: any) {
        throw apiError
      }
    } catch (error: any) {
      throw error
    }
  },

  async createUser(userData: CreateUserData): Promise<boolean> {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('Authentication required. Please login again.')
      }

      try {
        const response = await api.post('/api/v1/user', userData)

        if (response.data && response.data.responseCode === 0) {
          return true
        }

        return false
      } catch (apiError: any) {
        // Re-throw to let the caller handle the error
        throw apiError
      }
    } catch (error: any) {
      throw error
    }
  },

  async updateUser(userId: number, userData: UpdateUserData): Promise<boolean> {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('Authentication required. Please login again.')
      }

      try {
        const response = await api.put(`/api/v1/user/${userId}`, userData)

        if (response.data && response.data.responseCode === 0) {
          return true
        }

        return false
      } catch (apiError: any) {
        // Re-throw to let the caller handle the error
        throw apiError
      }
    } catch (error: any) {
      throw error
    }
  },

  async deleteUser(userId: number): Promise<boolean> {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        return true
      }

      try {
        const response = await api.delete(`/api/v1/user/${userId}`)

        return response.status === 200 || response.status === 204
      } catch (apiError: any) {
        return false
      }
    } catch (error: any) {
      return false
    }
  },

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('Authentication required. Please login again.')
      }

      // Validate token before making request
      try {
        const tokenParts = token.split('.')
        if (tokenParts.length !== 3) {
          throw new Error('Invalid token format. Please login again.')
        }

        const payload = JSON.parse(atob(tokenParts[1]))
        const now = Math.floor(Date.now() / 1000)

        if (payload.exp && payload.exp < now) {
          throw new Error('Your session has expired. Please login again.')
        }
      } catch (tokenError: any) {
        // If token validation fails, clear it and throw error
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
        throw new Error(tokenError.message || 'Invalid token. Please login again.')
      }

      try {
        const response = await api.put('/api/v1/auth/change-password', {
          currentPassword,
          newPassword,
        })

        if (response.data && response.data.responseCode === 0) {
          return {
            success: true,
            message: response.data.responseMessage || 'Password changed successfully',
          }
        }

        return {
          success: false,
          message: response.data?.responseMessage || 'Failed to change password',
        }
      } catch (apiError: any) {
        // Handle validation errors (400) and auth errors (401) differently
        const errorData = apiError.response?.data
        const errorMessage =
          errorData?.responseMessage ||
          errorData?.message ||
          apiError.message ||
          'Failed to change password'

        // If it's a 401 and the error message indicates auth failure, throw auth error
        if (apiError.response?.status === 401) {
          if (
            errorMessage.toLowerCase().includes('authentication') ||
            errorMessage.toLowerCase().includes('login') ||
            errorMessage.toLowerCase().includes('token') ||
            errorMessage.toLowerCase().includes('expired')
          ) {
            throw new Error('Authentication failed. Please login again.')
          }
        }

        // For validation errors (400) or other errors, throw with the specific message
        throw new Error(errorMessage)
      }
    } catch (error: any) {
      throw error
    }
  },

  async setupInitialPassword(
    userId: number,
    newPassword: string,
    confirmNewPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post('/api/v1/auth/setup-initial-password', {
        userId,
        newPassword,
        confirmNewPassword,
      })

      if (response.data && response.data.responseCode === 0) {
        return {
          success: true,
          message: response.data.responseMessage || 'Password set successfully',
        }
      }

      return {
        success: false,
        message: response.data?.responseMessage || 'Failed to set password',
      }
    } catch (apiError: any) {
      const errorData = apiError.response?.data
      const errorMessage =
        errorData?.responseMessage ||
        errorData?.message ||
        apiError.message ||
        'Failed to set password'

      throw new Error(errorMessage)
    }
  },
}
