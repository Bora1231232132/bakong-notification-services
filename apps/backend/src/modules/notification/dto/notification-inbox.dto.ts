import { Transform } from 'class-transformer'
import { IsString, IsOptional, IsNumber, Min, Max, IsEnum, IsNotEmpty } from 'class-validator'
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

  @IsNotEmpty({
    message: 'bakongPlatform is required. Must be one of: BAKONG, BAKONG_JUNIOR, BAKONG_TOURIST',
  })
  @IsEnum(BakongApp, {
    message: 'bakongPlatform must be one of: BAKONG, BAKONG_JUNIOR, BAKONG_TOURIST',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return ValidationHelper.normalizeEnum(value)
    }
    return value
  })
  bakongPlatform: BakongApp
}
