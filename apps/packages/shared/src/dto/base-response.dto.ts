export interface BaseResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: string
  timestamp: string
}

export interface PaginatedResponse<T = any> extends BaseResponse<T[]> {
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface ApiError {
  statusCode: number
  message: string | string[]
  error: string
  timestamp: string
  path: string
}
