import { UserRole } from '@/stores/auth'

export interface IRequestRegister {
  username: string
  password: string
  displayName: string
  role: UserRole
}

export interface IRegisterResponse {
  accessToken: string
  user: {
    id: string
    username: string
    displayName: string
    role: UserRole
  }
}

export interface IRegisterFormData {
  username: string
  password: string
  confirmPassword: string
  displayName: string
  role: UserRole
}
