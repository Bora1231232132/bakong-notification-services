import { UserRole } from '../enums/user-role.enum'

export interface User {
  id: number
  username: string
  email?: string
  displayName: string
  role: UserRole
  createdAt?: Date
  updatedAt?: Date
}

export interface UserCreateRequest {
  username: string
  email?: string
  displayName: string
  password: string
  role?: UserRole
}

export interface UserUpdateRequest {
  username?: string
  email?: string
  displayName?: string
  role?: UserRole
}

export interface UserLoginRequest {
  username: string
  password: string
}

export interface UserLoginResponse {
  user: User
  token: string
  expiresIn: string
}

export interface AuthResponse {
  success: boolean
  message: string
  data?: UserLoginResponse
}
