import { IsNotEmpty, IsString, IsEnum, IsOptional, IsEmail, Length, Matches } from 'class-validator'
import { UserRole, UserStatus } from '@bakong/shared'

export class UpdateUserDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole

  @IsOptional()
  @IsString()
  @Length(3, 255, { message: 'Username must be between 3 and 255 characters' })
  username?: string

  @IsNotEmpty()
  @IsEnum(UserStatus)
  status: UserStatus

  @IsOptional()
  @IsString()
  displayName?: string

  @IsNotEmpty()
  @IsString()
  @Length(10, 20)
  @Matches(/^[+]?[0-9\s\-().]{10,20}$/, {
    message: 'Phone number must be in a valid format',
  })
  phoneNumber: string
}
