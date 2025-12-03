import { api, uploadApi } from './api'

export interface CategoryType {
  id: number
  name: string
  icon?: string // Base64 data URL (data:image/png;base64,...)
  mimeType?: string
  originalFileName?: string
  createdAt: string
  updatedAt?: string
}

export interface CategoryTypeResponse {
  responseCode: number
  responseMessage: string
  errorCode: number
  data: CategoryType[]
}

export const categoryTypeApi = {
  async getAll(): Promise<CategoryType[]> {
    try {
      const response = await api.get<CategoryTypeResponse>('/api/v1/category-type')
      return response.data.data || []
    } catch (error) {
      console.error('Error fetching category types:', error)
      throw error
    }
  },

  async getById(id: number): Promise<CategoryType> {
    try {
      const response = await api.get<{
        responseCode: number
        responseMessage: string
        errorCode: number
        data: CategoryType
      }>(`/api/v1/category-type/${id}`)
      return response.data.data
    } catch (error) {
      console.error('Error fetching category type:', error)
      throw error
    }
  },

  async getIcon(id: number): Promise<string> {
    try {
      const response = await api.get(`/api/v1/category-type/${id}/icon`, {
        responseType: 'blob',
      })
      return URL.createObjectURL(response.data)
    } catch (error) {
      console.error('Error fetching category type icon:', error)
      throw error
    }
  },

  async create(name: string, iconFile: File): Promise<CategoryType> {
    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('icon', iconFile)

      const response = await uploadApi.post<{
        responseCode: number
        responseMessage: string
        errorCode: number
        data: CategoryType
      }>('/api/v1/category-type', formData)
      return response.data.data
    } catch (error) {
      console.error('Error creating category type:', error)
      throw error
    }
  },

  async update(id: number, name?: string, iconFile?: File): Promise<CategoryType> {
    try {
      const formData = new FormData()
      if (name) {
        formData.append('name', name)
      }
      if (iconFile) {
        formData.append('icon', iconFile)
      }

      const response = await uploadApi.put<{
        responseCode: number
        responseMessage: string
        errorCode: number
        data: CategoryType
      }>(`/api/v1/category-type/${id}`, formData)
      return response.data.data
    } catch (error) {
      console.error('Error updating category type:', error)
      throw error
    }
  },

  async delete(id: number): Promise<void> {
    try {
      await api.delete(`/api/v1/category-type/${id}`)
    } catch (error) {
      console.error('Error deleting category type:', error)
      throw error
    }
  },
}
