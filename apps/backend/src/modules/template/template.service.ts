import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { CronJob } from 'cron'
import moment from 'moment'
import { Image } from 'src/entities/image.entity'
import { BaseResponseDto } from 'src/common/base-response.dto'
import { Template } from 'src/entities/template.entity'
import { CategoryType } from 'src/entities/category-type.entity'
import { MoreThanOrEqual, Repository, Not, In } from 'typeorm'
import { NotificationService } from '../notification/notification.service'
import { TemplateTranslation } from 'src/entities/template-translation.entity'
import { User } from 'src/entities/user.entity'
import { UpdateTemplateDto } from './dto/update-template.dto'
import { CreateTemplateDto } from './dto/create-template.dto'
import { ImageService } from '../image/image.service'
import { PaginationUtils } from '@bakong/shared'
import {
  ErrorCode,
  ResponseMessage,
  SendType,
  NotificationType,
  TimezoneUtils,
  Language,
} from '@bakong/shared'
import { ValidationHelper } from 'src/common/util/validation.helper'

@Injectable()
export class TemplateService implements OnModuleInit {
  private readonly logger = new Logger(TemplateService.name)
  constructor(
    @InjectRepository(Template) private readonly repo: Repository<Template>,
    @InjectRepository(TemplateTranslation)
    private readonly translationRepo: Repository<TemplateTranslation>,
    @InjectRepository(Image)
    private readonly imageRepo: Repository<Image>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(CategoryType)
    private readonly categoryTypeRepo: Repository<CategoryType>,
    @Inject(forwardRef(() => NotificationService))
    public readonly notificationService: NotificationService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly imageService: ImageService,
  ) {}

  async onModuleInit() {
    await this.pickPendingSchedule()
  }

