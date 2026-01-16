import { IsNotEmpty, IsString, IsEnum, Matches, Length, IsEmail, IsOptional } from 'class-validator'
import { UserRole } from '@bakong/shared'

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 255)
  @Matches(/^[a-z0-9_@.]+$/, {
    message: 'Username must be lowercase with no spaces.',
  })
  username: string

  @IsNotEmpty()
  @IsString()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string

  @IsNotEmpty()
  @IsString()
  @Length(8, 255, { message: 'Password must be at least 8 characters long' })
  password: string // Required - Administrator must provide password when creating user

  @IsOptional()
  @IsString()
  displayName?: string

  @IsNotEmpty()
  @IsEnum(UserRole)
  role: UserRole

  @IsNotEmpty()
  @IsString()
  @Length(10, 20)
  @Matches(/^[+]?[0-9\s\-().]{10,20}$/, {
    message: 'Phone number must be in a valid format',
  })
  phoneNumber: string
}
