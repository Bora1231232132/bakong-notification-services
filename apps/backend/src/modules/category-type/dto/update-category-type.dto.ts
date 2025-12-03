import { IsOptional, IsString } from 'class-validator'

export class UpdateCategoryTypeDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  icon?: Buffer

  @IsOptional()
  @IsString()
  mimeType?: string

  @IsOptional()
  @IsString()
  originalFileName?: string
}

