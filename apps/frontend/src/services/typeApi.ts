import { api } from './api'

export interface Template {
  id: number
  title: string
  content: string
  image?: string
  sendType: string
  createdAt: string
  updatedAt: string
  translations?: Array<{
    title: string
    content: string
  }>
}

export const typeApi = {
  async getTemplateById(id: number): Promise<Template> {
    try {
      const response = await api.get(`/api/v1/template/${id}`)
      return response.data
    } catch (error) {
      console.error('Error fetching template:', error)
      throw error
    }
  },

  async deleteTemplate(id: number): Promise<boolean> {
    try {
      await api.delete(`/api/v1/template/${id}`)
      return true
    } catch (error) {
      console.error('Error deleting template:', error)
      throw error
    }
  },
}
