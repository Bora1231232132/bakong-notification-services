import {
  IsNotEmpty,
  IsString,
  IsInt,
  Min,
  MinLength,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
} from 'class-validator'

@ValidatorConstraint({ name: 'MatchPassword', async: false })
export class MatchPasswordConstraint implements ValidatorConstraintInterface {
  validate(confirmNewPassword: string, args: ValidationArguments) {
    const obj = args.object as SetupInitialPasswordDto
    return confirmNewPassword === obj.newPassword
  }

  defaultMessage(_args: ValidationArguments) {
    return 'New password and confirm new password do not match'
  }
}

export class SetupInitialPasswordDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  userId: number

  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword: string

  @IsNotEmpty({ message: 'Confirm new password is required' })
  @IsString({ message: 'Confirm new password must be a string' })
  @MinLength(8, { message: 'Confirm new password must be at least 8 characters long' })
  @Validate(MatchPasswordConstraint)
  confirmNewPassword: string
}
