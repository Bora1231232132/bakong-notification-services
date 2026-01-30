import { Transform, Type } from 'class-transformer'
import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  ValidateIf,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator'
import { Language, NotificationType, Platform, BakongApp } from '@bakong/shared'
import { ValidationHelper } from 'src/common/util/validation.helper'

// Custom validator for string or array of strings
function IsStringOrStringArray(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStringOrStringArray',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (value === undefined || value === null) return true // Optional field
          if (typeof value === 'string') return true
          if (Array.isArray(value)) {
            return value.every((item) => typeof item === 'string')
          }
          return false
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a string or an array of strings`
        },
      },
    })
  }
}

export default class SentNotificationDto {
  @IsOptional()
  @Transform(({ value }) => {
    // Accept both string and array, normalize for internal use
    if (Array.isArray(value)) {
      return value.map((v) => String(v).trim()).filter(Boolean)
    }
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
    return value
  })
  @IsStringOrStringArray()
  accountId?: string | string[]

  @IsOptional()
  @IsString()
  fcmToken?: string

  @IsOptional()
  @IsString()
  participantCode?: string

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

  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const validation = ValidationHelper.validateLanguage(value)
      return validation.isValid ? validation.normalizedValue : value
    }
    return value
  })
  // Allow any string here and let service logic decide/coerce for special platforms
  language?: string

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
  categoryType?: string

  @IsOptional()
  @IsNumber()
  notificationId?: number

  @IsOptional()
  @IsEnum(BakongApp, {
    message: 'bakongPlatform must be one of: BAKONG, BAKONG_JUNIOR, BAKONG_TOURIST',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return ValidationHelper.normalizeEnum(value)
    }
    return value
  })
  bakongPlatform?: BakongApp
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
