import { BadRequestException, Injectable, OnModuleInit, Inject, forwardRef } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { CronJob } from 'cron'
import moment from 'moment'
import { Image } from 'src/entities/image.entity'
import { BaseResponseDto } from 'src/common/base-response.dto'
import { Template } from 'src/entities/template.entity'
import { MoreThanOrEqual, Repository, Not, In } from 'typeorm'
import { NotificationService } from '../notification/notification.service'
import { TemplateTranslation } from 'src/entities/template-translation.entity'
import { UpdateTemplateDto } from './dto/update-template.dto'
import { CreateTemplateDto } from './dto/create-template.dto'
import { ImageService } from '../image/image.service'
import { PaginationUtils } from '@bakong/shared'
import {
  ErrorCode,
  ResponseMessage,
  SendType,
  NotificationType,
  CategoryType,
  TimezoneUtils,
  Language,
} from '@bakong/shared'

@Injectable()
export class TemplateService implements OnModuleInit {
  constructor(
    @InjectRepository(Template) private readonly repo: Repository<Template>,
    @InjectRepository(TemplateTranslation)
    private readonly translationRepo: Repository<TemplateTranslation>,
    @InjectRepository(Image)
    private readonly imageRepo: Repository<Image>,
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
    const initialIsSent = dto.isSent === true

    let template = this.repo.create({
      platforms: dto.platforms,
      sendType: dto.sendType,
      isSent: initialIsSent,
      notificationType: dto.notificationType || NotificationType.FLASH_NOTIFICATION,
      categoryType: dto.categoryType || CategoryType.NEWS,
      priority: dto.priority || 0,
      sendSchedule: dto.sendSchedule ? moment.utc(dto.sendSchedule).toDate() : null,
      sendInterval: dto.sendInterval
        ? {
            ...dto.sendInterval,
            startAt: moment(dto.sendInterval.startAt).toDate(),
            endAt: moment(dto.sendInterval.endAt).toDate(),
          }
        : null,

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

      for (const translation of dto.translations) {
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

    if (template.notificationType === NotificationType.FLASH_NOTIFICATION) {
      console.log('🔵 [TEMPLATE CREATE] FLASH_NOTIFICATION - no sending logic')
    } else {
      console.log('🔵 [TEMPLATE CREATE] SEND TYPE DEBUG:', {
        sendType: template.sendType,
        isSent: template.isSent,
        sendSchedule: template.sendSchedule,
        templateId: template.id,
      })

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
            console.error(
              '🔵 [TEMPLATE CREATE] ❌ No translations found for template:',
              template.id,
            )
            console.error('🔵 [TEMPLATE CREATE] Template object:', {
              id: templateWithTranslations?.id,
              translations: templateWithTranslations?.translations,
              translationsType: typeof templateWithTranslations?.translations,
            })
            break
          }

          console.log('🔵 [TEMPLATE CREATE] ✅ Translations found, calling sendWithTemplate...')

          let sentCount = 0
          try {
            sentCount = await this.notificationService.sendWithTemplate(templateWithTranslations)
            console.log('🔵 [TEMPLATE CREATE] sendWithTemplate returned:', sentCount)
          } catch (error: any) {
            console.error('🔵 [TEMPLATE CREATE] ❌ ERROR in sendWithTemplate:', {
              message: error?.message,
              stack: error?.stack,
              code: error?.code,
              fullError: process.env.NODE_ENV === 'development' ? error : 'Hidden in production',
            })
            sentCount = 0
          }

          console.log('📊 SEND_NOW Result:', {
            templateId: template.id,
            sentCount: sentCount,
            willMarkAsPublished: sentCount && sentCount !== 0,
          })

          if (sentCount && sentCount !== 0) {
            await this.markAsPublished(template.id)
            console.log('✅ Template marked as published:', template.id)
          } else {
            await this.repo.update(template.id, { isSent: false })
            console.warn('⚠️ Template NOT sent. Sent count was:', sentCount)
            console.warn('⚠️ Template isSent set to false. This might indicate:')
            console.warn('   1. No users have FCM tokens')
            console.warn('   2. No users match the platform filter')
            console.warn('   3. FCM token validation failed')
            console.warn('   4. Firebase FCM not initialized')
            console.warn('   5. No users in database')
          }
          break
        case SendType.SEND_SCHEDULE:
          console.log('Executing SEND_SCHEDULE for template:', template.id)
          this.addScheduleNotification(template)
          break
        case SendType.SEND_INTERVAL:
          console.log('Executing SEND_INTERVAL for template:', template.id)
          this.addIntervalNotification(template)
          break
        default:
          console.log('Unknown send type:', template.sendType)
      }
    }

    await this.repo.manager.connection.queryResultCache?.clear()

    const templateWithTranslations = await this.findOneRaw(template.id)
    return this.formatTemplateResponse(templateWithTranslations)
  }

  async update(id: number, dto: UpdateTemplateDto, currentUser?: any) {
    const {
      platforms,
      translations,
      notificationType,
      categoryType,
      sendType,
      sendSchedule,
      isSent,
    } = dto
    const template = await this.findOneRaw(id)

    if (template.isSent) {
      return await this.editPublishedNotification(id, dto, currentUser)
    }

    this.validateModificationTemplate(template)

    try {
      const updateFields: any = {}
      if (platforms !== undefined) updateFields.platforms = platforms
      if (notificationType !== undefined) updateFields.notificationType = notificationType
      if (categoryType !== undefined) updateFields.categoryType = categoryType

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
            // If image field is provided in the translation object, update it
            // Empty string means user explicitly removed the image
            if (translation.image !== undefined) {
              if (image && String(image).trim() !== '') {
                const imageExists = await this.imageService.validateImageExists(image)
                if (imageExists) {
                  imageId = image
                } else {
                  imageId = null
                }
              } else {
                // Image was removed (empty string or falsy value)
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

      if (updatedTemplate.sendType === SendType.SEND_SCHEDULE && updatedTemplate.sendSchedule) {
        if (this.schedulerRegistry.doesExist('cron', id.toString())) {
          this.schedulerRegistry.deleteCronJob(id.toString())
        }
        this.addScheduleNotification(updatedTemplate)
      }

      return this.formatTemplateResponse(updatedTemplate)
    } catch (error) {
      throw new Error(error)
    }
  }

  async editPublishedNotification(id: number, dto: UpdateTemplateDto, currentUser?: any) {
    const oldTemplate = await this.findOneRaw(id)

    try {
      const newTemplateData = {
        platforms: dto.platforms || oldTemplate.platforms,
        sendType: oldTemplate.sendType,
        isSent: false,
        sendSchedule: oldTemplate.sendSchedule,
        sendInterval: oldTemplate.sendInterval,
        notificationType: dto.notificationType || oldTemplate.notificationType,
        categoryType: dto.categoryType || oldTemplate.categoryType,
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

      if (newTemplate.sendType === 'SEND_NOW') {
        const templateWithTranslations = await this.repo.findOne({
          where: { id: newTemplate.id },
          relations: ['translations', 'translations.image'],
        })

        if (templateWithTranslations && templateWithTranslations.translations) {
          console.log(`Sending updated notification immediately for template ${newTemplate.id}`)
          console.log(`Template has ${templateWithTranslations.translations.length} translations`)

          try {
            const sentCount =
              await this.notificationService.sendWithTemplate(templateWithTranslations)
            console.log(`sendWithTemplate returned: ${sentCount}`)

            if (sentCount && sentCount > 0) {
              await this.repo.update(newTemplate.id, { isSent: true, updatedAt: new Date() })
              console.log(`Updated notification sent successfully to ${sentCount} users`)
            } else {
              console.log(
                `No users received the updated notification (sentCount: ${sentCount}) - this might be because there are no users with valid FCM tokens in the database`,
              )

              await this.repo.update(newTemplate.id, { isSent: true, updatedAt: new Date() })
            }
          } catch (error) {
            console.error(
              `Error sending updated notification for template ${newTemplate.id}:`,
              error,
            )
          }
        } else {
          console.log(`No translations found for template ${newTemplate.id}, cannot send`)
        }
      } else if (newTemplate.sendType === 'SEND_SCHEDULE' && newTemplate.sendSchedule) {
        console.log(
          `Scheduling updated notification for template ${newTemplate.id} at ${newTemplate.sendSchedule}`,
        )
        this.addScheduleNotification(newTemplate)
      } else if (newTemplate.sendType === 'SEND_INTERVAL' && newTemplate.sendInterval) {
        console.log(`Scheduling updated notification with interval for template ${newTemplate.id}`)
        this.addIntervalNotification(newTemplate)
      }

      await this.forceDeleteTemplate(id)

      console.log(
        `Published notification edited: Old template ${id} deleted, new template ${newTemplate.id} created`,
      )

      return this.formatTemplateResponse(newTemplate)
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

          return this.formatTemplateAsNotification(template)
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
    const formattedTemplate = {
      templateId: template.id,
      platforms: template.platforms,
      sendType: template.sendType,
      notificationType: template.notificationType,
      categoryType: template.categoryType,
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
      translations: template.translations
        ? template.translations.map((translation) => ({
            id: translation.id,
            language: translation.language,
            type: template.notificationType,
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

    return formattedTemplate
  }

  private formatTemplateAsNotification(template: Template) {
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

    const author = template.publishedBy || template.updatedBy || template.createdBy || 'System'
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

    let platforms = []
    try {
      platforms =
        typeof template.platforms === 'string'
          ? JSON.parse(template.platforms)
          : template.platforms || []
    } catch (e) {
      platforms = ['ALL']
    }

    const bakongApp = platforms.includes('ALL') ? 'BAKONG' : platforms.join(',')

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
      bakongApp: bakongApp,
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

            const updateResult = await this.repo
              .createQueryBuilder()
              .update(Template)
              .set({ isSent: true })
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
      const templates = await this.repo.find({
        where: { notificationType: NotificationType.FLASH_NOTIFICATION },
        relations: ['translations', 'translations.image'],
        order: { priority: 'DESC', createdAt: 'DESC' },
      })
      const template = templates.find((t) => t.translations && t.translations.length > 0) || null
      if (!template) {
        throw new Error(`No templates found for type ${NotificationType.FLASH_NOTIFICATION}`)
      }
      return { template, notificationType: NotificationType.FLASH_NOTIFICATION }
    }

    if (dto.templateId) {
      const template = await this.findTemplateById(dto.templateId.toString())
      return { template, notificationType: template.notificationType }
    }

    const validatedRequest = dto.notificationType || dto.type
    const templates = await this.repo.find({
      where: { notificationType: validatedRequest },
      relations: ['translations', 'translations.image'],
      order: { priority: 'DESC', createdAt: 'DESC' },
    })
    const template = templates.find((t) => t.translations && t.translations.length > 0) || null
    if (!template) {
      throw new Error(`No templates found for type ${validatedRequest}`)
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
  ): Promise<{ template: Template; translation: TemplateTranslation } | null> {
    const userNotifications = await notificationRepo.find({
      where: {
        accountId,
      },
      select: ['templateId', 'sendCount', 'createdAt'],
    })

    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const todayNotifications = userNotifications.filter((notif) => {
      const createdAt = new Date(notif.createdAt)
      const isLast24Hours = createdAt >= last24Hours && createdAt <= now
      return isLast24Hours
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
    const seenTemplateIds = Object.entries(templateViewCounts)
      .filter(([_, count]) => (count as unknown as number) >= 2)
      .map(([templateId, _]) => parseInt(templateId))

    const availableTemplates = await this.repo.find({
      where: {
        notificationType: NotificationType.FLASH_NOTIFICATION,
        ...(seenTemplateIds.length > 0 && { id: Not(In(seenTemplateIds)) }),
      },
      relations: ['translations'],
      order: { createdAt: 'DESC' },
    })

    if (availableTemplates.length === 0) {
      return null
    }
    const selectedTemplate = availableTemplates[0]
    const translation = this.findBestTranslation(selectedTemplate, language)

    if (!translation) return null

    return { template: selectedTemplate, translation }
  }

  findBestTranslation(template: Template, language?: string): TemplateTranslation | null {
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
