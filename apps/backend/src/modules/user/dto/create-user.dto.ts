import { IsNotEmpty, IsString, IsEnum } from 'class-validator'
import { UserRole } from '@bakong/shared'

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  username: string

  @IsNotEmpty()
  @IsString()
  password: string

  @IsNotEmpty()
  @IsString()
  displayName: string

  @IsNotEmpty()
  @IsEnum(UserRole)
  role: UserRole
}
