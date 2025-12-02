import { IsNotEmpty, IsString, IsOptional } from 'class-validator'

export class CreateCategoryTypeDto {
  @IsNotEmpty()
  @IsString()
  name: string

  @IsNotEmpty()
  icon: Buffer

  @IsOptional()
  @IsString()
  mimeType?: string

  @IsOptional()
  @IsString()
  originalFileName?: string
}
