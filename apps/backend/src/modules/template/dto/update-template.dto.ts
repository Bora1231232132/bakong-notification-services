import { IsString, IsOptional, IsArray, ValidateNested, IsEnum, IsBoolean } from 'class-validator'
import { Type, Transform } from 'class-transformer'
import { TemplateTranslationDto } from './template-translation.dto'
import { CategoryType, NotificationType, Platform, SendType } from '@bakong/shared'
import { ValidationHelper } from 'src/common/util/validation.helper'

export class UpdateTemplateDto {
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((platform) => ValidationHelper.normalizeEnum(platform))
    }
    return value
  })
  @IsEnum(Platform, { each: true })
  platforms: Platform[]

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateTranslationDto)
  translations: TemplateTranslationDto[]

  @IsOptional()
  @IsEnum(NotificationType)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return ValidationHelper.normalizeEnum(value)
    }
    return value
  })
  notificationType?: NotificationType

  @IsOptional()
  @IsEnum(CategoryType)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return ValidationHelper.normalizeEnum(value)
    }
    return value
  })
  categoryType?: CategoryType

  @IsOptional()
  @IsEnum(SendType)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return ValidationHelper.normalizeEnum(value)
    }
    return value
  })
  sendType?: SendType

  @IsOptional()
  @IsString()
  sendSchedule?: string

  @IsOptional()
  @IsBoolean()
  isSent?: boolean
}
