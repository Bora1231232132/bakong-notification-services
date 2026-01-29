import { IsOptional, IsNumber, Min, Max, IsString, IsEnum, IsIn } from 'class-validator'
import { Type } from 'class-transformer'
import { UserStatus, UserRole } from '@bakong/shared'

export class GetUsersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  size?: number = 10

  @IsOptional()
  @IsString()
  @IsIn(['name', 'email', 'status', 'role', 'createdAt'])
  sortBy?: string = 'createdAt'

  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC'

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole
}
