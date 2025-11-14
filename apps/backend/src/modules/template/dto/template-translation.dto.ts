import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  Matches,
  IsUrl,
  ValidateIf,
} from 'class-validator'
import { Transform } from 'class-transformer'
import { Language } from '@bakong/shared'

export class TemplateTranslationDto {
  @IsNotEmpty()
  @IsEnum(Language)
  language: Language

  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') {
      return undefined
    }
    return String(value)
  })
  @IsOptional()
  title?: string

  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') {
      return undefined
    }
    return String(value)
  })
  @IsOptional()
  content?: string

  @Transform(({ value }) => {
    if (value === null || value === undefined) {
      return undefined
    }
    if (value === '') {
      return ''
    }
    return String(value)
  })
  @IsOptional()
  @ValidateIf((o, value) => value !== undefined && value !== null && value !== '')
  @IsString()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, {
    message: 'Image must be get correct value in database.',
  })
  image?: string

  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') {
      return undefined
    }
    return String(value)
  })
  @ValidateIf((o, value) => value !== undefined && value !== null && value !== '')
  @IsUrl(
    { require_protocol: true },
    { message: 'linkPreview must be a valid URL with http(s):// scheme' },
  )
  linkPreview?: string
}
