import { Transform } from 'class-transformer'
import { IsString, IsOptional, IsNumber, Min, Max, IsEnum, ValidateIf } from 'class-validator'
import { Language, Platform, BakongApp } from '@bakong/shared'
import { ValidationHelper } from 'src/common/util/validation.helper'

export class NotificationInboxDto {
  @IsString()
  accountId: string

  @IsString()
  fcmToken: string

  @IsOptional()
  @IsString()
  participantCode?: string

  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const validation = ValidationHelper.validatePlatform(value)
      return validation.isValid ? validation.normalizedValue : value
    }
    return value
  })
  platform?: Platform

  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const validation = ValidationHelper.validateLanguage(value)
      return validation.isValid ? validation.normalizedValue : value
    }
    return value
  })
  language?: Language

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value) || 1)
  page?: number = 1

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value) || 10)
  size?: number = 10

  @ValidateIf((o) => !!o.accountId)
  @IsEnum(BakongApp, {
    message:
      'bakongPlatform is required when accountId is provided. Must be one of: BAKONG, BAKONG_JUNIOR, BAKONG_TOURIST',
  })
  @Transform(({ value, obj }) => {
    // Handle typo: "bakongPlatfrom" -> "bakongPlatform"
    // If the typo field exists but bakongPlatform doesn't, use the typo value
    if (!value && obj && obj.bakongPlatfrom) {
      console.warn(
        '⚠️  Typo detected: "bakongPlatfrom" should be "bakongPlatform". Using value from typo field.',
      )
      value = obj.bakongPlatfrom
    }

    if (typeof value === 'string') {
      return ValidationHelper.normalizeEnum(value)
    }
    return value
  })
  bakongPlatform?: BakongApp
}
