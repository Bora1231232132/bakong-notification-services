import { UserRole, UserStatus } from '@bakong/shared'

export class GetUserResponseDto {
  id: number

  role: UserRole

  name: string // mapped from displayName

  email: string // mapped from username

  phoneNumber: string

  status: UserStatus

  imageId?: string

  createdAt: Date

  updatedAt?: Date
}
