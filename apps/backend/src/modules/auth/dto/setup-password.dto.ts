import { IsNotEmpty, IsString, IsInt, Min, MinLength } from 'class-validator'

export class SetupPasswordDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  userId: number

  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword: string
}