  async create(dto: CreateTemplateDto, currentUser?: any) {
    console.log('🔵 [TEMPLATE CREATE] Starting template creation:', {
      notificationType: dto.notificationType,
      sendType: dto.sendType,
      isSent: dto.isSent,
      platforms: dto.platforms,
      hasTranslations: dto.translations?.length > 0,
    })

    if (dto.imageId) {
      const image = await this.imageRepo.findOne({ where: { fileId: dto.imageId } })
      if (!image) {
        throw new BaseResponseDto({
          responseCode: 1,
          errorCode: ErrorCode.IMAGE_NOT_FOUND,
          responseMessage: ResponseMessage.IMAGE_NOT_FOUND,
        })
      }
    }

    if (dto.sendSchedule) {
      const scheduledTime = moment.utc(dto.sendSchedule)
      const now = moment.utc()

      console.log('BACKEND SCHEDULE DEBUG:', {
        providedSchedule: dto.sendSchedule,
        sendType: dto.sendType,
        isSent: dto.isSent,
        scheduledTime: scheduledTime.format(),
        currentTime: now.format(),
        isScheduledTimeValid: scheduledTime.isValid(),
        isScheduledTimeInFuture: scheduledTime.isAfter(now),
        timeDifference: scheduledTime.diff(now, 'minutes'),
      })

      if (!scheduledTime.isValid()) {
        throw new BaseResponseDto({
          errorCode: ErrorCode.VALIDATION_FAILED,
          responseMessage: 'Invalid sendSchedule date format',
          data: {
            providedDate: dto.sendSchedule,
            expectedFormat: 'ISO 8601 format (e.g., 2025-10-06T09:30:00)',
          },
        })
      }

      if (scheduledTime.isBefore(now)) {
        throw new BaseResponseDto({
          errorCode: ErrorCode.TEMPLATE_SEND_SCHEDULE_IN_PAST,
          responseMessage: ResponseMessage.TEMPLATE_SEND_SCHEDULE_IN_PAST,
          data: {
            scheduledTime: scheduledTime.format('h:mm A MMM D, YYYY'),
            currentTime: now.format('h:mm A MMM D, YYYY'),
            timezone: 'Asia/Phnom_Penh',
          },
        })
      }
    }

    if (dto.sendType === SendType.SEND_INTERVAL && dto.sendInterval) {
      const startTime = moment(dto.sendInterval.startAt)
      const endTime = moment(dto.sendInterval.endAt)
      const now = moment()

      if (!startTime.isValid()) {
        throw new BaseResponseDto({
          errorCode: ErrorCode.VALIDATION_FAILED,
          responseMessage: 'Invalid sendInterval.startAt date format',
          data: {
            providedDate: dto.sendInterval.startAt,
            expectedFormat: 'ISO 8601 format (e.g., 2025-10-06T09:30:00)',
          },
        })
      }

      if (!endTime.isValid()) {
        throw new BaseResponseDto({
          errorCode: ErrorCode.VALIDATION_FAILED,
          responseMessage: 'Invalid sendInterval.endAt date format',
          data: {
            providedDate: dto.sendInterval.endAt,
            expectedFormat: 'ISO 8601 format (e.g., 2025-10-06T09:40:00)',
          },
        })
      }

      if (startTime.isBefore(now)) {
        throw new BaseResponseDto({
          errorCode: ErrorCode.TEMPLATE_SEND_SCHEDULE_IN_PAST,
          responseMessage: 'sendInterval.startAt cannot be in the past',
          data: {
            startTime: startTime.format('h:mm A MMM D, YYYY'),
            currentTime: now.format('h:mm A MMM D, YYYY'),
            timezone: 'Asia/Phnom_Penh',
          },
        })
      }

      if (endTime.isBefore(startTime)) {
        throw new BaseResponseDto({
          errorCode: ErrorCode.VALIDATION_FAILED,
          responseMessage: 'sendInterval.endAt must be after startAt',
          data: {
            startTime: startTime.format('h:mm A MMM D, YYYY'),
            endTime: endTime.format('h:mm A MMM D, YYYY'),
            timezone: 'Asia/Phnom_Penh',
          },
        })
      }
    }

    if (
      dto.sendType === SendType.SEND_SCHEDULE &&
      !dto.sendSchedule &&
      dto.notificationType !== NotificationType.FLASH_NOTIFICATION
    ) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.VALIDATION_FAILED,
        responseMessage: ResponseMessage.VALIDATION_FAILED,
      })
    }
    // For SEND_NOW: if isSent is explicitly false, it's a draft - don't send
    // If isSent is true or undefined, send immediately
    // For other send types, respect the isSent flag from the request
    const initialIsSent =
      dto.sendType === SendType.SEND_NOW
        ? dto.isSent !== false // Send if not explicitly false (true or undefined)
        : dto.isSent === true

    // Normalize platforms: ["IOS", "ANDROID"] -> ["ALL"]
    const normalizedPlatforms = ValidationHelper.parsePlatforms(dto.platforms)

    let template = this.repo.create({
      platforms: normalizedPlatforms,
      bakongPlatform: dto.bakongPlatform,
      sendType: dto.sendType,
      isSent: initialIsSent,
      notificationType: dto.notificationType || NotificationType.FLASH_NOTIFICATION,
      categoryTypeId: dto.categoryTypeId,
      priority: dto.priority || 0,
      sendSchedule: dto.sendSchedule ? moment.utc(dto.sendSchedule).toDate() : null,
      sendInterval: dto.sendInterval
        ? {
            ...dto.sendInterval,
            startAt: moment(dto.sendInterval.startAt).toDate(),
            endAt: moment(dto.sendInterval.endAt).toDate(),
          }
        : null,
      // Flash notification limit fields (default: 1 per day, 1 day max)
      showPerDay: dto.showPerDay !== undefined ? dto.showPerDay : 1,
      maxDayShowing: dto.maxDayShowing !== undefined ? dto.maxDayShowing : 1,

      createdBy: currentUser?.username,
      updatedBy: currentUser?.username,
    })

    template = await this.repo.save(template)
    console.log('🔵 [TEMPLATE CREATE] Template saved with ID:', template.id)

    if (dto.translations && dto.translations.length > 0) {
      const now = new Date()
      const translationsMap = new Map()
      dto.translations.forEach((t) => {
        translationsMap.set(t.language, t)
      })

      // Check if this is a draft (isSent === false)
      const isDraft = template.isSent === false

      const getFallbackValue = (field: 'title' | 'content', language: Language): string => {
        const current = translationsMap.get(language)
        if (current && current[field] && String(current[field]).trim() !== '') {
          return String(current[field])
        }

        let fallbackOrder: Language[] = []
        if (language === Language.KM) {
          fallbackOrder = [Language.EN, Language.JP]
        } else if (language === Language.EN) {
          fallbackOrder = [Language.KM, Language.JP]
        } else if (language === Language.JP) {
          fallbackOrder = [Language.KM, Language.EN]
        }

        for (const fallbackLang of fallbackOrder) {
          const fallback = translationsMap.get(fallbackLang)
          if (fallback && fallback[field] && String(fallback[field]).trim() !== '') {
            return String(fallback[field])
          }
        }
        return ''
      }

      // Only apply fallback logic for published notifications, not drafts
      if (!isDraft) {
        dto.translations.forEach((translation) => {
          if (
            translation.title === undefined ||
            translation.title === null ||
            String(translation.title).trim() === ''
          ) {
            translation.title = getFallbackValue('title', translation.language)
          }
          if (
            translation.content === undefined ||
            translation.content === null ||
            String(translation.content).trim() === ''
          ) {
            translation.content = getFallbackValue('content', translation.language)
          }
        })
      }

      // For drafts, filter translations to only include those with actual content (title, content, or image)
      // This allows saving drafts with just an image, or just title/content, or any combination
      // Note: We need to check image in the original translation object before processing
      const translationsToProcess = isDraft
        ? dto.translations.filter((t) => {
            const hasTitle = t.title && String(t.title).trim() !== ''
            const hasContent = t.content && String(t.content).trim() !== ''
            const hasImage = t.image && String(t.image).trim() !== ''
            return hasTitle || hasContent || hasImage
          })
        : dto.translations

      for (const translation of translationsToProcess) {
        const existingTranslation = await this.translationRepo.findOne({
          where: {
            templateId: template.id,
            language: translation.language,
          },
        })

        let imageId = null

        const imageValue =
          translation.image && String(translation.image).trim() !== ''
            ? String(translation.image).trim()
            : null

        if (imageValue) {
          if (template.isSent === false) {
            imageId = imageValue
          } else {
            const imageExists = await this.imageService.validateImageExists(imageValue)
            if (imageExists) {
              imageId = imageValue
            }
          }
        } else if (dto.imageId && String(dto.imageId).trim() !== '') {
          const dtoImageValue = String(dto.imageId).trim()
          if (template.isSent === false) {
            imageId = dtoImageValue
          } else {
            const imageExists = await this.imageService.validateImageExists(dtoImageValue)
            if (imageExists) {
              imageId = dtoImageValue
            }
          }
        }

        const title =
          translation.title !== undefined && translation.title !== null
            ? String(translation.title)
            : ''
        const content =
          translation.content !== undefined && translation.content !== null
            ? String(translation.content)
            : ''

        if (template.isSent !== false && (!title || !content)) {
          throw new BaseResponseDto({
            responseCode: 1,
            errorCode: ErrorCode.VALIDATION_FAILED,
            responseMessage: 'Title and content are required for published notifications',
            data: {},
          })
        }

        if (existingTranslation) {
          const needsUpdate =
            existingTranslation.title !== title ||
            existingTranslation.content !== content ||
            existingTranslation.imageId !== imageId ||
            existingTranslation.linkPreview !== (translation.linkPreview || null)

          if (needsUpdate) {
            await this.translationRepo.update(existingTranslation.id, {
              title: title,
              content: content,
              imageId: imageId,
              linkPreview: translation.linkPreview || null,
              updatedAt: now,
            })
          }
        } else {
          await this.translationRepo.save({
            templateId: template.id,
            language: translation.language,
            title: title,
            content: content,
            imageId: imageId,
            linkPreview: translation.linkPreview || null,
            createdAt: now,
            updatedAt: now,
          })
        }
      }
    }

    const templateWithRelations = await this.repo.findOne({
      where: { id: template.id },
      relations: ['translations', 'translations.image'],
    })

    if (templateWithRelations) {
      template = templateWithRelations
      console.log('🔵 [TEMPLATE CREATE] Template reloaded with relations:', {
        templateId: template.id,
        translationsCount: template.translations?.length || 0,
        hasTranslations: !!template.translations?.length,
      })
    } else {
      console.error('🔵 [TEMPLATE CREATE] ⚠️ Could not reload template with relations!')
    }

    console.log('🔵 [TEMPLATE CREATE] Ready to check sending logic:', {
      notificationType: template.notificationType,
      isFlashNotification: template.notificationType === NotificationType.FLASH_NOTIFICATION,
      sendType: template.sendType,
      isSent: template.isSent,
      hasTranslations: template.translations?.length > 0 || false,
      translationsCount: template.translations?.length || 0,
    })

    // FLASH_NOTIFICATION now sends FCM push like other notification types
    // Mobile app will display it differently (as popup/flash screen)
    if (template.notificationType === NotificationType.FLASH_NOTIFICATION) {
      console.log(
        '🔵 [TEMPLATE CREATE] FLASH_NOTIFICATION - will send FCM push (mobile displays as popup)',
      )
    }

    console.log('🔵 [TEMPLATE CREATE] SEND TYPE DEBUG:', {
      sendType: template.sendType,
      isSent: template.isSent,
      sendSchedule: template.sendSchedule,
      templateId: template.id,
    })

    // For SEND_NOW: send if isSent is true (not a draft)
    // For other send types: send if isSent is true
    const shouldAutoSend = template.isSent === true
    console.log(
      '🔵 [TEMPLATE CREATE] shouldAutoSend:',
      shouldAutoSend,
      'isSent:',
      template.isSent,
      'sendType:',
      template.sendType,
    )

    switch (template.sendType) {
      case SendType.SEND_NOW:
        // Only send if shouldAutoSend is true (not a draft)
        if (!shouldAutoSend) {
          console.log(
            '🔵 [TEMPLATE CREATE] Skipping SEND_NOW - this is a draft (isSent=false):',
            template.id,
          )
          break
        }

        console.log('🔵 [TEMPLATE CREATE] Executing SEND_NOW for template:', template.id)
        console.log('🔵 [TEMPLATE CREATE] Template has translations?', {
          hasTranslations: !!template.translations,
          translationsCount: template.translations?.length || 0,
          translations: template.translations?.map((t) => ({
            language: t.language,
            title: t.title,
          })),
        })

        const templateWithTranslations = template

        if (
          !templateWithTranslations ||
          !templateWithTranslations.translations ||
          templateWithTranslations.translations.length === 0
        ) {
          console.error('🔵 [TEMPLATE CREATE] ❌ No translations found for template:', template.id)
          console.error('🔵 [TEMPLATE CREATE] Template object:', {
            id: templateWithTranslations?.id,
            translations: templateWithTranslations?.translations,
            translationsType: typeof templateWithTranslations?.translations,
          })
          break
        }

        console.log('🔵 [TEMPLATE CREATE] ✅ Translations found, calling sendWithTemplate...')

        let sendResult: { successfulCount: number; failedCount: number; failedUsers?: string[] } = {
          successfulCount: 0,
          failedCount: 0,
          failedUsers: [],
        }
        let sendError: any = null
        let noUsersForPlatform = false
        try {
          sendResult = await this.notificationService.sendWithTemplate(templateWithTranslations)
          console.log('🔵 [TEMPLATE CREATE] sendWithTemplate returned:', sendResult)
        } catch (error: any) {
          console.error('🔵 [TEMPLATE CREATE] ❌ ERROR in sendWithTemplate:', {
            message: error?.message,
            stack: error?.stack,
            code: error?.code,
            fullError: process.env.NODE_ENV === 'development' ? error : 'Hidden in production',
          })
          sendError = error
          sendResult = { successfulCount: 0, failedCount: 0, failedUsers: [] }

          // Check if error is about no users for bakongPlatform
          if (error?.message && error.message.includes('No users found for')) {
            noUsersForPlatform = true
            console.log(
              '🔵 [TEMPLATE CREATE] ⚠️ No users found for bakongPlatform - keeping as draft',
            )
          }
        }

        // If no users found for the platform, keep as draft (don't mark as published)
        if (noUsersForPlatform) {
          console.log('📊 SEND_NOW Result: No users for platform - keeping as draft')
          console.log('📊 Template will remain as draft (isSent=false)')
          // Don't mark as published - template stays as draft
          // Update isSent to false to ensure it's a draft
          await this.repo.update(template.id, { isSent: false })
          console.log('✅ Template kept as draft due to no users for target platform')
          // Set flag to indicate saved as draft due to no users
          ;(template as any).savedAsDraftNoUsers = true
          break
        }

        console.log('📊 SEND_NOW Result:', {
          templateId: template.id,
          successfulCount: sendResult.successfulCount,
          failedCount: sendResult.failedCount,
          willMarkAsPublished: sendResult.successfulCount > 0, // Only mark as published if successfully sent
        })

        // Only mark as published if we successfully sent to at least one user
        if (sendResult.successfulCount > 0) {
          await this.markAsPublished(template.id, currentUser)
          console.log('✅ Template marked as published:', template.id)
          console.log(`✅ Successfully sent to ${sendResult.successfulCount} user(s)`)
          if (sendResult.failedCount > 0) {
            console.log(`⚠️ Failed to send to ${sendResult.failedCount} user(s)`)
            if (sendResult.failedUsers && sendResult.failedUsers.length > 0) {
              console.log('❌ Failed users:', sendResult.failedUsers)
            }
          }
        } else {
          // No users received the notification - keep as draft
          console.warn('⚠️ No notifications were sent (successfulCount = 0) - keeping as draft')
          console.warn('⚠️ This might indicate:')
          console.warn('   1. No users have FCM tokens')
          console.warn('   2. No users match the platform filter')
          console.warn('   3. FCM token validation failed')
          console.warn('   4. Firebase FCM not initialized')
          console.warn('   5. No users in database')
          await this.repo.update(template.id, { isSent: false })
          ;(template as any).savedAsDraftNoUsers = true
        }

        // Include send result in template response
        ;(template as any).successfulCount = sendResult.successfulCount
        ;(template as any).failedCount = sendResult.failedCount
        ;(template as any).failedUsers = sendResult.failedUsers || []
        break
      case SendType.SEND_SCHEDULE:
        console.log('Executing SEND_SCHEDULE for template:', template.id)

        // Validate if there are matching users before scheduling
        // If no matching users, keep as draft (isSent: false)
        if (shouldAutoSend) {
          // Only validate if trying to publish (isSent: true)
          const hasMatchingUsers = await this.validateMatchingUsers(template)
          if (!hasMatchingUsers) {
            console.log(
              '🔵 [TEMPLATE CREATE] ⚠️ No matching users found for scheduled notification - keeping as draft',
            )
            console.log('📊 SEND_SCHEDULE Result: No matching users - keeping as draft')
            console.log('📊 Template will remain as draft (isSent=false)')
            // Update isSent to false to ensure it's a draft
            await this.repo.update(template.id, { isSent: false })
            console.log('✅ Template kept as draft due to no matching users')
            // Set flag to indicate saved as draft due to no users
            ;(template as any).savedAsDraftNoUsers = true
            break
          }
        }

        this.addScheduleNotification(template)
        break
      case SendType.SEND_INTERVAL:
        console.log('Executing SEND_INTERVAL for template:', template.id)
        this.addIntervalNotification(template)
        break
      default:
        console.log('Unknown send type:', template.sendType)
    }

    await this.repo.manager.connection.queryResultCache?.clear()

    const templateWithTranslations = await this.findOneRaw(template.id)
    // Preserve the savedAsDraftNoUsers flag if it was set
    if ((template as any).savedAsDraftNoUsers) {
      ;(templateWithTranslations as any).savedAsDraftNoUsers = true
    }
    // Preserve send result properties if they were set
    if ((template as any).successfulCount !== undefined) {
      ;(templateWithTranslations as any).successfulCount = (template as any).successfulCount
      ;(templateWithTranslations as any).failedCount = (template as any).failedCount
      ;(templateWithTranslations as any).failedUsers = (template as any).failedUsers
    }
    return this.formatTemplateResponse(templateWithTranslations)
  }

  async update(id: number, dto: UpdateTemplateDto, currentUser?: any) {
    const {
      platforms,
      bakongPlatform,
      translations,
      notificationType,
      categoryTypeId,
      sendType,
      sendSchedule,
      isSent,
    } = dto
    const template = await this.findOneRaw(id)

    // If template is already sent, handle it as editing published notification
    // This includes scheduled notifications that have already been sent
    if (template.isSent) {
      // If trying to "publish" an already-sent notification (especially scheduled ones),
      // just clear the schedule and ensure it's marked as published
      if (dto.sendType === SendType.SEND_NOW && dto.isSent === true && dto.sendSchedule === null) {
        // This is a "Publish now" action on an already-sent notification
        // Just clear schedule and ensure it's published - don't resend
        await this.repo.update(id, {
          sendType: SendType.SEND_NOW,
          sendSchedule: null,
          sendInterval: null,
          isSent: true,
          updatedAt: new Date(),
        })
        const updatedTemplate = await this.findOneRaw(id)
        return this.formatTemplateResponse(updatedTemplate)
      }
      return await this.editPublishedNotification(id, dto, currentUser)
    }

    this.validateModificationTemplate(template)

    try {
      const updateFields: any = {}
      // Only update platforms if explicitly provided in the request
      // When publishing a draft, preserve existing platforms if not provided
      if (platforms !== undefined) {
        // Normalize platforms: ["IOS", "ANDROID"] -> ["ALL"]
        const normalizedPlatforms = ValidationHelper.parsePlatforms(platforms)
        console.log(`🔵 [UPDATE] Platforms explicitly provided in update request:`, {
          original: platforms,
          normalized: normalizedPlatforms,
          existing: template.platforms,
        })
        updateFields.platforms = normalizedPlatforms
      } else {
        console.log(
          `🔵 [UPDATE] Platforms NOT provided in update request - preserving existing:`,
          template.platforms,
        )
        // Preserve existing platforms - don't update this field
      }
      if (bakongPlatform !== undefined) updateFields.bakongPlatform = bakongPlatform
      if (notificationType !== undefined) updateFields.notificationType = notificationType
      if (categoryTypeId !== undefined) updateFields.categoryTypeId = categoryTypeId

      if (sendType !== undefined) {
        updateFields.sendType = sendType
      }

      if (sendSchedule !== undefined) {
        if (sendSchedule) {
          const scheduledTime = moment.utc(sendSchedule)
          if (!scheduledTime.isValid()) {
            throw new BadRequestException({
              responseCode: 1,
              errorCode: ErrorCode.VALIDATION_FAILED,
              responseMessage: 'Invalid sendSchedule date format',
              data: {
                providedDate: sendSchedule,
                expectedFormat: 'ISO 8601 format (e.g., 2025-10-06T09:30:00)',
              },
            })
          }
          const now = moment.utc()
          if (scheduledTime.isBefore(now)) {
            throw new BadRequestException({
              responseCode: 1,
              errorCode: ErrorCode.TEMPLATE_SEND_SCHEDULE_IN_PAST,
              responseMessage: ResponseMessage.TEMPLATE_SEND_SCHEDULE_IN_PAST,
              data: {
                scheduledTime: scheduledTime.format('h:mm A MMM D, YYYY'),
                currentTime: now.format('h:mm A MMM D, YYYY'),
              },
            })
          }
          updateFields.sendSchedule = scheduledTime.toDate()
        } else {
          updateFields.sendSchedule = null
        }
      }

      if (isSent !== undefined) {
        updateFields.isSent = isSent
      }

      if (dto.showPerDay !== undefined) {
        updateFields.showPerDay = dto.showPerDay
      }

      if (dto.maxDayShowing !== undefined) {
        updateFields.maxDayShowing = dto.maxDayShowing
      }

      if (currentUser?.username) {
        updateFields.updatedBy = currentUser.username
      }

      if (Object.keys(updateFields).length > 0) {
        await this.repo.update(id, updateFields)
      }

      if (translations && translations.length > 0) {
        const translationsMap = new Map()
        translations.forEach((t) => {
          translationsMap.set(t.language, t)
        })

        const getFallbackValue = (field: 'title' | 'content', language: Language): string => {
          const current = translationsMap.get(language)
          if (current && current[field] && String(current[field]).trim() !== '') {
            return String(current[field])
          }

          let fallbackOrder: Language[] = []
          if (language === Language.KM) {
            fallbackOrder = [Language.EN, Language.JP]
          } else if (language === Language.EN) {
            fallbackOrder = [Language.KM, Language.JP]
          } else if (language === Language.JP) {
            fallbackOrder = [Language.KM, Language.EN]
          }

          for (const fallbackLang of fallbackOrder) {
            const fallback = translationsMap.get(fallbackLang)
            if (fallback && fallback[field] && String(fallback[field]).trim() !== '') {
              return String(fallback[field])
            }
          }
          return ''
        }

        translations.forEach((translation) => {
          if (
            translation.title === undefined ||
            translation.title === null ||
            String(translation.title).trim() === ''
          ) {
            translation.title = getFallbackValue('title', translation.language)
          }
          if (
            translation.content === undefined ||
            translation.content === null ||
            String(translation.content).trim() === ''
          ) {
            translation.content = getFallbackValue('content', translation.language)
          }
        })

        for (const translation of translations) {
          const { language, title, content, image, linkPreview } = translation

          const titleValue = title !== undefined && title !== null ? String(title) : ''
          const contentValue = content !== undefined && content !== null ? String(content) : ''

          const item = await this.translationRepo.findOneBy({ templateId: id, language: language })

          if (item) {
            let imageId = item.imageId
            const oldImageId = item.imageId
            // If image field is provided in the translation object, update it
            // Empty string means user explicitly removed the image
            if (translation.image !== undefined) {
              if (image && String(image).trim() !== '') {
                const imageExists = await this.imageService.validateImageExists(image)
                if (imageExists) {
                  imageId = image
                  if (oldImageId !== imageId) {
                    this.logger.log(
                      `🖼️ [Template Update] Updating imageId for template ${id}, language ${language}: ${
                        oldImageId || 'null'
                      } -> ${imageId}`,
                    )
                  }
                } else {
                  this.logger.warn(
                    `⚠️ [Template Update] Image ${image} does not exist, setting imageId to null for template ${id}, language ${language}`,
                  )
                  imageId = null
                }
              } else {
                // Image was removed (empty string or falsy value)
                if (oldImageId) {
                  this.logger.log(
                    `🖼️ [Template Update] Removing imageId for template ${id}, language ${language}: ${oldImageId} -> null`,
                  )
                }
                imageId = null
              }
            }

            if (
              item.title !== titleValue ||
              item.content !== contentValue ||
              item.imageId !== imageId ||
              item.linkPreview !== linkPreview
            ) {
              await this.translationRepo.update(item.id, {
                title: titleValue,
                content: contentValue,
                imageId: imageId,
                linkPreview: linkPreview,
                updatedAt: new Date(),
              })

              if (oldImageId !== imageId) {
                this.logger.log(
                  `✅ [Template Update] Successfully updated imageId for template ${id}, language ${language}: ${
                    oldImageId || 'null'
                  } -> ${imageId || 'null'}`,
                )
              }
            }
          } else {
            let imageId = null
            if (translation.image) {
              const imageExists = await this.imageService.validateImageExists(translation.image)
              if (imageExists) {
                imageId = translation.image
              }
            }
            await this.translationRepo.save({
              templateId: id,
              language: translation.language,
              title: titleValue,
              content: contentValue,
              imageId: imageId,
              linkPreview: translation.linkPreview,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
          }
        }
      }

      const updatedTemplate = await this.findOneRaw(id)

      // Check if trying to publish a draft (SEND_NOW with isSent=true)
      if (updatedTemplate.sendType === SendType.SEND_NOW && updatedTemplate.isSent === true) {
        // FLASH_NOTIFICATION now sends FCM push like other notification types
        // Mobile app will display it differently (as popup/flash screen)
        console.log(
          `🔵 [UPDATE] Publishing notification (type: ${updatedTemplate.notificationType}) - will send FCM push`,
        )
        console.log(
          `🔵 [UPDATE] Template platforms when publishing:`,
          updatedTemplate.platforms,
          `(type: ${typeof updatedTemplate.platforms})`,
        )

        // Try to send the notification
        const templateWithTranslations = await this.repo.findOne({
          where: { id: updatedTemplate.id },
          relations: ['translations', 'translations.image'],
        })

        if (templateWithTranslations && templateWithTranslations.translations) {
          let sendResult: { successfulCount: number; failedCount: number; failedUsers?: string[] } =
            { successfulCount: 0, failedCount: 0, failedUsers: [] }
          let noUsersForPlatform = false
          try {
            sendResult = await this.notificationService.sendWithTemplate(templateWithTranslations)
            console.log(`[UPDATE] sendWithTemplate returned:`, sendResult)
          } catch (error: any) {
            console.error(`[UPDATE] ❌ ERROR in sendWithTemplate:`, error?.message)
            // Check if error is about no users for bakongPlatform
            if (error?.message && error.message.includes('No users found for')) {
              noUsersForPlatform = true
              console.log(`[UPDATE] ⚠️ No users found for bakongPlatform - keeping as draft`)
            }
          }

          // If no users found for the platform, keep as draft
          if (noUsersForPlatform) {
            await this.repo.update(updatedTemplate.id, { isSent: false, updatedAt: new Date() })
            console.log(`[UPDATE] Template kept as draft due to no users for target platform`)
            // Set flag to indicate saved as draft due to no users
            ;(updatedTemplate as any).savedAsDraftNoUsers = true
            // Reload to get updated isSent value
            const reloadedTemplate = await this.findOneRaw(id)
            ;(reloadedTemplate as any).savedAsDraftNoUsers = true
            return this.formatTemplateResponse(reloadedTemplate)
          } else if (sendResult.successfulCount > 0) {
            // Successfully sent, mark as published
            await this.markAsPublished(updatedTemplate.id, currentUser)
            console.log(
              `[UPDATE] Template published successfully, sent to ${sendResult.successfulCount} users`,
            )
            // Include send result in template response
            ;(updatedTemplate as any).successfulCount = sendResult.successfulCount
            ;(updatedTemplate as any).failedCount = sendResult.failedCount
            ;(updatedTemplate as any).failedUsers = sendResult.failedUsers || []
          } else {
            // No users received the notification - revert to draft
            console.warn(
              `[UPDATE] No notifications were sent (successfulCount = 0) - reverting to draft`,
            )
            await this.repo.update(updatedTemplate.id, { isSent: false, updatedAt: new Date() })
            // Reload template to get updated isSent value
            const reloadedTemplate = await this.findOneRaw(id)
            ;(reloadedTemplate as any).savedAsDraftNoUsers = true
            // Include send result in template response
            ;(reloadedTemplate as any).successfulCount = sendResult.successfulCount
            ;(reloadedTemplate as any).failedCount = sendResult.failedCount
            ;(reloadedTemplate as any).failedUsers = sendResult.failedUsers || []
            return this.formatTemplateResponse(reloadedTemplate)
          }
        }
      }

      if (updatedTemplate.sendType === SendType.SEND_SCHEDULE && updatedTemplate.sendSchedule) {
        if (this.schedulerRegistry.doesExist('cron', id.toString())) {
          this.schedulerRegistry.deleteCronJob(id.toString())
        }
        this.addScheduleNotification(updatedTemplate)
      }

      // Reload template to get latest state
      const finalTemplate = await this.findOneRaw(id)
      // Preserve flag if it was set
      if ((updatedTemplate as any).savedAsDraftNoUsers) {
        ;(finalTemplate as any).savedAsDraftNoUsers = true
      }
      // Preserve send result properties if they were set
      if ((updatedTemplate as any).successfulCount !== undefined) {
        ;(finalTemplate as any).successfulCount = (updatedTemplate as any).successfulCount
        ;(finalTemplate as any).failedCount = (updatedTemplate as any).failedCount
        ;(finalTemplate as any).failedUsers = (updatedTemplate as any).failedUsers
      }
      return this.formatTemplateResponse(finalTemplate)
    } catch (error) {
      throw new Error(error)
    }
  }

  async editPublishedNotification(id: number, dto: UpdateTemplateDto, currentUser?: any) {
    const oldTemplate = await this.findOneRaw(id)

    try {
      // When editing a published notification, always preserve published status
      // Force sendType to SEND_NOW and isSent to true to keep it in published tab
      const isEditingPublished = oldTemplate.isSent === true

      const newTemplateData = {
        platforms: dto.platforms || oldTemplate.platforms,
        bakongPlatform:
          dto.bakongPlatform !== undefined ? dto.bakongPlatform : oldTemplate.bakongPlatform,
        // Always keep as SEND_NOW when editing published notification, ignore DTO
        sendType: isEditingPublished ? SendType.SEND_NOW : dto.sendType || oldTemplate.sendType,
        // Always keep as published when editing published notification
        isSent: isEditingPublished ? true : dto.isSent !== undefined ? dto.isSent : false,
        // Clear schedule when editing published notification
        sendSchedule: isEditingPublished
          ? null
          : dto.sendSchedule !== undefined
            ? dto.sendSchedule
            : oldTemplate.sendSchedule,
        sendInterval: isEditingPublished ? null : oldTemplate.sendInterval,
        notificationType: dto.notificationType || oldTemplate.notificationType,
        categoryTypeId: dto.categoryTypeId ?? oldTemplate.categoryTypeId,
        priority: oldTemplate.priority,
        createdBy: currentUser?.username || oldTemplate.createdBy,
        updatedBy: currentUser?.username || oldTemplate.updatedBy,
        publishedBy: currentUser?.username || oldTemplate.publishedBy,
      }

      const newTemplate = await this.repo.save(newTemplateData)

      if (dto.translations && dto.translations.length > 0) {
        for (const translation of dto.translations) {
          let imageId = null
          if (translation.image) {
            const imageExists = await this.imageService.validateImageExists(translation.image)
            if (imageExists) {
              imageId = translation.image
            }
          }

          await this.translationRepo.save({
            templateId: newTemplate.id,
            language: translation.language,
            title: translation.title,
            content: translation.content,
            imageId: imageId,
            linkPreview: translation.linkPreview,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        }
      } else {
        const existingTranslations = await this.translationRepo.find({ where: { templateId: id } })
        for (const translation of existingTranslations) {
          await this.translationRepo.save({
            templateId: newTemplate.id,
            language: translation.language,
            title: translation.title,
            content: translation.content,
            imageId: translation.imageId,
            linkPreview: translation.linkPreview,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        }
      }

      // When editing a published notification, we should NOT resend FCM notifications
      // We just update the template data and notification records in the notification center
      // The notification records will automatically reflect the updated template data via the relationship

      // Check if this is editing a published notification (oldTemplate.isSent === true)
      // When editing published notifications, we should NOT resend - just update the data
      // Always keep it in published tab (isSent: true, sendType: SEND_NOW)
      if (isEditingPublished) {
        // Editing a published notification - just update data, don't resend FCM
        // Always keep as published (isSent: true) and SEND_NOW
        console.log(
          `📝 [editPublishedNotification] Editing published notification - updating data without resending FCM`,
        )

        // Ensure it stays published - force isSent: true and sendType: SEND_NOW
        await this.repo.update(newTemplate.id, {
          isSent: true,
          sendType: SendType.SEND_NOW,
          sendSchedule: null, // Clear any schedule to keep in published tab
          sendInterval: null, // Clear any interval to keep in published tab
          updatedAt: new Date(),
        })
        console.log(
          `✅ [editPublishedNotification] Template updated and marked as published (no FCM resend, kept in published tab)`,
        )

        // Update notification records to point to new templateId BEFORE deleting old template
        // This ensures notification center shows updated data
        await this.notificationService.updateNotificationTemplateId(id, newTemplate.id)

        // Delete old template and return the updated one
        await this.forceDeleteTemplate(id)
        const templateToReturn = await this.findOneRaw(newTemplate.id)
        return this.formatTemplateResponse(templateToReturn)
      } else if (newTemplate.sendType === 'SEND_NOW' && dto.isSent === true) {
        // This shouldn't happen in editPublishedNotification (only drafts go through update method)
        // But handle it just in case - this would be publishing a draft for the first time
        console.log(
          `⚠️ [editPublishedNotification] Unexpected: Publishing draft in editPublishedNotification`,
        )

        // FLASH_NOTIFICATION now sends FCM push like other notification types
        // Mobile app will display it differently (as popup/flash screen)
        console.log(
          `🔵 [editPublishedNotification] Publishing notification (type: ${newTemplate.notificationType}) - will send FCM push`,
        )

        const templateWithTranslations = await this.repo.findOne({
          where: { id: newTemplate.id },
          relations: ['translations', 'translations.image'],
        })

        if (templateWithTranslations && templateWithTranslations.translations) {
          let sendResult: { successfulCount: number; failedCount: number; failedUsers?: string[] } =
            { successfulCount: 0, failedCount: 0, failedUsers: [] }
          let noUsersForPlatform = false
          try {
            sendResult = await this.notificationService.sendWithTemplate(templateWithTranslations)
            console.log(`sendWithTemplate returned:`, sendResult)
          } catch (error: any) {
            console.error(`❌ ERROR in sendWithTemplate for update:`, error?.message)
            if (error?.message && error.message.includes('No users found for')) {
              noUsersForPlatform = true
              console.log(`⚠️ No users found for bakongPlatform - keeping as draft`)
            }
          }

          if (noUsersForPlatform) {
            await this.repo.update(newTemplate.id, { isSent: false, updatedAt: new Date() })
            ;(newTemplate as any).savedAsDraftNoUsers = true
          } else if (sendResult.successfulCount && sendResult.successfulCount > 0) {
            await this.repo.update(newTemplate.id, { isSent: true, updatedAt: new Date() })
            ;(newTemplate as any).successfulCount = sendResult.successfulCount
            ;(newTemplate as any).failedCount = sendResult.failedCount
            ;(newTemplate as any).failedUsers = sendResult.failedUsers || []
          } else {
            await this.repo.update(newTemplate.id, { isSent: false, updatedAt: new Date() })
            ;(newTemplate as any).savedAsDraftNoUsers = true
            ;(newTemplate as any).successfulCount = sendResult.successfulCount
            ;(newTemplate as any).failedCount = sendResult.failedCount
            ;(newTemplate as any).failedUsers = sendResult.failedUsers || []
          }
        }

        await this.forceDeleteTemplate(id)
        const templateToReturn = await this.findOneRaw(newTemplate.id)
        return this.formatTemplateResponse(templateToReturn)
      } else {
        // Keep as draft if isSent is false
        await this.repo.update(newTemplate.id, { isSent: false, updatedAt: new Date() })
        console.log(`📝 [editPublishedNotification] Template updated and kept as draft`)
      }

      if (newTemplate.sendType === 'SEND_SCHEDULE' && newTemplate.sendSchedule) {
        console.log(
          `Scheduling updated notification for template ${newTemplate.id} at ${newTemplate.sendSchedule}`,
        )

        // Validate if there are matching users before scheduling
        // If no matching users, keep as draft (isSent: false)
        if (newTemplate.isSent === true) {
          const hasMatchingUsers = await this.validateMatchingUsers(newTemplate)
          if (!hasMatchingUsers) {
            console.log(
              `🔵 [EDIT PUBLISHED] ⚠️ No matching users found for scheduled notification - keeping as draft`,
            )
            await this.repo.update(newTemplate.id, { isSent: false, updatedAt: new Date() })
            console.log('✅ Template kept as draft due to no matching users')
            ;(newTemplate as any).savedAsDraftNoUsers = true
          }
        }

        this.addScheduleNotification(newTemplate)
      } else if (newTemplate.sendType === 'SEND_INTERVAL' && newTemplate.sendInterval) {
        console.log(`Scheduling updated notification with interval for template ${newTemplate.id}`)
        this.addIntervalNotification(newTemplate)
      }

      await this.forceDeleteTemplate(id)

      console.log(
        `Published notification edited: Old template ${id} deleted, new template ${newTemplate.id} created`,
      )

      // Preserve the savedAsDraftNoUsers flag if it was set
      const templateToReturn = await this.findOneRaw(newTemplate.id)
      if ((newTemplate as any).savedAsDraftNoUsers) {
        ;(templateToReturn as any).savedAsDraftNoUsers = true
      }
      // Preserve send result properties if they were set
      if ((newTemplate as any).successfulCount !== undefined) {
        ;(templateToReturn as any).successfulCount = (newTemplate as any).successfulCount
        ;(templateToReturn as any).failedCount = (newTemplate as any).failedCount
        ;(templateToReturn as any).failedUsers = (newTemplate as any).failedUsers
      }
      return this.formatTemplateResponse(templateToReturn)
    } catch (error) {
      console.error('Error editing published notification:', error)
      throw new Error(error)
    }
  }

  async remove(id: number) {
    const template = await this.findOneRaw(id)
    this.validateModificationTemplate(template, true)

    if (template.isSent) {
      await this.notificationService.deleteNotificationsByTemplateId(id)
    }

    await this.repo.delete(id)
    return this.formatTemplateResponse(template)
  }

  async forceDeleteTemplate(id: number) {
    const template = await this.findOneRaw(id)

    if (template.isSent) {
      await this.notificationService.deleteNotificationsByTemplateId(id)
    }

    await this.repo.delete(id)
    return this.formatTemplateResponse(template)
  }

  all(language?: string) {
    const defaultLanguage = language || 'KM'

    const templates = this.repo
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.translations', 'translation')
      .leftJoinAndSelect('translation.image', 'image')
      .where('translation.language = :language', { language: defaultLanguage })
      .addOrderBy('template.sendSchedule', 'DESC')
      .addOrderBy('template.updatedAt', 'DESC')
      .addOrderBy('template.createdAt', 'DESC')
      .getMany()

    return templates.then((items) => {
      items.sort((a, b) => {
        const dateA =
          a.isSent && a.updatedAt ? a.updatedAt : a.sendSchedule || a.updatedAt || a.createdAt
        const dateB =
          b.isSent && b.updatedAt ? b.updatedAt : b.sendSchedule || b.updatedAt || b.createdAt
        return dateB.getTime() - dateA.getTime()
      })
      return items.map((item) => this.formatTemplateResponse(item))
    })
  }

  async findTemplates(page?: number, size?: number, isAscending?: boolean, language?: string) {
    const { skip, take } = PaginationUtils.normalizePagination(page || 1, size || 12)
    const defaultLanguage = language || 'KM'

    const queryBuilder = this.repo
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.translations', 'translation')
      .leftJoinAndSelect('translation.image', 'image')
      .where('translation.language = :language', { language: defaultLanguage })

    const [allItems, total] = await queryBuilder.getManyAndCount()

    allItems.sort((a, b) => {
      const dateA =
        a.isSent && a.updatedAt ? a.updatedAt : a.sendSchedule || a.updatedAt || a.createdAt
      const dateB =
        b.isSent && b.updatedAt ? b.updatedAt : b.sendSchedule || b.updatedAt || b.createdAt
      return dateB.getTime() - dateA.getTime()
    })

    const items = allItems.slice(skip, skip + take)

    const formattedItems = items.map((item) => this.formatTemplateResponse(item))
    const paginationMeta = PaginationUtils.calculatePaginationMeta(
      page || 1,
      size || 12,
      total,
      items.length,
    )

    return {
      responseCode: 0,
      errorCode: ErrorCode.REQUEST_SUCCESS,
      responseMessage: ResponseMessage.REQUEST_SUCCESS,
      data: formattedItems,
      meta: paginationMeta,
    }
  }

  async findTemplatesAsNotifications(
    page?: number,
    size?: number,
    _isAscending?: boolean,
    _language?: string,
  ) {
    try {
      const { skip, take } = PaginationUtils.normalizePagination(page || 1, size || 100)

      const queryBuilder = this.repo
        .createQueryBuilder('template')
        .leftJoinAndSelect('template.translations', 'translation')
        .leftJoinAndSelect('translation.image', 'image')

      const [items, total] = await queryBuilder.getManyAndCount()

      items.sort((a, b) => {
        const dateA =
          a.isSent && a.updatedAt ? a.updatedAt : a.sendSchedule || a.updatedAt || a.createdAt
        const dateB =
          b.isSent && b.updatedAt ? b.updatedAt : b.sendSchedule || b.updatedAt || b.createdAt
        return dateB.getTime() - dateA.getTime()
      })

      const paginatedItems = items.slice(skip, skip + take)

      // Fetch displayNames for all unique usernames in batch
      const usernames = new Set<string>()
      paginatedItems.forEach((template) => {
        if (template.publishedBy) usernames.add(template.publishedBy)
        if (template.updatedBy) usernames.add(template.updatedBy)
        if (template.createdBy) usernames.add(template.createdBy)
      })

      const displayNameMap = new Map<string, string>()
      if (usernames.size > 0) {
        const usernameArray = Array.from(usernames)
        const users = await this.userRepo.find({
          where: { username: In(usernameArray) },
          select: ['username', 'displayName'],
        })
        users.forEach((user) => {
          displayNameMap.set(user.username, user.displayName)
        })
      }

      const notifications = paginatedItems
        .map((template) => {
          const sortedTranslations = template.translations?.sort((a, b) => {
            const priority = { KM: 1, EN: 2, JP: 3 }
            return (priority[a.language] || 999) - (priority[b.language] || 999)
          })

          if (sortedTranslations && sortedTranslations.length > 0) {
            template.translations = [sortedTranslations[0]]
          }

          if (template.translations?.[0]?.image && 'file' in template.translations[0].image) {
            delete (template.translations[0].image as any).file
          }

          return this.formatTemplateAsNotification(template, displayNameMap)
        })
        .filter((notification) => notification !== null)

      const paginationMeta = PaginationUtils.calculatePaginationMeta(
        page || 1,
        size || 100,
        total,
        paginatedItems.length,
      )

      return {
        responseCode: 0,
        errorCode: ErrorCode.REQUEST_SUCCESS,
        responseMessage: ResponseMessage.REQUEST_SUCCESS,
        data: notifications,
        meta: paginationMeta,
      }
    } catch (error: any) {
      console.error('❌ [TEMPLATE SERVICE] Error in findTemplatesAsNotifications:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        code: error?.code,
      })
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
        responseMessage: error?.message || 'Failed to fetch templates',
        data: {
          error: error?.message,
          context: 'findTemplatesAsNotifications',
        },
      })
    }
  }

  async findOne(id: number) {
    const template = await this.repo.findOne({
      where: { id },
      relations: ['translations', 'translations.image'],
    })
    if (!template) {
      throw new BadRequestException(
        new BaseResponseDto({
          responseCode: 1,
          errorCode: ErrorCode.RECORD_NOT_FOUND,
          responseMessage: ResponseMessage.RECORD_NOT_FOUND + id,
        }),
      )
    }

    return this.formatTemplateResponse(template)
  }

  async findOneRaw(id: number) {
    const template = await this.repo
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.translations', 'translations')
      .leftJoinAndSelect('translations.image', 'image')
      .where('template.id = :id', { id })
      .getOne()

    if (!template) {
      throw new BadRequestException(
        new BaseResponseDto({
          responseCode: 1,
          errorCode: ErrorCode.RECORD_NOT_FOUND,
          responseMessage: ResponseMessage.RECORD_NOT_FOUND + id,
        }),
      )
    }

    return template
  }
  private formatTemplateResponse(template: Template) {
    // Parse platforms to ensure it's always an array in the response
    const parsedPlatforms = ValidationHelper.parsePlatforms(template.platforms)

    const formattedTemplate: any = {
      templateId: template.id,
      platforms: parsedPlatforms, // Always return as array for frontend
      bakongPlatform: template.bakongPlatform,
      sendType: template.sendType,
      notificationType: template.notificationType,
      categoryType: template.categoryTypeEntity?.name,
      categoryTypeId: template.categoryTypeId,
      priority: template.priority,
      sendInterval: template.sendInterval
        ? {
            cron: template.sendInterval.cron,
            startAt: moment(template.sendInterval.startAt).toISOString(),
            endAt: moment(template.sendInterval.endAt).toISOString(),
          }
        : null,
      isSent: template.isSent,
      sendSchedule: template.sendSchedule ? moment(template.sendSchedule).toISOString() : null,
      createdAt: moment(template.createdAt).toISOString(),
      updatedAt: template.updatedAt ? moment(template.updatedAt).toISOString() : null,
      deletedAt: template.deletedAt ? moment(template.deletedAt).toISOString() : null,
      // Preserve send result properties if they exist
      successfulCount: (template as any).successfulCount,
      failedCount: (template as any).failedCount,
      failedUsers: (template as any).failedUsers,
      // Preserve savedAsDraftNoUsers flag if it exists
      savedAsDraftNoUsers: (template as any).savedAsDraftNoUsers,
      translations: template.translations
        ? template.translations.map((translation) => ({
            id: translation.id,
            language: translation.language,
            title: translation.title,
            content: translation.content,
            linkPreview: translation.linkPreview,
            image: translation.image
              ? {
                  fileId: translation.image.fileId,
                  mimeType: translation.image.mimeType
                    ? translation.image.mimeType.substring(0, 100)
                    : null,
                  originalFileName: translation.image.originalFileName
                    ? translation.image.originalFileName.substring(0, 100)
                    : null,
                }
              : translation.imageId
                ? {
                    fileId: translation.imageId,
                    mimeType: null,
                    originalFileName: null,
                  }
                : null,
          }))
        : [],
    }

    // Add flag if saved as draft due to no users
    if ((template as any).savedAsDraftNoUsers) {
      formattedTemplate.savedAsDraftNoUsers = true
    }

    // Include send result properties if they exist
    if ((template as any).successfulCount !== undefined) {
      formattedTemplate.successfulCount = (template as any).successfulCount
      formattedTemplate.failedCount = (template as any).failedCount
      formattedTemplate.failedUsers = (template as any).failedUsers || []
    }

    return formattedTemplate
  }

  private formatTemplateAsNotification(template: Template, displayNameMap?: Map<string, string>) {
    const translation = template.translations?.[0]
    if (!translation) {
      return null
    }

    let status: string
    if (template.isSent) {
      status = 'published'
    } else if (template.sendType === 'SEND_SCHEDULE' || template.sendType === 'SEND_INTERVAL') {
      status = 'scheduled'
    } else {
      status = 'draft'
    }

    // Get username first
    const username = template.publishedBy || template.updatedBy || template.createdBy || 'System'
    // Get displayName from map if available, otherwise fallback to username
    const author = displayNameMap?.get(username) || username
    let dateToShow: Date
    if (template.isSent && template.updatedAt) {
      dateToShow = template.updatedAt
    } else if (template.sendSchedule) {
      dateToShow = template.sendSchedule
    } else {
      dateToShow = template.createdAt
    }

    const datePart = dateToShow.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Phnom_Penh',
    })

    const isDraftWithoutSchedule = status === 'draft' && !template.sendSchedule
    const date = isDraftWithoutSchedule
      ? datePart
      : `${datePart} | ${dateToShow.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Phnom_Penh',
        })}`

    // Parse platforms using shared helper function
    const platforms = ValidationHelper.parsePlatforms(template.platforms)

    return {
      id: template.id,
      author: author,
      language: translation.language,
      title: translation.title,
      content: translation.content,
      image: translation.imageId ? `/api/v1/image/${translation.imageId}` : '',
      linkPreview: translation.linkPreview,
      date: date,
      status: status,
      type: template.notificationType,
      createdAt: template.createdAt,
      templateId: template.id,
      isSent: template.isSent,
      sendType: template.sendType,
      scheduledTime: template.sendSchedule
        ? TimezoneUtils.formatCambodiaTime(template.sendSchedule)
        : null,
      platforms: platforms,
      bakongPlatform: template.bakongPlatform || null,
    }
  }

  validateModificationTemplate(template: Template, allowDelete = false) {
    if (template.isSent && !allowDelete) {
      throw new BadRequestException(
        new BaseResponseDto({
          responseCode: 1,
          errorCode: ErrorCode.SENT_TEMPLATE,
          responseMessage: ResponseMessage.SENT_TEMPLATE,
        }),
      )
    }
  }

  async pickPendingSchedule() {
    const pendingTemplate = await this.repo.find({
      where: {
        isSent: false,
        sendSchedule: MoreThanOrEqual(moment().utc().toDate()),
      },
    })
    if (pendingTemplate && pendingTemplate.length > 0) {
      for (const template of pendingTemplate) {
        switch (template.sendType) {
          case SendType.SEND_SCHEDULE:
            this.addScheduleNotification(template)
            break
          case SendType.SEND_INTERVAL:
            this.addIntervalNotification(template)
            break
        }
      }
    }
  }

  /**
   * Validate if there are matching users for the template
   * Checks platform and bakongPlatform filters
   */
  private async validateMatchingUsers(template: Template): Promise<boolean> {
    try {
      // Parse platforms
      const platformsArray = ValidationHelper.parsePlatforms(template.platforms)
      const normalizedPlatforms = platformsArray
        .map((p) => ValidationHelper.normalizeEnum(p))
        .filter((p) => p === 'ALL' || p === 'IOS' || p === 'ANDROID')

      if (normalizedPlatforms.length === 0) {
        normalizedPlatforms.push('ALL')
      }

      // Use notificationService to check for matching users
      // We'll create a temporary template to check users
      const tempTemplate = { ...template } as Template

      // Try to get users through sendWithTemplate logic
      // But we'll use a simpler check - just verify users exist
      const bkUserRepo = (this.notificationService as any).bkUserRepo
      if (!bkUserRepo) {
        console.error('🔵 [validateMatchingUsers] bkUserRepo not available')
        return false
      }

      let users = await bkUserRepo.find()

      // Filter by bakongPlatform
      if (template.bakongPlatform) {
        users = users.filter((user) => user.bakongPlatform === template.bakongPlatform)
        if (users.length === 0) {
          console.log(
            `🔵 [validateMatchingUsers] No users found for bakongPlatform: ${template.bakongPlatform}`,
          )
          return false
        }
      }

      // Filter by platform
      const targetsAllPlatforms = normalizedPlatforms.includes('ALL')
      if (!targetsAllPlatforms) {
        const matchingUsers = users.filter((user) => {
          if (!user.platform) return false
          const normalizedUserPlatform = ValidationHelper.normalizeEnum(user.platform)
          return normalizedPlatforms.some((p) => normalizedUserPlatform === p)
        })

        if (matchingUsers.length === 0) {
          console.log(
            `🔵 [validateMatchingUsers] No users match platform filter: ${normalizedPlatforms.join(
              ', ',
            )}`,
          )
          return false
        }
      }

      console.log(`🔵 [validateMatchingUsers] Found matching users for template ${template.id}`)
      return true
    } catch (error: any) {
      console.error('🔵 [validateMatchingUsers] Error validating users:', error)
      // On error, return false to be safe (keep as draft)
      return false
    }
  }

  addScheduleNotification(template: Template) {
    if (!template.sendSchedule) {
      return
    }

    if (!this.schedulerRegistry.doesExist('cron', template.id.toString())) {
      const scheduledDate = new Date(template.sendSchedule)
      const now = new Date()
      const timeUntilSchedule = scheduledDate.getTime() - now.getTime()
      const minutesUntilSchedule = timeUntilSchedule / (1000 * 60)

      if (timeUntilSchedule < -2 * 60 * 1000) {
        console.log(
          `Scheduled time ${scheduledDate.toISOString()} is more than 2 minutes in the past, will be handled by periodic cron job`,
        )
        return
      }

      if (timeUntilSchedule <= 2 * 60 * 1000 && timeUntilSchedule >= 0) {
        console.log(
          `Scheduled time ${scheduledDate.toISOString()} is within 2 minutes (${minutesUntilSchedule.toFixed(
            2,
          )} min), will be handled by periodic cron job`,
        )
        return
      }

      if (timeUntilSchedule > 2 * 60 * 1000) {
        const job = new CronJob(scheduledDate, async () => {
          try {
            console.log(
              `[CronJob] Executing scheduled notification for template ${
                template.id
              } at ${new Date()}`,
            )

            // When scheduled notification is sent, mark as published and clear schedule
            // This moves it from Scheduled tab to Published tab
            const updateResult = await this.repo
              .createQueryBuilder()
              .update(Template)
              .set({
                isSent: true,
                sendType: SendType.SEND_NOW, // Change to SEND_NOW so it appears in Published tab
                sendSchedule: null, // Clear schedule since it's been sent
              })
              .where('id = :id', { id: template.id })
              .andWhere('isSent = :isSent', { isSent: false })
              .execute()

            if (updateResult.affected === 0) {
              console.log(
                `[CronJob] Template ${template.id} was already claimed by another process, skipping to prevent duplicate send`,
              )
              return
            }

            console.log(`[CronJob] Successfully claimed template ${template.id} for sending`)

            const templateWithTranslations = await this.repo.findOne({
              where: { id: template.id },
              relations: ['translations', 'translations.image'],
            })

            if (templateWithTranslations && templateWithTranslations.translations) {
              const sentCount =
                await this.notificationService.sendWithTemplate(templateWithTranslations)

              if (typeof sentCount === 'number' && sentCount > 0) {
                await this.markAsPublished(template.id)
                console.log(
                  `[CronJob] Scheduled notification sent successfully for template ${template.id} to ${sentCount} users`,
                )
              } else {
                console.log(`[CronJob] No notifications sent for template ${template.id}`)
              }
            } else {
              console.error(`[CronJob] Template ${template.id} has no translations, cannot send`)
              await this.repo.update(template.id, { isSent: false })
            }
          } catch (error) {
            console.error(
              `[CronJob] Error executing scheduled notification for template ${template.id}:`,
              error,
            )
            await this.repo.update(template.id, { isSent: false }).catch(() => {
              console.error(`[CronJob] Failed to update template ${template.id}`)
            })
          }
        })

        this.schedulerRegistry.addCronJob(template.id.toString(), job)
        job.start()
        console.log(
          `Scheduled notification CronJob created for template ${
            template.id
          } at ${scheduledDate.toISOString()} (${minutesUntilSchedule.toFixed(
            2,
          )} minutes from now)`,
        )
      }
    }
  }

  addIntervalNotification(template: Template) {
    const frontendControlled = process.env.FRONTEND_CONTROLLED_SENDING === 'true'

    if (frontendControlled) {
      return
    }

    const { cron, startAt, endAt } = template.sendInterval
    if (
      !this.schedulerRegistry.doesExist('cron', template.id.toString()) &&
      moment(startAt).startOf('day').isBefore() &&
      moment(endAt).endOf('day').isAfter()
    ) {
      const job = new CronJob(cron, async () => {
        try {
          const templateWithTranslations = await this.repo.findOne({
            where: { id: template.id },
            relations: ['translations', 'translations.image'],
          })

          if (templateWithTranslations && templateWithTranslations.translations) {
            const sentCount =
              await this.notificationService.sendWithTemplate(templateWithTranslations)

            if (typeof sentCount === 'number' && sentCount > 0) {
              await this.markAsPublished(template.id)
            }
          }
        } catch (error) {
          throw new Error(error)
        }
      })

      const startJob = new CronJob(startAt, () => {
        this.schedulerRegistry.addCronJob(template.id.toString(), job)
        job.start()
      })

      const endJob = new CronJob(endAt, () => {
        job.stop()
        this.schedulerRegistry.deleteCronJob(template.id.toString())
      })

      this.schedulerRegistry.addCronJob(template.id.toString() + '-start', startJob)
      this.schedulerRegistry.addCronJob(template.id.toString() + '-end', endJob)
      startJob.start()
    }
  }

  getCronJob() {
    const jobs = this.schedulerRegistry.getCronJobs()
    return {
      responseCode: 0,
      responseMessage: 'Cron jobs retrieved successfully',
      errorCode: 0,
      data: Array.from(jobs.keys()),
    }
  }

  async findNotificationTemplate(dto: any): Promise<any> {
    if (dto.notificationType === NotificationType.FLASH_NOTIFICATION) {
      // IMPORTANT: Only include published templates (isSent: true), exclude drafts
      const templates = await this.repo.find({
        where: {
          notificationType: NotificationType.FLASH_NOTIFICATION,
          isSent: true, // Only published templates, exclude drafts
        },
        relations: ['translations', 'translations.image'],
        order: { priority: 'DESC', createdAt: 'DESC' },
      })
      const template = templates.find((t) => t.translations && t.translations.length > 0) || null
      if (!template) {
        throw new Error(
          `No published templates found for type ${NotificationType.FLASH_NOTIFICATION}`,
        )
      }
      return { template, notificationType: NotificationType.FLASH_NOTIFICATION }
    }

    if (dto.templateId) {
      const template = await this.findTemplateById(dto.templateId.toString())
      // Verify template is published (not draft)
      if (template && !template.isSent) {
        throw new Error(
          `Template ${dto.templateId} is a draft and cannot be sent. Please publish it first.`,
        )
      }
      return { template, notificationType: template.notificationType }
    }

    const validatedRequest = dto.notificationType || dto.type
    // IMPORTANT: Only include published templates (isSent: true), exclude drafts
    const templates = await this.repo.find({
      where: {
        notificationType: validatedRequest,
        isSent: true, // Only published templates, exclude drafts
      },
      relations: ['translations', 'translations.image'],
      order: { priority: 'DESC', createdAt: 'DESC' },
    })
    const template = templates.find((t) => t.translations && t.translations.length > 0) || null
    if (!template) {
      throw new Error(`No published templates found for type ${validatedRequest}`)
    }

    return { template, notificationType: validatedRequest }
  }

  async findTemplateById(templateId: string): Promise<Template> {
    const template = await this.repo.findOne({
      where: { id: Number(templateId) },
      relations: ['translations', 'translations.image'],
    })

    if (!template) {
      throw new Error(`Template not found with id ${templateId}`)
    }
    return template
  }

  async findBestTemplateForUser(
    accountId: string,
    language: string,
    notificationRepo: any,
    userBakongPlatform?: string,
  ): Promise<{ template: Template; translation: TemplateTranslation } | null> {
    const userNotifications = await notificationRepo.find({
      where: {
        accountId,
      },
      select: ['templateId', 'sendCount', 'createdAt'],
    })

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    // Filter notifications from today
    const todayNotifications = userNotifications.filter((notif) => {
      const createdAt = new Date(notif.createdAt)
      return createdAt >= todayStart && createdAt <= todayEnd
    })

    const templateViewCounts = todayNotifications.reduce(
      (acc, notif) => {
        const templateId = notif.templateId
        if (templateId) {
          acc[templateId] = (acc[templateId] || 0) + 1
        }
        return acc
      },
      {} as Record<number, number>,
    )

    // Calculate unique days each template was shown to this user
    const templateDaysCounts = new Map<number, Set<string>>()
    userNotifications.forEach((notif) => {
      if (notif.templateId) {
        const createdAt = new Date(notif.createdAt)
        const dayKey = `${createdAt.getFullYear()}-${createdAt.getMonth()}-${createdAt.getDate()}`
        if (!templateDaysCounts.has(notif.templateId)) {
          templateDaysCounts.set(notif.templateId, new Set())
        }
        templateDaysCounts.get(notif.templateId)?.add(dayKey)
      }
    })

    // Get all published flash templates to check their limits
    const allTemplatesWhere: any = {
      notificationType: NotificationType.FLASH_NOTIFICATION,
      isSent: true,
    }
    if (userBakongPlatform) {
      allTemplatesWhere.bakongPlatform = userBakongPlatform
    }
    const allTemplates = await this.repo.find({
      where: allTemplatesWhere,
      relations: ['translations'],
      select: ['id', 'showPerDay', 'maxDayShowing'],
    })

    // Filter out templates that have reached their limits
    const excludedTemplateIds: number[] = []
    allTemplates.forEach((template) => {
      const templateId = template.id
      const showPerDay = template.showPerDay ?? 1
      const maxDayShowing = template.maxDayShowing ?? 1
      const todayCount = templateViewCounts[templateId] || 0
      const daysCount = templateDaysCounts.get(templateId)?.size || 0

      // Exclude if reached daily limit
      if (todayCount >= showPerDay) {
        excludedTemplateIds.push(templateId)
        console.log(
          `📋 [findBestTemplateForUser] Excluding template ${templateId}: reached daily limit (${todayCount}/${showPerDay})`,
        )
        return
      }

      // Exclude if reached max days limit
      if (daysCount >= maxDayShowing) {
        excludedTemplateIds.push(templateId)
        console.log(
          `📋 [findBestTemplateForUser] Excluding template ${templateId}: reached max days limit (${daysCount}/${maxDayShowing})`,
        )
        return
      }
    })

    if (excludedTemplateIds.length > 0) {
      console.log(
        `📋 [findBestTemplateForUser] Templates excluded due to limits: ${excludedTemplateIds.join(
          ', ',
        )}`,
      )
    } else {
      console.log(`📋 [findBestTemplateForUser] No templates excluded due to limits`)
    }

    // Build where clause - filter by bakongPlatform if user has it
    // IMPORTANT: Only include published templates (isSent: true), exclude drafts
    // Exclude templates that have reached their limits
    const whereClause: any = {
      notificationType: NotificationType.FLASH_NOTIFICATION,
      isSent: true, // Only published templates, exclude drafts
      ...(excludedTemplateIds.length > 0 && { id: Not(In(excludedTemplateIds)) }),
    }

    // Filter by user's bakongPlatform if provided
    if (userBakongPlatform) {
      whereClause.bakongPlatform = userBakongPlatform
      console.log(
        `📋 [findBestTemplateForUser] Filtering templates by bakongPlatform: ${userBakongPlatform}`,
      )
    }

    console.log(
      `📋 [findBestTemplateForUser] Excluding templates due to limits: ${
        excludedTemplateIds.length > 0 ? excludedTemplateIds.join(', ') : 'none'
      }`,
    )
    console.log(`📋 [findBestTemplateForUser] Only including published templates (isSent: true)`)

    const availableTemplates = await this.repo.find({
      where: whereClause,
      relations: ['translations'],
      order: { createdAt: 'DESC' },
    })

    if (availableTemplates.length === 0) {
      // Check if all templates have been sent 2+ times (limit reached)
      const allTemplatesWhere: any = {
        notificationType: NotificationType.FLASH_NOTIFICATION,
        isSent: true,
      }
      if (userBakongPlatform) {
        allTemplatesWhere.bakongPlatform = userBakongPlatform
      }
      const allTemplates = await this.repo.find({
        where: allTemplatesWhere,
        select: ['id'],
      })

      if (allTemplates.length > 0 && excludedTemplateIds.length === allTemplates.length) {
        // All templates have reached their limits
        console.warn(
          `⚠️ [findBestTemplateForUser] All templates have reached their limits for user ${accountId}. Limit reached.`,
        )
        return null // Return null to trigger limit error in handleFlashNotification
      }

      // If no templates found for user's bakongPlatform, try without bakongPlatform filter (fallback)
      // But still exclude drafts and templates sent 2+ times
      if (userBakongPlatform) {
        console.warn(
          `⚠️ [findBestTemplateForUser] No templates found for bakongPlatform: ${userBakongPlatform}, trying without bakongPlatform filter`,
        )
        const fallbackTemplates = await this.repo.find({
          where: {
            notificationType: NotificationType.FLASH_NOTIFICATION,
            isSent: true, // Still exclude drafts
            ...(excludedTemplateIds.length > 0 && { id: Not(In(excludedTemplateIds)) }),
          },
          relations: ['translations'],
          order: { createdAt: 'DESC' },
        })
        if (fallbackTemplates.length > 0) {
          const selectedTemplate = fallbackTemplates[0]
          const translation = this.findBestTranslation(selectedTemplate, language)
          if (translation) {
            console.log(
              `📋 [findBestTemplateForUser] Using fallback template ${
                selectedTemplate.id
              } (bakongPlatform: ${selectedTemplate.bakongPlatform || 'NULL'})`,
            )
            return { template: selectedTemplate, translation }
          }
        }
      }
      console.warn(
        `⚠️ [findBestTemplateForUser] No available templates found for user ${accountId}`,
      )
      return null
    }

    const selectedTemplate = availableTemplates[0]
    const translation = this.findBestTranslation(selectedTemplate, language)

    if (!translation) return null

    console.log(
      `✅ [findBestTemplateForUser] Found template ${selectedTemplate.id} with bakongPlatform: ${
        selectedTemplate.bakongPlatform || 'NULL'
      }`,
    )
    return { template: selectedTemplate, translation }
  }

  public findBestTranslation(template: Template, language?: string): TemplateTranslation | null {
    if (!template.translations || template.translations.length === 0) {
      return null
    }

    if (language) {
      const requestedTranslation = template.translations.find((t) => t.language === language)
      if (requestedTranslation) {
        return requestedTranslation
      }
    }

    const sortedTranslations = template.translations.sort((a, b) => {
      const priority = { KM: 1, EN: 2, JP: 3 }
      return (priority[a.language] || 999) - (priority[b.language] || 999)
    })

    return sortedTranslations[0] || null
  }

  async markAsPublished(templateId: number, currentUser?: any): Promise<void> {
    const updateFields: any = {
      isSent: true,
      updatedAt: new Date(),
    }
    if (currentUser?.username) {
      updateFields.publishedBy = currentUser.username
    }
    await this.repo.update(templateId, updateFields)
  }
}
