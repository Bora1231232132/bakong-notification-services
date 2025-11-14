import { Language } from '../enums/language.enum'

export interface Template {
  id: number
  name: string
  content: string
  language: Language
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface TemplateCreateRequest {
  name: string
  content: string
  language: Language
  isActive?: boolean
}

export interface TemplateUpdateRequest {
  name?: string
  content?: string
  language?: Language
  isActive?: boolean
}

export interface TemplateTranslation {
  id: number
  templateId: number
  language: Language
  content: string
  createdAt?: Date
  updatedAt?: Date
}
