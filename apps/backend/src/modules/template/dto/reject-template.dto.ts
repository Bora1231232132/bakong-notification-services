import { IsString, IsNotEmpty, MaxLength } from 'class-validator'

export class RejectTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reasonForRejection: string
}
