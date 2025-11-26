import { api } from './api'

export interface User {
  id: number
  username: string
  displayName: string
  role: 'ADMIN_USER' | 'NORMAL_USER' | 'API_USER'
  failLoginAttempt: number
  createdAt: string
  updatedAt?: string
  deletedAt?: string
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
  displayName: string
  password: string
  role: 'ADMIN_USER' | 'NORMAL_USER' | 'API_USER'
}

export interface UpdateUserData {
  username?: string
  displayName?: string
  password?: string
  role?: 'ADMIN_USER' | 'NORMAL_USER' | 'API_USER'
}

export const userApi = {
  async getAllUsers(filters: UserFilters = {}): Promise<PaginatedResponse<User>> {
    try {
      const token = localStorage.getItem('auth_token')

      if (!token) {
        throw new Error('Authentication required')
      }

      try {
        const response = await api.get('/auth/users', {
          params: {
            page: filters.page || 1,
            pageSize: filters.pageSize || 10,
            search: filters.search,
            role: filters.role,
          },
        })

        let users = []
        if (response.data && Array.isArray(response.data)) {
          users = response.data
        } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
          users = response.data.data
        } else if (response.data && response.data.users && Array.isArray(response.data.users)) {
          users = response.data.users
        } else {
          throw new Error('Invalid response format from backend')
        }

        let filteredUsers = users

        if (filters.search) {
          const searchLower = filters.search.toLowerCase()
          filteredUsers = filteredUsers.filter(
            (user: any) =>
              user.username.toLowerCase().includes(searchLower) ||
              user.displayName.toLowerCase().includes(searchLower) ||
              user.role.toLowerCase().includes(searchLower),
          )
        }

        if (filters.role) {
          filteredUsers = filteredUsers.filter((user: any) => user.role === filters.role)
        }

        filteredUsers.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt).getTime()
          const dateB = new Date(b.createdAt).getTime()
          return dateB - dateA
        })

        const page = filters.page || 1
        const pageSize = filters.pageSize || 10
        const startIndex = (page - 1) * pageSize
        const endIndex = startIndex + pageSize
        const paginatedData = filteredUsers.slice(startIndex, endIndex)

        return {
          data: paginatedData,
          total: filteredUsers.length,
          page,
          pageSize,
          totalPages: Math.ceil(filteredUsers.length / pageSize),
        }
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
        const response = await api.get(`/auth/users/${userId}`)

        return response.data.data || response.data || null
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
        return true
      }

      try {
        const response = await api.post('/api/v1/user/create', userData)

        return response.status === 200 || response.status === 201
      } catch (apiError: any) {
        return false
      }
    } catch (error: any) {
      return false
    }
  },

  async updateUser(userId: number, userData: UpdateUserData): Promise<boolean> {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        return true
      }

      try {
        const response = await api.put(`/api/v1/user/${userId}`, userData)

        return response.status === 200
      } catch (apiError: any) {
        return false
      }
    } catch (error: any) {
      return false
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
}
