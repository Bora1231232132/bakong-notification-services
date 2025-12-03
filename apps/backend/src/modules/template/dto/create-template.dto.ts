import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsUUID,
} from 'class-validator'
import { Type, Transform } from 'class-transformer'
import { SendType } from '@bakong/shared'
import { TemplateTranslationDto } from './template-translation.dto'
import { CategoryType, NotificationType, Platform, BakongApp } from '@bakong/shared'
import { ValidationHelper } from 'src/common/util/validation.helper'

export class SendIntervalDto {
  @IsString()
  @IsNotEmpty()
  cron: string

  @IsString()
  @IsNotEmpty()
  startAt: string

  @IsString()
  @IsNotEmpty()
  endAt: string
}

export class CreateTemplateDto {
  @IsString()
  @IsOptional()
  @IsUUID()
  imageId?: string

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

  @IsNotEmpty()
  @IsEnum(SendType)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return ValidationHelper.normalizeEnum(value)
    }
    return value
  })
  sendType: SendType

  @IsOptional()
  @ValidateNested()
  @Type(() => SendIntervalDto)
  sendInterval?: SendIntervalDto

  @IsBoolean()
  @IsOptional()
  isSent: boolean

  @IsOptional()
  @IsString()
  sendSchedule?: string

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
  @IsNumber()
  priority?: number

  @IsOptional()
  @IsEnum(BakongApp)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return ValidationHelper.normalizeEnum(value)
    }
    return value
  })
  bakongPlatform?: BakongApp

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return 1 // Default: 1 per day
    const num = Number(value)
    return isNaN(num) ? 1 : Math.max(1, Math.min(10, num)) // Clamp between 1-10
  })
  showPerDay?: number

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return 1 // Default: 1 day
    const num = Number(value)
    return isNaN(num) ? 1 : Math.max(1, Math.min(30, num)) // Clamp between 1-30
  })
  maxDayShowing?: number
}
