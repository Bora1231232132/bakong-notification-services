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
}
