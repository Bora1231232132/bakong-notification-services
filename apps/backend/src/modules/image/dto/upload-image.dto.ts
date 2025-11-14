import { IsNotEmpty, IsString, IsOptional } from 'class-validator'

export class UploadImageDto {
  @IsNotEmpty()
  @IsString()
  file: Buffer

  @IsNotEmpty()
  @IsString()
  mimeType: string

  @IsOptional()
  @IsString()
  originalFileName: string
}
