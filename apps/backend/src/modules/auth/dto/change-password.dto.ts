import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator'

/**
 * DTO for password change requests
 *
 * Security Requirements:
 * - Current password: Required to verify user identity
 * - New password: Minimum 6 characters, maximum 128 characters
 */
export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Current password is required' })
  @IsString({ message: 'Current password must be a string' })
  currentPassword: string

  @IsNotEmpty({ message: 'New password is required' })
  @IsString({ message: 'New password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  newPassword: string
}
