import { GetUserResponseDto } from './get-user-response.dto'
import { PaginationMeta } from '@bakong/shared'

export interface GetUsersResponseDto {
  users: GetUserResponseDto[]
  pagination: PaginationMeta
}
