import { IsEnum, IsNotEmpty, IsString } from 'class-validator'
import { UserRole } from '@bakong/shared'

export class RegisterDto {
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
