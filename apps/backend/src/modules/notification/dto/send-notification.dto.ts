import { Transform, Type } from 'class-transformer'
import { IsEnum, IsOptional, IsString, IsNumber, IsArray, ValidateNested } from 'class-validator'
import { CategoryType, Language, NotificationType, Platform } from '@bakong/shared'
import { ValidationHelper } from 'src/common/util/validation.helper'

export default class SentNotificationDto {
  @IsOptional()
  @IsString()
  accountId?: string

  @IsOptional()
  @IsString()
  fcmToken?: string

  @IsOptional()
  @IsString()
  topic?: string

  @IsOptional()
  @IsString()
  imageUrl?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  translations?: Array<any>

  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform

  @IsString()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const validation = ValidationHelper.validateLanguage(value)
      return validation.isValid ? validation.normalizedValue : value
    }
    return value
  })
  @IsEnum(Language, { message: 'Language must be one of: EN, KM, JP' })
  language: Language

  @IsOptional()
  @IsNumber()
  templateId?: number

  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const validation = ValidationHelper.validateNotificationType(value)
      return validation.isValid ? validation.normalizedValue : value
    }
    return value
  })
  @IsEnum(NotificationType, {
    message:
      'NotificationType must be a valid notification type : FLASH_NOTIFICATION, ANNOUNCEMENT, NOTIFICATION',
  })
  notificationType?: NotificationType

  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const validation = ValidationHelper.validateCategoryType(value)
      return validation.isValid ? validation.normalizedValue : value
    }
    return value
  })
  @IsEnum(CategoryType, {
    message: 'CategoryType must be a valid category type : EVENT, PRODUCT_AND_FEATURE, NEWS, OTHER',
  })
  categoryType?: CategoryType

  @IsOptional()
  @IsNumber()
  notificationId?: number
}

export class FlashNotificationDto {
  @IsString()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const validation = ValidationHelper.validateLanguage(value)
      return validation.isValid ? validation.normalizedValue : value
    }
    return value
  })
  @IsEnum(Language, { message: 'Language must be one of: EN, KM, JP' })
  language: Language
}
