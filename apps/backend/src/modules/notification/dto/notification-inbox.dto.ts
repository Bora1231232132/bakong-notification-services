import { Transform } from 'class-transformer'
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator'
import { Language, Platform } from '@bakong/shared'
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
}
