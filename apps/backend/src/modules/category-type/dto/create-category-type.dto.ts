import { IsNotEmpty, IsString, IsOptional } from 'class-validator'

export class CreateCategoryTypeDto {
  @IsNotEmpty()
  @IsString()
  name: string

  @IsOptional()
  @IsString()
  namekh?: string

  @IsOptional()
  @IsString()
  namejp?: string

  @IsNotEmpty()
  icon: Buffer

  @IsOptional()
  @IsString()
  mimeType?: string

  @IsOptional()
  @IsString()
  originalFileName?: string
}
