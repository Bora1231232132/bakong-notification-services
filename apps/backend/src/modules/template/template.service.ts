import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  Inject,
  forwardRef,
  Logger,
  HttpException,
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
import { RejectTemplateDto } from './dto/reject-template.dto'
import { ImageService } from '../image/image.service'
import { PaginationUtils } from '@bakong/shared'
import {
  ErrorCode,
  ResponseMessage,
  SendType,
  NotificationType,
  TimezoneUtils,
  Language,
  ApprovalStatus,
  UserRole,
} from '@bakong/shared'
import { ValidationHelper } from 'src/common/util/validation.helper'
import { InboxResponseDto } from '../notification/dto/inbox-response.dto'
import { BaseFunctionHelper } from 'src/common/util/base-function.helper'

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
    private readonly baseFunctionHelper?: BaseFunctionHelper,
  ) {}

  async onModuleInit() {
    await this.pickPendingSchedule()
  }

  async create(dto: CreateTemplateDto, currentUser?: any, req?: any) {
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
        throw new BadRequestException(
          new BaseResponseDto({
            responseCode: 1,
            errorCode: ErrorCode.IMAGE_NOT_FOUND,
            responseMessage: ResponseMessage.IMAGE_NOT_FOUND,
          }),
        )
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
        throw new BadRequestException(
          new BaseResponseDto({
            errorCode: ErrorCode.VALIDATION_FAILED,
            responseMessage: 'Invalid sendSchedule date format',
            data: {
              providedDate: dto.sendSchedule,
              expectedFormat: 'ISO 8601 format (e.g., 2025-10-06T09:30:00)',
            },
          }),
        )
      }

      if (scheduledTime.isBefore(now)) {
        throw new BadRequestException(
          new BaseResponseDto({
            errorCode: ErrorCode.TEMPLATE_SEND_SCHEDULE_IN_PAST,
            responseMessage: ResponseMessage.TEMPLATE_SEND_SCHEDULE_IN_PAST,
            data: {
              scheduledTime: scheduledTime.format('h:mm A MMM D, YYYY'),
              currentTime: now.format('h:mm A MMM D, YYYY'),
              timezone: 'Asia/Phnom_Penh',
            },
          }),
        )
      }
    }

    if (dto.sendType === SendType.SEND_INTERVAL && dto.sendInterval) {
      const startTime = moment(dto.sendInterval.startAt)
      const endTime = moment(dto.sendInterval.endAt)
      const now = moment()

      if (!startTime.isValid()) {
        throw new BadRequestException(
          new BaseResponseDto({
            errorCode: ErrorCode.VALIDATION_FAILED,
            responseMessage: 'Invalid sendInterval.startAt date format',
            data: {
              providedDate: dto.sendInterval.startAt,
              expectedFormat: 'ISO 8601 format (e.g., 2025-10-06T09:30:00)',
            },
          }),
        )
      }

      if (!endTime.isValid()) {
        throw new BadRequestException(
          new BaseResponseDto({
            errorCode: ErrorCode.VALIDATION_FAILED,
            responseMessage: 'Invalid sendInterval.endAt date format',
            data: {
              providedDate: dto.sendInterval.endAt,
              expectedFormat: 'ISO 8601 format (e.g., 2025-10-06T09:40:00)',
            },
          }),
        )
      }

      if (startTime.isBefore(now)) {
        throw new BadRequestException(
          new BaseResponseDto({
            errorCode: ErrorCode.TEMPLATE_SEND_SCHEDULE_IN_PAST,
            responseMessage: 'sendInterval.startAt cannot be in the past',
            data: {
              startTime: startTime.format('h:mm A MMM D, YYYY'),
              currentTime: now.format('h:mm A MMM D, YYYY'),
              timezone: 'Asia/Phnom_Penh',
            },
          }),
        )
      }

      if (endTime.isBefore(startTime)) {
        throw new BadRequestException(
          new BaseResponseDto({
            errorCode: ErrorCode.VALIDATION_FAILED,
            responseMessage: 'sendInterval.endAt must be after startAt',
            data: {
              startTime: startTime.format('h:mm A MMM D, YYYY'),
              endTime: endTime.format('h:mm A MMM D, YYYY'),
              timezone: 'Asia/Phnom_Penh',
            },
          }),
        )
      }
    }

    if (
      dto.sendType === SendType.SEND_SCHEDULE &&
      !dto.sendSchedule &&
      dto.notificationType !== NotificationType.FLASH_NOTIFICATION
    ) {
      throw new BadRequestException(
        new BaseResponseDto({
          responseCode: 1,
          errorCode: ErrorCode.VALIDATION_FAILED,
          responseMessage: ResponseMessage.VALIDATION_FAILED,
        }),
      )
    }
    // Normalize platforms: ["IOS", "ANDROID"] -> ["ALL"]
    const normalizedPlatforms = ValidationHelper.parsePlatforms(dto.platforms)

    // Set approval status based on user role and template status
    // EDITOR and ADMIN create templates that need approval when isSent=true (submitting)
    // When isSent=false (saving as draft), they create in DRAFT state (null)
    let approvalStatus: ApprovalStatus | null

    if (currentUser?.role === UserRole.EDITOR || currentUser?.role === UserRole.ADMINISTRATOR) {
      // EDITOR and ADMIN: When submitting (isSent=true), set to PENDING for approval
      // When saving as draft (isSent=false), set to null (DRAFT)
      if (dto.isSent === true) {
        // Submitting for approval - goes to Pending tab
        approvalStatus = ApprovalStatus.PENDING
      } else {
        // Saving as draft - goes to Draft tab
        approvalStatus = null // DRAFT
      }
    } else {
      // Other roles (if any) auto-approve templates
      approvalStatus = ApprovalStatus.APPROVED
    }

    // CRITICAL: Validate if users exist BEFORE allowing submission (PENDING status)
    // Check BEFORE creating the template - if no users found, prevent submission and keep in draft
    // This check happens when user is trying to SUBMIT (approvalStatus will be PENDING)
    if (approvalStatus === ApprovalStatus.PENDING) {
      console.log(`🔵 [CREATE] User is trying to submit - validating users BEFORE creating template...`)
      
      // Create a temporary template object with the values to check
      const tempTemplate = {
        platforms: normalizedPlatforms,
        bakongPlatform: dto.bakongPlatform,
      } as Template
      
      const hasMatchingUsers = await this.validateMatchingUsers(tempTemplate)
      
      if (!hasMatchingUsers) {
        // No users match the platform requirements - prevent submission, keep in draft
        const platformInfo = `OS platform: ${tempTemplate.platforms?.join(', ') || 'ALL'}, Bakong platform: ${tempTemplate.bakongPlatform}`
        const platformName =
          tempTemplate.bakongPlatform === 'BAKONG_TOURIST'
            ? 'Bakong Tourist'
            : tempTemplate.bakongPlatform === 'BAKONG_JUNIOR'
            ? 'Bakong Junior'
            : 'Bakong'
        
        // Format: "No users found for Using {Platform} on {Bakong App} app."
        const osPlatforms = tempTemplate.platforms?.filter(p => p !== 'ALL').join(', ') || 'ALL'
        const errorMessage = `No users found for Using ${osPlatforms} on ${platformName} app.`
        
        this.logger.error(
          `❌ [CREATE] No users match platform requirements (${platformInfo}). Preventing template creation, keeping as draft.`,
        )
        
        // DON'T create the template - just throw error to prevent creation
        // Template will NOT be created in database
        throw new BadRequestException(
          new BaseResponseDto({
            responseCode: 1,
            errorCode: ErrorCode.NO_USERS_FOR_BAKONG_PLATFORM,
            responseMessage: errorMessage,
          }),
        )
      }
      
      console.log(`🔵 [CREATE] ✅ Users validated - template creation can proceed`)
    }

    // Determine initialIsSent based on sendType and approvalStatus
    // For SEND_SCHEDULE: always set isSent to false initially (will be sent at scheduled time)
    // For SEND_NOW: 
    //   - If approvalStatus is PENDING, set isSent to false (wait for approval)
    //   - If approvalStatus is APPROVED, set isSent based on dto.isSent
    //   - If saving as draft (isSent=false), set isSent to false
    const initialIsSent =
      dto.sendType === SendType.SEND_SCHEDULE
        ? false // Scheduled notifications are never sent immediately - wait for scheduled time
        : approvalStatus === ApprovalStatus.PENDING
          ? false // PENDING templates should not be sent until approved
          : dto.sendType === SendType.SEND_NOW
            ? dto.isSent !== false && approvalStatus === ApprovalStatus.APPROVED // Only send if approved
            : dto.isSent === true && approvalStatus === ApprovalStatus.APPROVED

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
      approvalStatus: approvalStatus,
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
          throw new BadRequestException(
            new BaseResponseDto({
              responseCode: 1,
              errorCode: ErrorCode.VALIDATION_FAILED,
              responseMessage: 'Title and content are required for published notifications',
              data: {},
            }),
          )
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
      relations: ['translations', 'translations.image', 'categoryTypeEntity'],
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

        // Check approval status before sending
        // ALL roles (including ADMINISTRATOR) must have APPROVED status to send
        // PENDING templates should wait for approver approval
        if (template.approvalStatus !== ApprovalStatus.APPROVED) {
          console.log(
            `🔵 [TEMPLATE CREATE] ⏸️ Skipping send - template ${template.id} has approvalStatus: ${template.approvalStatus}, waiting for approval`,
          )
          // Don't send - template is pending approval
          // Set isSent to false to ensure it stays in Pending tab
          await this.repo.update(template.id, { isSent: false })
          break
        }

        let sendResult: {
          successfulCount: number
          failedCount: number
          failedUsers?: string[]
          failedDueToInvalidTokens?: boolean
        } = {
          successfulCount: 0,
          failedCount: 0,
          failedUsers: [],
          failedDueToInvalidTokens: false,
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
          sendResult = {
            successfulCount: 0,
            failedCount: 0,
            failedUsers: [],
            failedDueToInvalidTokens: false,
          }

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

          // Check if failures are due to invalid tokens FIRST
          const failedDueToInvalidTokens = sendResult.failedDueToInvalidTokens === true
          const failedCount = sendResult.failedCount || 0

          // Only set savedAsDraftNoUsers if there were NO users attempted (failedCount === 0)
          // AND it's NOT due to invalid tokens
          // If failedCount > 0, it means users existed but all sends failed (not "no users available")
          const hasNoUsers =
            failedCount === 0 && sendResult.successfulCount === 0 && !failedDueToInvalidTokens

          if (hasNoUsers) {
            console.warn('⚠️ This might indicate:')
            console.warn('   1. No users have FCM tokens')
            console.warn('   2. No users match the platform filter')
            console.warn('   3. FCM token validation failed')
            console.warn('   4. Firebase FCM not initialized')
            console.warn('   5. No users in database')
            ;(template as any).savedAsDraftNoUsers = true
          } else if (failedDueToInvalidTokens && failedCount > 0) {
            // Users existed but all had invalid tokens - don't set savedAsDraftNoUsers
            console.warn(
              `⚠️ All ${failedCount} send attempts failed due to invalid tokens - keeping as draft`,
            )
            if (sendResult.failedUsers && sendResult.failedUsers.length > 0) {
              console.warn('❌ Failed users (invalid tokens):', sendResult.failedUsers)
            }
            // Don't set savedAsDraftNoUsers - this is invalid tokens, not "no users available"
          } else {
            // Users existed but all sends failed for other reasons
            console.warn(`⚠️ All ${failedCount} send attempts failed - keeping as draft`)
            if (sendResult.failedUsers && sendResult.failedUsers.length > 0) {
              console.warn('❌ Failed users:', sendResult.failedUsers)
            }
            // Don't set savedAsDraftNoUsers - this is a send failure, not "no users available"
          }

          await this.repo.update(template.id, { isSent: false })
        }

        // Include send result in template response
        ;(template as any).successfulCount = sendResult.successfulCount
        ;(template as any).failedCount = sendResult.failedCount
        ;(template as any).failedUsers = sendResult.failedUsers || []
        ;(template as any).failedDueToInvalidTokens = sendResult.failedDueToInvalidTokens || false
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

  async update(id: number, dto: UpdateTemplateDto, currentUser?: any, req?: any) {
    console.log(`\n🔵 [UPDATE] ========== START UPDATE REQUEST ==========`)
    console.log(`🔵 [UPDATE] Template ID: ${id}`)
    console.log(`🔵 [UPDATE] Current User: ${currentUser?.username || 'NO USER'} (Role: ${currentUser?.role || 'NO ROLE'})`)
    console.log(`🔵 [UPDATE] Request DTO:`, {
      isSent: dto.isSent,
      sendType: dto.sendType,
      sendSchedule: dto.sendSchedule,
      hasTranslations: !!dto.translations?.length,
      platforms: dto.platforms,
    })
    
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
    console.log(`🔵 [UPDATE] Current Template State:`, {
      id: template.id,
      isSent: template.isSent,
      sendType: template.sendType,
      approvalStatus: template.approvalStatus,
      sendSchedule: template.sendSchedule,
    })

    // Check if this is an approver using "Publish Now" on a PENDING template
    // In this case, we want to send the notification, not just edit it
    const isApproverPublishingPending = 
      currentUser?.role === UserRole.APPROVAL &&
      template.approvalStatus === ApprovalStatus.PENDING &&
      dto.isSent === true

    console.log(`🔵 [UPDATE] Is approver publishing pending template:`, {
      isApproverPublishingPending,
      userRole: currentUser?.role,
      templateApprovalStatus: template.approvalStatus,
      dtoIsSent: dto.isSent,
      templateIsSent: template.isSent,
    })

    // If template is APPROVED (not just sent), handle it as editing published notification
    // EXCEPT: If approver is publishing a PENDING template, we need to send it (not just edit)
    // NOTE: PENDING notifications with isSent=true should NOT route here - they can still be updated
    // Only truly APPROVED notifications should use editPublishedNotification
    if (template.approvalStatus === ApprovalStatus.APPROVED && !isApproverPublishingPending) {
      console.log(`🔵 [UPDATE] Routing to editPublishedNotification (template is APPROVED and not approver publishing pending)`)
      // Always use editPublishedNotification for approved/published notifications
      // This method handles updates without re-sending FCM notifications
      return await this.editPublishedNotification(id, dto, currentUser, req)
    }
    
    if (isApproverPublishingPending) {
      console.log(`🔵 [UPDATE] ✅ Approver publishing PENDING template - will go through send flow (not editPublishedNotification)`)
    }

    // Skip validation if approver is publishing a pending template (even if isSent is true from previous attempt)
    // This allows approver to re-send/publish the notification
    if (!isApproverPublishingPending) {
      console.log(`🔵 [UPDATE] Running validateModificationTemplate...`)
      this.validateModificationTemplate(template)
    } else {
      console.log(`🔵 [UPDATE] ⏭️ Skipping validateModificationTemplate for approver publishing pending template`)
    }

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
        console.log(`🔵 [UPDATE] Processing sendSchedule update:`, {
          provided: sendSchedule,
          current: template.sendSchedule,
          willUpdate: sendSchedule !== null && sendSchedule !== undefined,
        })
        if (sendSchedule) {
          const scheduledTime = moment.utc(sendSchedule)
          const existingScheduleTime = template.sendSchedule ? moment.utc(template.sendSchedule) : null
          
          if (!scheduledTime.isValid()) {
            throw new BadRequestException(
              new BaseResponseDto({
                responseCode: 1,
                errorCode: ErrorCode.VALIDATION_FAILED,
                responseMessage: 'Invalid sendSchedule date format',
                data: {
                  providedDate: sendSchedule,
                  expectedFormat: 'ISO 8601 format (e.g., 2025-10-06T09:30:00)',
                },
              }),
            )
          }
          
          // Check if this is the same schedule time as existing (preserving original schedule)
          const isPreservingExistingSchedule = existingScheduleTime && scheduledTime.isSame(existingScheduleTime)
          
          if (!isPreservingExistingSchedule) {
            // Only validate new schedule times (not when preserving existing)
            const now = moment.utc()
            // Add 1-minute grace period for network latency and clock skew
            if (scheduledTime.isBefore(now.clone().subtract(1, 'minute'))) {
              throw new BadRequestException(
                new BaseResponseDto({
                  responseCode: 1,
                  errorCode: ErrorCode.TEMPLATE_SEND_SCHEDULE_IN_PAST,
                  responseMessage: ResponseMessage.TEMPLATE_SEND_SCHEDULE_IN_PAST,
                  data: {
                    scheduledTime: scheduledTime.format('h:mm A MMM D, YYYY'),
                    currentTime: now.format('h:mm A MMM D, YYYY'),
                  },
                }),
              )
            }
          } else {
            console.log(`🔵 [UPDATE] ⏭️ Preserving existing schedule time (no validation needed):`, {
              utc: scheduledTime.toISOString(),
              cambodia: scheduledTime.clone().utcOffset(7).format('YYYY-MM-DD HH:mm:ss'),
            })
          }
          
          updateFields.sendSchedule = scheduledTime.toDate()
          console.log(`🔵 [UPDATE] ✅ Setting sendSchedule to:`, {
            utc: scheduledTime.toISOString(),
            local: scheduledTime.format('YYYY-MM-DD HH:mm:ss'),
            cambodia: scheduledTime.clone().utcOffset(7).format('YYYY-MM-DD HH:mm:ss'),
            isPreservingExisting: isPreservingExistingSchedule,
          })
        } else {
          updateFields.sendSchedule = null
          console.log(`🔵 [UPDATE] ✅ Clearing sendSchedule (null provided)`)
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

      // If ADMINISTRATOR or EDITOR edits a template, reset approval status based on current status
      if (currentUser?.role === UserRole.EDITOR || currentUser?.role === UserRole.ADMINISTRATOR) {
        const existingTemplate = await this.repo.findOne({ where: { id } })
        if (existingTemplate) {
          // If resubmitting an EXPIRED or REJECTED template (isSent: true), reset to PENDING for approval
          // This only happens when resubmitting from Draft tab
          if (
            (existingTemplate.approvalStatus === ('EXPIRED' as ApprovalStatus) ||
              existingTemplate.approvalStatus === ApprovalStatus.REJECTED) &&
            isSent === true
          ) {
            console.log(
              `🔄 [UPDATE] Resubmitting ${existingTemplate.approvalStatus} template ${id} - resetting approvalStatus to PENDING`,
            )
            updateFields.approvalStatus = ApprovalStatus.PENDING
            updateFields.approvedBy = null
            updateFields.approvedAt = null
            updateFields.reasonForRejection = null
          }
          // If editing a DRAFT template (null)
          else if (existingTemplate.approvalStatus === null || existingTemplate.approvalStatus === undefined) {
            // If submitting (isSent=true), change to PENDING for approval
            // If just updating (isSent=false or undefined), keep as DRAFT
            if (isSent === true) {
              console.log(`🔄 [UPDATE] Submitting DRAFT template ${id} - setting approvalStatus to PENDING`)
              updateFields.approvalStatus = ApprovalStatus.PENDING
              updateFields.approvedBy = null
              updateFields.approvedAt = null
              updateFields.reasonForRejection = null
            } else {
              // Just updating draft - keep it as DRAFT
              updateFields.reasonForRejection = null
            }
          }
          // If editing a PENDING template, keep it as PENDING (don't reset to DRAFT)
          // This allows editor to update pending templates without needing to resubmit
          // Preserve status when editing from Pending Approval tab
          else if (existingTemplate.approvalStatus === ApprovalStatus.PENDING) {
            // Keep approvalStatus as PENDING - don't change it
            // Just clear rejection reason if it exists
            updateFields.reasonForRejection = null
          }
          // If editing an APPROVED template, check if it's from Scheduled/Published tab
          // If it has sendSchedule (scheduled) or isSent=true without sendSchedule (published), preserve APPROVED status
          else if (existingTemplate.approvalStatus === ApprovalStatus.APPROVED) {
            // Preserve APPROVED status when editing from Scheduled or Published tabs
            // Check both existing template state and new sendSchedule value
            const existingIsScheduled = existingTemplate.sendSchedule !== null && existingTemplate.sendSchedule !== undefined
            const newIsScheduled = sendSchedule !== null && sendSchedule !== undefined
            const isScheduledTemplate = existingIsScheduled || newIsScheduled // Template is/was scheduled
            const isPublishedTemplate = existingTemplate.isSent === true && !existingIsScheduled
            
            if (isScheduledTemplate || isPublishedTemplate) {
              // Preserve APPROVED status - don't change it when editing from Scheduled/Published tabs
              console.log(
                `🔄 [UPDATE] Editing APPROVED template ${id} from ${isScheduledTemplate ? 'Scheduled' : 'Published'} tab - preserving APPROVED status`,
              )
              // Don't change approvalStatus - keep it as APPROVED
              // Just clear rejection reason if it exists
              updateFields.reasonForRejection = null
            } else {
              // Not from Scheduled/Published - reset to PENDING (this shouldn't normally happen)
              console.log(
                `🔄 [UPDATE] Editing APPROVED template ${id} - resetting approvalStatus to PENDING`,
              )
              updateFields.approvalStatus = ApprovalStatus.PENDING
              updateFields.approvedBy = null
              updateFields.approvedAt = null
            }
          }
          // If editing a REJECTED template without resubmitting (isSent: false or undefined), keep it as REJECTED
          else if (existingTemplate.approvalStatus === ApprovalStatus.REJECTED && isSent !== true) {
            // Keep approvalStatus as REJECTED - don't change it
            // Editor can edit and resubmit later
          }
        }
      }

      // CRITICAL: Check if user is trying to submit
      // This check happens when user is trying to SUBMIT (isSent: true or will set to PENDING)
      const isTryingToSubmit = 
        (isSent !== undefined && isSent === true) || 
        (isSent === undefined && dto.isSent === true) ||
        updateFields.approvalStatus === ApprovalStatus.PENDING ||
        (template.approvalStatus === ApprovalStatus.REJECTED && isSent !== undefined && isSent === true) ||
        (template.approvalStatus === ('EXPIRED' as ApprovalStatus) && isSent !== undefined && isSent === true)
      
      // Save approvalStatus separately - we'll update it after validation
      const pendingApprovalStatus = updateFields.approvalStatus
      // Temporarily remove approvalStatus from updateFields so we can save data first
      if (isTryingToSubmit && updateFields.approvalStatus === ApprovalStatus.PENDING) {
        delete updateFields.approvalStatus
      }

      // STEP 1: Save data changes first (fields and translations)
      // This ensures data is updated even if validation fails
      if (Object.keys(updateFields).length > 0) {
        await this.repo.update(id, updateFields)
      }

      if (translations && translations.length > 0) {
        const translationsMap = new Map()
        translations.forEach((t) => {
          translationsMap.set(t.language, t)
        })

        // Check if this is a draft (isSent === false)
        // Get the current template state to determine if it's a draft
        const existingTemplate = await this.repo.findOne({ where: { id } })
        const isDraft = existingTemplate?.isSent === false

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
        // This prevents empty translations from being filled with data from other languages
        if (!isDraft) {
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
        }

        for (const translation of translations) {
          const { language, title, content, image, linkPreview, id: translationId } = translation

          const titleValue = title !== undefined && title !== null ? String(title) : ''
          const contentValue = content !== undefined && content !== null ? String(content) : ''

          // If translation ID is provided, use it directly; otherwise find by templateId + language
          let item = null
          if (translationId) {
            item = await this.translationRepo.findOne({
              where: { id: translationId, templateId: id },
            })
            if (!item) {
              this.logger.warn(
                `⚠️ [Template Update] Translation ID ${translationId} not found for template ${id}, falling back to language matching`,
              )
            }
          }
          // Fallback to language matching if ID not provided or not found
          if (!item) {
            item = await this.translationRepo.findOneBy({ templateId: id, language: language })
          }

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

      // STEP 2: If trying to submit, validate users AFTER data is saved
      // This ensures data changes are preserved even if validation fails
      if (isTryingToSubmit && pendingApprovalStatus === ApprovalStatus.PENDING) {
        console.log(`🔵 [UPDATE] User is trying to submit - validating users AFTER data is saved...`)
        
        // Get the updated template with new platform values
        const updatedTemplate = await this.findOneRaw(id)
        
        // Create a template object with the updated values to check
        const tempTemplate = {
          ...updatedTemplate,
          platforms: updateFields.platforms !== undefined ? updateFields.platforms : updatedTemplate.platforms,
          bakongPlatform: updateFields.bakongPlatform !== undefined ? updateFields.bakongPlatform : updatedTemplate.bakongPlatform,
        } as Template
        
        const hasMatchingUsers = await this.validateMatchingUsers(tempTemplate)
        
        if (!hasMatchingUsers) {
          // No users match the platform requirements - keep data changes but set status to draft
          const platformInfo = `OS platform: ${tempTemplate.platforms?.join(', ') || 'ALL'}, Bakong platform: ${tempTemplate.bakongPlatform}`
          const platformName =
            tempTemplate.bakongPlatform === 'BAKONG_TOURIST'
              ? 'Bakong Tourist'
              : tempTemplate.bakongPlatform === 'BAKONG_JUNIOR'
              ? 'Bakong Junior'
              : 'Bakong'
          
          // Format: "No users found for Using {Platform} on {Bakong App} app."
          const osPlatforms = tempTemplate.platforms?.filter(p => p !== 'ALL').join(', ') || 'ALL'
          const errorMessage = `No users found for Using ${osPlatforms} on ${platformName} app.`
          
          this.logger.error(
            `❌ [UPDATE] No users match platform requirements (${platformInfo}). Data saved but keeping template in draft.`,
          )
          
          // Update approvalStatus to null (draft) - data changes are already saved
          await this.repo.update(id, {
            approvalStatus: null,
            reasonForRejection: null,
          })
          
          // Throw error to inform frontend
          throw new BadRequestException(
            new BaseResponseDto({
              responseCode: 1,
              errorCode: ErrorCode.NO_USERS_FOR_BAKONG_PLATFORM,
              responseMessage: errorMessage,
            }),
          )
        }
        
        console.log(`🔵 [UPDATE] ✅ Users validated - updating approvalStatus to PENDING`)
        
        // Validation passed - update approvalStatus to PENDING
        await this.repo.update(id, {
          approvalStatus: ApprovalStatus.PENDING,
          reasonForRejection: null, // Clear any previous rejection reason
        })
      }

      const updatedTemplate = await this.findOneRaw(id)
      console.log(`🔵 [UPDATE] Template after field updates:`, {
        id: updatedTemplate.id,
        isSent: updatedTemplate.isSent,
        sendType: updatedTemplate.sendType,
        approvalStatus: updatedTemplate.approvalStatus,
        sendSchedule: updatedTemplate.sendSchedule,
      })

      // Check if trying to publish a draft
      // For APPROVAL role using "Publish Now": send immediately regardless of sendType (keep original sendType in DB)
      // For others: only send if SEND_NOW with isSent=true
      const isApproverPublishNow = 
        currentUser?.role === UserRole.APPROVAL && 
        updatedTemplate.isSent === true
      
      // Check if this is a resubmission from rejected/expired state
      // If admin/editor resubmits a rejected template, it should NOT send immediately - wait for approver
      // Use `template` (original state before update) to check if it was REJECTED/EXPIRED
      const isResubmissionFromRejected = 
        (template.approvalStatus === ApprovalStatus.REJECTED || 
         template.approvalStatus === ('EXPIRED' as ApprovalStatus)) &&
        updatedTemplate.approvalStatus === ApprovalStatus.PENDING &&
        (currentUser?.role === UserRole.ADMINISTRATOR || currentUser?.role === UserRole.EDITOR)
      
      console.log(`🔵 [UPDATE] Send Decision Logic:`, {
        isApproverPublishNow,
        userRole: currentUser?.role,
        templateIsSent: updatedTemplate.isSent,
        templateSendType: updatedTemplate.sendType,
        isSendNow: updatedTemplate.sendType === SendType.SEND_NOW && updatedTemplate.isSent === true,
        isResubmissionFromRejected,
        originalApprovalStatus: template.approvalStatus,
        newApprovalStatus: updatedTemplate.approvalStatus,
      })
      
      // Don't send immediately if this is a resubmission from rejected state (wait for approver)
      // Don't send if approvalStatus is PENDING (wait for approval)
      // Only send if:
      // 1. Approver is using "Publish Now" (isApproverPublishNow), OR
      // 2. It's SEND_NOW with isSent=true AND it's NOT a resubmission from rejected state AND it's NOT PENDING
      const shouldSendImmediately = 
        isApproverPublishNow ||
        (updatedTemplate.sendType === SendType.SEND_NOW && 
         updatedTemplate.isSent === true && 
         !isResubmissionFromRejected &&
         updatedTemplate.approvalStatus !== ApprovalStatus.PENDING)
      
      console.log(`🔵 [UPDATE] shouldSendImmediately: ${shouldSendImmediately}`, {
        reason: isApproverPublishNow 
          ? 'Approver publish now' 
          : isResubmissionFromRejected 
            ? 'Resubmission from rejected - waiting for approver'
            : updatedTemplate.approvalStatus === ApprovalStatus.PENDING
              ? 'PENDING status - waiting for approval'
              : updatedTemplate.sendType === SendType.SEND_NOW && updatedTemplate.isSent === true
                ? 'SEND_NOW with isSent=true'
                : 'Conditions not met',
        approvalStatus: updatedTemplate.approvalStatus,
      })
      
      if (shouldSendImmediately) {
        console.log(`🔵 [UPDATE] ✅ Entering send block - will attempt to send notification`)
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

        // Check if this is a retry of a previously failed template
        const isRetry = !updatedTemplate.isSent || (updatedTemplate as any).failedUsers?.length > 0
        if (isRetry) {
          console.log(
            `🔄 [UPDATE] This appears to be a retry of a previously failed template. Ensuring user data is synced...`,
          )
          // Force user sync before retrying to ensure we have latest tokens
          // Note: sendWithTemplate already calls syncAllUsers internally, but we log this for clarity
          console.log(
            `🔄 [UPDATE] User sync will happen in sendWithTemplate - ensure mobile app has updated tokens via /send or /inbox API`,
          )
        }

        // Try to send the notification
        console.log(`🔵 [UPDATE] Fetching template with translations for sending...`)
        const templateWithTranslations = await this.repo.findOne({
          where: { id: updatedTemplate.id },
          relations: ['translations', 'translations.image', 'categoryTypeEntity'],
        })

        console.log(`🔵 [UPDATE] Template with translations:`, {
          id: templateWithTranslations?.id,
          hasTranslations: !!templateWithTranslations?.translations,
          translationsCount: templateWithTranslations?.translations?.length || 0,
          approvalStatus: templateWithTranslations?.approvalStatus,
          isSent: templateWithTranslations?.isSent,
        })

        if (templateWithTranslations && templateWithTranslations.translations) {
          console.log(`🔵 [UPDATE] ✅ Template has translations, proceeding with send logic`)
          // Check approval status before sending
          // ADMINISTRATOR and APPROVAL roles can bypass approval check
          // APPROVAL role can auto-approve and send immediately when using "Publish Now"
          const canBypassApproval = 
            currentUser?.role === UserRole.ADMINISTRATOR || 
            currentUser?.role === UserRole.APPROVAL
          
          if (!canBypassApproval && templateWithTranslations.approvalStatus !== ApprovalStatus.APPROVED) {
            throw new BadRequestException(
              new BaseResponseDto({
                responseCode: 1,
                errorCode: ErrorCode.NO_PERMISSION,
                responseMessage: 'Template must be approved before sending',
                data: {
                  approvalStatus: templateWithTranslations.approvalStatus,
                  templateId: templateWithTranslations.id,
                },
              }),
            )
          }
          
          // If APPROVAL role is publishing, ALWAYS auto-approve it first (regardless of current status)
          // This ensures the notification can be sent
          console.log(`🔵 [UPDATE] Checking auto-approval conditions:`, {
            userRole: currentUser?.role,
            isApproval: currentUser?.role === UserRole.APPROVAL,
            approvalStatus: templateWithTranslations.approvalStatus,
            isPending: templateWithTranslations.approvalStatus === ApprovalStatus.PENDING,
            isSent: isSent,
            isApproverPublishNow,
          })
          
          if (
            currentUser?.role === UserRole.APPROVAL &&
            isSent === true // Only auto-approve when actually sending
          ) {
            console.log(
              `✅ [UPDATE] APPROVAL role auto-approving template ${templateWithTranslations.id} before sending (current status: ${templateWithTranslations.approvalStatus})`,
            )
            const approvalUpdate = {
              approvalStatus: ApprovalStatus.APPROVED,
              approvedBy: currentUser?.username,
              approvedAt: new Date(),
            }
            console.log(`🔵 [UPDATE] Auto-approval update fields:`, approvalUpdate)
            const updateResult = await this.repo.update(templateWithTranslations.id, approvalUpdate)
            console.log(`🔵 [UPDATE] Auto-approval update result:`, updateResult)
            console.log(`🔵 [UPDATE] ✅ Auto-approval update completed`)
            
            // Re-fetch to get updated approval status - CRITICAL: use this for sending
            const refreshedTemplate = await this.repo.findOne({
              where: { id: templateWithTranslations.id },
              relations: ['translations', 'translations.image', 'categoryTypeEntity'],
            })
            if (refreshedTemplate) {
              console.log(`🔵 [UPDATE] Refreshed template approvalStatus: ${refreshedTemplate.approvalStatus}`)
              // Update the template object that will be used for sending
              templateWithTranslations.approvalStatus = ApprovalStatus.APPROVED
              templateWithTranslations.approvedBy = refreshedTemplate.approvedBy
              templateWithTranslations.approvedAt = refreshedTemplate.approvedAt
              console.log(`🔵 [UPDATE] ✅ Template object updated with APPROVED status for sending`)
            } else {
              console.error(`🔵 [UPDATE] ❌ Failed to refresh template after auto-approval`)
            }
          } else {
            console.log(`🔵 [UPDATE] ⏭️ Skipping auto-approval (conditions not met)`)
          }

          let sendResult: {
            successfulCount: number
            failedCount: number
            failedUsers?: string[]
            failedDueToInvalidTokens?: boolean
          } = { successfulCount: 0, failedCount: 0, failedUsers: [] }
          let noUsersForPlatform = false
          
          console.log(`🔵 [UPDATE] ========== CALLING sendWithTemplate ==========`)
          console.log(`🔵 [UPDATE] Template details for sending:`, {
            id: templateWithTranslations.id,
            approvalStatus: templateWithTranslations.approvalStatus,
            sendType: templateWithTranslations.sendType,
            platforms: templateWithTranslations.platforms,
            bakongPlatform: templateWithTranslations.bakongPlatform,
            translationsCount: templateWithTranslations.translations?.length || 0,
          })
          
          try {
            sendResult = await this.notificationService.sendWithTemplate(templateWithTranslations)
            console.log(`🔵 [UPDATE] ✅ sendWithTemplate completed successfully:`, {
              successfulCount: sendResult.successfulCount,
              failedCount: sendResult.failedCount,
              failedUsers: sendResult.failedUsers?.length || 0,
              failedDueToInvalidTokens: sendResult.failedDueToInvalidTokens,
            })

            // Log detailed failure information for debugging
            if (sendResult.failedCount > 0 && sendResult.failedUsers?.length) {
              console.log(
                `⚠️ [UPDATE] Failed to send to ${sendResult.failedCount} user(s):`,
                sendResult.failedUsers,
              )
              if (sendResult.failedDueToInvalidTokens) {
                console.log(
                  `⚠️ [UPDATE] Some failures were due to invalid tokens. Users should update tokens via mobile app.`,
                )
              }
            }
          } catch (error: any) {
            console.error(`🔵 [UPDATE] ❌ ERROR in sendWithTemplate:`, {
              message: error?.message,
              stack: error?.stack,
              code: error?.code,
              response: error?.response?.data,
            })
            // Check if error is about no users for bakongPlatform
            if (error?.message && error.message.includes('No users found for')) {
              noUsersForPlatform = true
              console.log(`🔵 [UPDATE] ⚠️ No users found for bakongPlatform - keeping as draft`)
            } else {
              console.error(`🔵 [UPDATE] ❌ Unexpected error during send - not related to no users`)
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
            return this.formatTemplateResponse(reloadedTemplate, req)
          } else if (sendResult.successfulCount > 0 || isApproverPublishNow) {
            // Successfully sent to at least some users, mark as published
            // OR if approver used "Publish Now", mark as published even if no users (approver's explicit action)
            // Even if some failed, if ANY succeeded, mark as published
            const wasApproverAction = isApproverPublishNow && sendResult.successfulCount === 0
            console.log(
              `[UPDATE] ✅ Template ${updatedTemplate.id} published successfully - sent to ${sendResult.successfulCount} user(s)${sendResult.failedCount > 0 ? ` (${sendResult.failedCount} failed)` : ''}${wasApproverAction ? ' (Approver published, marking as published)' : ''}`,
            )
            
            // Mark as published - ensure approvalStatus is also set to APPROVED if approver used "Publish Now"
            console.log(`🔵 [UPDATE] ========== MARKING AS PUBLISHED ==========`)
            const publishUpdateFields: any = {
              isSent: true,
              updatedAt: new Date(),
            }
            if (currentUser?.username) {
              publishUpdateFields.publishedBy = currentUser.username
            }
            // If approver used "Publish Now", always set approvalStatus to APPROVED (auto-approve)
            // AND change sendType to SEND_NOW and clear sendSchedule since they're sending immediately, not waiting for schedule
            if (isApproverPublishNow) {
              publishUpdateFields.approvalStatus = ApprovalStatus.APPROVED
              publishUpdateFields.approvedBy = currentUser?.username
              publishUpdateFields.approvedAt = new Date()
              // When approver clicks "Publish Now", they're choosing to send immediately
              // So change sendType to SEND_NOW and clear the schedule
              publishUpdateFields.sendType = SendType.SEND_NOW
              publishUpdateFields.sendSchedule = null
              console.log(
                `🔵 [UPDATE] ✅ Setting approvalStatus to APPROVED and changing sendType to SEND_NOW for approver publish action on template ${updatedTemplate.id}`,
              )
              console.log(
                `🔵 [UPDATE] ✅ Clearing sendSchedule since approver chose to send immediately (not waiting for scheduled time)`,
              )
            }
            console.log(`🔵 [UPDATE] Publish update fields:`, publishUpdateFields)
            const publishUpdateResult = await this.repo.update(updatedTemplate.id, publishUpdateFields)
            console.log(`🔵 [UPDATE] Publish update result:`, publishUpdateResult)
            console.log(`🔵 [UPDATE] ✅ Template marked as published in database`)
            
            // CRITICAL: Re-fetch template to verify approvalStatus was set correctly
            const verifyAfterPublish = await this.repo.findOne({
              where: { id: updatedTemplate.id },
            })
            console.log(`🔵 [UPDATE] Verification after publish update:`, {
              id: verifyAfterPublish?.id,
              isSent: verifyAfterPublish?.isSent,
              approvalStatus: verifyAfterPublish?.approvalStatus,
              approvedBy: verifyAfterPublish?.approvedBy,
              approvedAt: verifyAfterPublish?.approvedAt,
            })
            
            // If approvalStatus is still not APPROVED, force update it one more time
            if (isApproverPublishNow && verifyAfterPublish?.approvalStatus !== ApprovalStatus.APPROVED) {
              console.error(`🔵 [UPDATE] ❌ approvalStatus not set correctly, forcing update again`)
              await this.repo.update(updatedTemplate.id, {
                approvalStatus: ApprovalStatus.APPROVED,
                approvedBy: currentUser?.username,
                approvedAt: new Date(),
              })
              console.log(`🔵 [UPDATE] ✅ Forced approvalStatus update completed`)
            }
            
            console.log(
              `[UPDATE] Template published successfully, sent to ${sendResult.successfulCount} users`,
            )
            // Include send result in template response
            ;(updatedTemplate as any).successfulCount = sendResult.successfulCount
            ;(updatedTemplate as any).failedCount = sendResult.failedCount
            ;(updatedTemplate as any).failedUsers = sendResult.failedUsers || []
            ;(updatedTemplate as any).failedDueToInvalidTokens = sendResult.failedDueToInvalidTokens || false
          } else {
            // No users received the notification - revert to draft
            // This happens when successfulCount === 0
            // Distinguish between: no users found (failedCount === 0) vs all users failed (failedCount > 0)
            console.warn(
              `[UPDATE] No notifications were sent (successfulCount = 0, failedCount = ${sendResult.failedCount}) - reverting to draft`,
            )
            await this.repo.update(updatedTemplate.id, { isSent: false, updatedAt: new Date() })

            // Provide helpful error message based on failure reason
            if (sendResult.failedCount > 0 && sendResult.failedUsers?.length) {
              console.warn(
                `[UPDATE] All ${sendResult.failedCount} user(s) failed: ${sendResult.failedUsers.join(', ')}. Users may need to update their FCM tokens via mobile app.`,
              )
            } else {
              console.warn(
                `[UPDATE] No matching users found. Check platform filters and ensure users exist for bakongPlatform: ${templateWithTranslations.bakongPlatform || 'ALL'}`,
              )
            }

            // Reload template to get updated isSent value
            const reloadedTemplate = await this.findOneRaw(id)
            // CRITICAL: savedAsDraftNoUsers should ONLY be true when there are literally no users (failedCount === 0)
            // If failedCount > 0, it means users exist but all failed - this is NOT "no users"
            // Explicitly set to false if failedCount > 0 to prevent incorrect flag persistence
            if (sendResult.failedCount > 0) {
              ;(reloadedTemplate as any).savedAsDraftNoUsers = false
            } else {
              ;(reloadedTemplate as any).savedAsDraftNoUsers = sendResult.successfulCount === 0 && sendResult.failedCount === 0
            }
            // Include send result in template response
            ;(reloadedTemplate as any).successfulCount = sendResult.successfulCount
            ;(reloadedTemplate as any).failedCount = sendResult.failedCount
            ;(reloadedTemplate as any).failedUsers = sendResult.failedUsers || []
            ;(reloadedTemplate as any).failedDueToInvalidTokens = sendResult.failedDueToInvalidTokens || false
            return this.formatTemplateResponse(reloadedTemplate, req)
          }
        }
      }

      // Only schedule if it wasn't already sent immediately by approver
      // If approver used "Publish Now", it was already sent above, so don't schedule it
      const wasSentByApprover = 
        currentUser?.role === UserRole.APPROVAL && 
        updatedTemplate.isSent === true &&
        (updatedTemplate as any).successfulCount > 0
      
      if (updatedTemplate.sendType === SendType.SEND_SCHEDULE && updatedTemplate.sendSchedule && !wasSentByApprover) {
        if (this.schedulerRegistry.doesExist('cron', id.toString())) {
          this.schedulerRegistry.deleteCronJob(id.toString())
        }
        this.addScheduleNotification(updatedTemplate)
      }

      // Reload template to get latest state - CRITICAL: Use findOne to ensure we get the latest DB state
      console.log(`🔵 [UPDATE] ========== FINAL TEMPLATE STATE ==========`)
      const finalTemplate = await this.repo.findOne({
        where: { id },
        relations: ['translations', 'translations.image', 'categoryTypeEntity'],
      })
      
      if (!finalTemplate) {
        console.error(`🔵 [UPDATE] ❌ Failed to load final template`)
        throw new Error(`Template ${id} not found after update`)
      }
      
      console.log(`🔵 [UPDATE] Final template state from DB:`, {
        id: finalTemplate.id,
        isSent: finalTemplate.isSent,
        approvalStatus: finalTemplate.approvalStatus,
        sendType: finalTemplate.sendType,
        approvedBy: finalTemplate.approvedBy,
        approvedAt: finalTemplate.approvedAt,
        publishedBy: finalTemplate.publishedBy,
      })
      
      // Final safety check: if approver published but approvalStatus is still not APPROVED, fix it
      if (isApproverPublishNow && finalTemplate.approvalStatus !== ApprovalStatus.APPROVED) {
        console.error(`🔵 [UPDATE] ❌ CRITICAL: approvalStatus still not APPROVED in final state (${finalTemplate.approvalStatus}), fixing now`)
        await this.repo.update(id, {
          approvalStatus: ApprovalStatus.APPROVED,
          approvedBy: currentUser?.username,
          approvedAt: new Date(),
        })
        // Re-fetch one more time to get the fixed state
        const fixedTemplate = await this.repo.findOne({
          where: { id },
          relations: ['translations', 'translations.image', 'categoryTypeEntity'],
        })
        if (fixedTemplate) {
          console.log(`🔵 [UPDATE] ✅ Fixed approvalStatus in final template:`, fixedTemplate.approvalStatus)
          // Preserve flags and send results
          if ((updatedTemplate as any).savedAsDraftNoUsers) {
            ;(fixedTemplate as any).savedAsDraftNoUsers = true
          }
          if ((updatedTemplate as any).successfulCount !== undefined) {
            ;(fixedTemplate as any).successfulCount = (updatedTemplate as any).successfulCount
            ;(fixedTemplate as any).failedCount = (updatedTemplate as any).failedCount
            ;(fixedTemplate as any).failedUsers = (updatedTemplate as any).failedUsers
          }
          console.log(`🔵 [UPDATE] ========== END UPDATE REQUEST ==========\n`)
          return this.formatTemplateResponse(fixedTemplate, req)
        }
      }
      
      // Preserve flag if it was set
      if ((updatedTemplate as any).savedAsDraftNoUsers) {
        ;(finalTemplate as any).savedAsDraftNoUsers = true
      }
      // Preserve send result properties if they were set
      if ((updatedTemplate as any).successfulCount !== undefined) {
        ;(finalTemplate as any).successfulCount = (updatedTemplate as any).successfulCount
        ;(finalTemplate as any).failedCount = (updatedTemplate as any).failedCount
        ;(finalTemplate as any).failedUsers = (updatedTemplate as any).failedUsers
        ;(finalTemplate as any).failedDueToInvalidTokens = (updatedTemplate as any).failedDueToInvalidTokens
      }
      
      // CRITICAL: For approver "Publish Now", ensure send results are always included
      // If send results weren't preserved from updatedTemplate, check if we can infer from finalTemplate state
      if (isApproverPublishNow && (finalTemplate as any).successfulCount === undefined) {
        // If template is marked as sent and approved, but no send results, set defaults
        // This ensures the frontend always gets a response with send results
        if (finalTemplate.isSent === true && finalTemplate.approvalStatus === ApprovalStatus.APPROVED) {
          ;(finalTemplate as any).successfulCount = 0 // Will be updated by frontend if needed
          ;(finalTemplate as any).failedCount = 0
          ;(finalTemplate as any).failedUsers = []
          ;(finalTemplate as any).failedDueToInvalidTokens = false
          console.log(`🔵 [UPDATE] ⚠️ Approver publish: send results not preserved, setting defaults for response`)
        }
      }
      
      console.log(`🔵 [UPDATE] ========== END UPDATE REQUEST ==========\n`)
      return this.formatTemplateResponse(finalTemplate, req)
    } catch (error) {
      console.error('Error updating template:', error)
      if (error instanceof BadRequestException || error instanceof HttpException) {
        throw error
      }
      const errorMessage = error?.message || error?.toString() || 'Bad Request Exception'
      throw new BadRequestException({
        responseCode: 1,
        errorCode: ErrorCode.VALIDATION_FAILED,
        responseMessage: errorMessage,
        data: error?.data || null,
      })
    }
  }

  async submitForApproval(id: number, currentUser?: any): Promise<Template> {
    const template = await this.repo.findOne({ where: { id } })
    if (!template) {
      throw new BadRequestException(
        new BaseResponseDto({
          responseCode: 1,
          errorCode: ErrorCode.RECORD_NOT_FOUND,
          responseMessage: 'Template not found',
        }),
      )
    }

    // Only allow submission if in DRAFT (null) or REJECTED state
    if (template.approvalStatus === ApprovalStatus.PENDING) {
      throw new BadRequestException(
        new BaseResponseDto({
          responseCode: 1,
          errorCode: ErrorCode.VALIDATION_FAILED,
          responseMessage: 'Notification is already pending approval',
        }),
      )
    }

    if (template.approvalStatus === ApprovalStatus.APPROVED) {
      throw new BadRequestException(
        new BaseResponseDto({
          responseCode: 1,
          errorCode: ErrorCode.VALIDATION_FAILED,
          responseMessage: 'Notification is already published',
        }),
      )
    }

    // CRITICAL: Block submission of EXPIRED templates - user must update schedule time first
    if (template.approvalStatus === ApprovalStatus.EXPIRED) {
      // Check if sendSchedule is still in the past
      if (template.sendSchedule) {
        const scheduleDate = new Date(template.sendSchedule)
        const nowUTC = new Date()
        if (scheduleDate.getTime() <= nowUTC.getTime()) {
          // Format the schedule time for the error message (convert UTC to Cambodia time)
          const scheduleDateObj = new Date(template.sendSchedule)
          const datePart = scheduleDateObj.toLocaleDateString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'Asia/Phnom_Penh',
          })
          const timePart = scheduleDateObj.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Phnom_Penh',
          })
          const scheduleTimeDisplay = `${datePart} at ${timePart}`
          this.logger.warn(
            `⏰ [SUBMIT] Blocking submission of expired template ${id}: scheduled time ${template.sendSchedule} has passed`,
          )
          throw new BadRequestException(
            new BaseResponseDto({
              responseCode: 1,
              errorCode: ErrorCode.VALIDATION_FAILED,
              responseMessage: `The scheduled time was set to <strong>${scheduleTimeDisplay}</strong>, and it has now passed. Please go to update the schedule time and resubmitting again.`,
              data: {
                scheduleTimeDisplay: scheduleTimeDisplay,
              },
            }),
          )
        }
      } else {
        // Template is marked as EXPIRED but has no sendSchedule - still block it
        this.logger.warn(
          `⏰ [SUBMIT] Blocking submission of expired template ${id} (no sendSchedule)`,
        )
        throw new BadRequestException(
          new BaseResponseDto({
            responseCode: 1,
            errorCode: ErrorCode.VALIDATION_FAILED,
            responseMessage: 'This template has expired. Please update the schedule time before resubmitting.',
          }),
        )
      }
    }

    // Allow submission if approvalStatus is null (DRAFT) or REJECTED
    // No need to check for null explicitly - if it's not PENDING, APPROVED, or EXPIRED, it's allowed

    // CRITICAL: Validate if users exist BEFORE allowing submission
    // Check BEFORE updating the template - if no users found, prevent submission and keep in draft
    console.log(`🔵 [SUBMIT] Validating users for platform before allowing submission...`)
    const hasMatchingUsers = await this.validateMatchingUsers(template)
    
    if (!hasMatchingUsers) {
      // No users match the platform requirements - prevent submission, keep in draft
      const platformInfo = `OS platform: ${template.platforms?.join(', ') || 'ALL'}, Bakong platform: ${template.bakongPlatform}`
      const platformName =
        template.bakongPlatform === 'BAKONG_TOURIST'
          ? 'Bakong Tourist'
          : template.bakongPlatform === 'BAKONG_JUNIOR'
          ? 'Bakong Junior'
          : 'Bakong'
      
      // Format: "No users found for Using {Platform} on {Bakong App} app."
      const osPlatforms = template.platforms?.filter(p => p !== 'ALL').join(', ') || 'ALL'
      const errorMessage = `No users found for Using ${osPlatforms} on ${platformName} app.`
      
      this.logger.error(
        `❌ [SUBMIT] No users match platform requirements (${platformInfo}). Preventing submission, keeping template in draft.`,
      )
      
      // DON'T update the template - just throw error to prevent submission
      // Template will remain in draft/rejected status
      throw new BadRequestException(
        new BaseResponseDto({
          responseCode: 1,
          errorCode: ErrorCode.NO_USERS_FOR_BAKONG_PLATFORM,
          responseMessage: errorMessage,
        }),
      )
    }
    
    console.log(`🔵 [SUBMIT] ✅ Users validated - submission can proceed`)

    await this.repo.update(id, {
      approvalStatus: ApprovalStatus.PENDING,
      updatedBy: currentUser?.username,
      reasonForRejection: null, // Clear any previous rejection reason
    })

    return await this.findOneRaw(id)
  }

  async approve(id: number, currentUser?: any): Promise<Template> {
    const template = await this.repo.findOne({ where: { id } })
    if (!template) {
      throw new BadRequestException(
        new BaseResponseDto({
          responseCode: 1,
          errorCode: ErrorCode.RECORD_NOT_FOUND,
          responseMessage: 'Template not found',
        }),
      )
    }

    // Only allow approval of PENDING status
    if (template.approvalStatus !== ApprovalStatus.PENDING) {
      throw new BadRequestException(
        new BaseResponseDto({
          responseCode: 1,
          errorCode: ErrorCode.VALIDATION_FAILED,
          responseMessage: `Cannot approve notification with status: ${template.approvalStatus}. Only PENDING notifications can be approved.`,
        }),
      )
    }

    // Store original status to determine if this was a resubmission from rejected state
    const wasPending = template.approvalStatus === ApprovalStatus.PENDING
    const originalIsSent = template.isSent

    // Check if this is a scheduled notification and if the scheduled time has passed
    if (template.sendSchedule && template.sendType === SendType.SEND_SCHEDULE) {
      const scheduledTime = moment.utc(template.sendSchedule)
      const now = moment.utc()
      
      // Log the time comparison for debugging
      this.logger.log(`⏰ [APPROVE] Checking scheduled time for template ${id}:`, {
        scheduledTimeUTC: scheduledTime.toISOString(),
        scheduledTimeCambodia: scheduledTime.clone().utcOffset(7).format('YYYY-MM-DD HH:mm:ss'),
        currentTimeUTC: now.toISOString(),
        currentTimeCambodia: now.clone().utcOffset(7).format('YYYY-MM-DD HH:mm:ss'),
        timeDifferenceMinutes: scheduledTime.diff(now, 'minutes'),
        hasPassed: scheduledTime.isBefore(now.clone().subtract(1, 'minute')),
      })
      
      // Check if scheduled time has passed (with 1 minute grace period for clock skew)
      if (scheduledTime.isBefore(now.clone().subtract(1, 'minute'))) {
        this.logger.warn(
          `⏰ [APPROVE] Template ${id} scheduled time ${scheduledTime.toISOString()} (${scheduledTime.clone().utcOffset(7).format('YYYY-MM-DD HH:mm:ss')} Cambodia) has passed (current: ${now.toISOString()} / ${now.clone().utcOffset(7).format('YYYY-MM-DD HH:mm:ss')} Cambodia). Marking as expired.`,
        )
        
        // Mark as expired (not rejected) - preserve all original data including sendSchedule
        const expiredReason = 'Scheduled time has passed. Please contact team member to update the schedule first.'
        
        // Fetch template first to ensure we preserve all fields
        const templateToExpire = await this.repo.findOne({ where: { id } })
        if (!templateToExpire) {
          throw new BadRequestException(
            new BaseResponseDto({
              responseCode: 1,
              errorCode: ErrorCode.TEMPLATE_NOT_FOUND,
              responseMessage: ResponseMessage.TEMPLATE_NOT_FOUND,
            }),
          )
        }
        
        // Update only approval-related fields, preserve everything else (especially sendSchedule)
        // Using string literal cast since EXPIRED was just added to the enum and shared package may need rebuild
        templateToExpire.approvalStatus = 'EXPIRED' as ApprovalStatus
        templateToExpire.approvedBy = currentUser?.username
        templateToExpire.approvedAt = new Date()
        templateToExpire.reasonForRejection = expiredReason
        // NOTE: We intentionally do NOT update sendSchedule or any other fields
        // This preserves the original schedule time that admin created/updated
        
        await this.repo.save(templateToExpire)
        
        this.logger.log(`✅ [APPROVE] Template ${id} marked as expired due to passed scheduled time (data preserved)`)
        
        // Throw exception to inform frontend that it was expired
        throw new BadRequestException(
          new BaseResponseDto({
            responseCode: 1,
            errorCode: ErrorCode.VALIDATION_FAILED,
            responseMessage: expiredReason,
            data: {
              autoExpired: true,
              expiredReason: expiredReason,
            },
          }),
        )
      } else {
        this.logger.log(`✅ [APPROVE] Template ${id} scheduled time is valid (not passed yet)`)
      }
    }

    // First, update approval status
    await this.repo.update(id, {
      approvalStatus: ApprovalStatus.APPROVED,
      approvedBy: currentUser?.username,
      approvedAt: new Date(),
    })

    // Check if this is a scheduled notification
    // If it has a schedule, don't send yet - keep it in Scheduled tab until scheduled time
    const updatedTemplate = await this.findOneRaw(id)
    
    // Check if scheduled: must have sendSchedule AND sendType must be SEND_SCHEDULE
    const isScheduledNotification = 
      updatedTemplate.sendSchedule !== null && 
      updatedTemplate.sendSchedule !== undefined &&
      updatedTemplate.sendType === SendType.SEND_SCHEDULE
    
    this.logger.log(`🔍 [APPROVE] Template ${id} check:`, {
      sendSchedule: updatedTemplate.sendSchedule,
      sendType: updatedTemplate.sendType,
      isSent: updatedTemplate.isSent,
      isScheduledNotification,
      approvalStatus: updatedTemplate.approvalStatus,
    })
    
    if (isScheduledNotification) {
      // Scheduled notification - don't send immediately, keep in Scheduled tab
      // The scheduler will handle sending when the scheduled time arrives
      this.logger.log(
        `📅 [APPROVE] Template ${id} is scheduled for ${updatedTemplate.sendSchedule.toISOString()} - keeping in Scheduled tab until scheduled time`,
      )
      // Ensure isSent is false so it stays in Scheduled tab
      // approvalStatus is already set to APPROVED above
      await this.repo.update(id, { isSent: false })
      // Register the scheduled job so it will be sent at the scheduled time
      const templateForScheduler = await this.findOneRaw(id)
      this.addScheduleNotification(templateForScheduler)
      this.logger.log(
        `✅ [APPROVE] Scheduled notification job registered for template ${id} - will auto-send at scheduled time`,
      )
    } else if (updatedTemplate.sendType === SendType.SEND_NOW && !updatedTemplate.sendSchedule) {
      // Non-scheduled notification - send immediately after approval
      // Note: isSent might be true if template was resubmitted from rejected state (PENDING status)
      // In that case, we still need to send it because it hasn't actually been sent to users yet
      // wasPending is already set above (line 1585) - it's always true here since we only approve PENDING templates
      this.logger.log(
        `📤 [APPROVE] Template ${id} is SEND_NOW - checking if needs to send:`,
        {
          wasPending,
          originalIsSent,
          currentIsSent: updatedTemplate.isSent,
          willSend: wasPending || !updatedTemplate.isSent,
        },
      )
      
      // Send if: (1) it was PENDING (fresh approval) OR (2) it hasn't been sent yet
      // wasPending is always true here (we only approve PENDING templates), so we always send
      if (wasPending || !updatedTemplate.isSent) {
        this.logger.log(
          `📤 [APPROVE] Template ${id} is ready to send after approval - sending automatically`,
        )
        this.logger.log(
          `📤 [APPROVE] Template ${id} platform info: OS platforms: ${updatedTemplate.platforms?.join(', ') || 'ALL'}, Bakong platform: ${updatedTemplate.bakongPlatform}`,
        )
        try {
          const sendResult = await this.notificationService.sendWithTemplate(updatedTemplate)
          this.logger.log(
            `📤 [APPROVE] Template ${id} send result: successfulCount: ${sendResult.successfulCount}, failedCount: ${sendResult.failedCount}`,
          )
          
          // Check if no users received the notification successfully
          // This happens when:
          // 1. No users match the OS platform filter (Android/iOS) - returns { successfulCount: 0, failedCount: 0 }
          // 2. No users match the Bakong platform filter - throws error (caught below)
          // 3. All users have invalid tokens - returns { successfulCount: 0, failedCount > 0 }
          // In ALL cases where successfulCount is 0, we should revert approval
          if (sendResult.successfulCount === 0) {
            const platformInfo = `OS platform: ${updatedTemplate.platforms?.join(', ') || 'ALL'}, Bakong platform: ${updatedTemplate.bakongPlatform}`
            
            // Determine rejection reason based on the scenario
            const rejectionReason = sendResult.failedCount === 0
              ? `No users found matching the platform requirements (${platformInfo}). Please ensure there are registered users for the specified platforms before approving.`
              : `No users received the notification. ${sendResult.failedCount} user(s) matched the platform requirements but all failed (likely invalid tokens). Please ensure there are registered users with valid tokens for the specified platforms before approving.`
            
            if (sendResult.failedCount === 0) {
              // No users matched the platform filter at all (OS platform or Bakong platform mismatch)
              this.logger.error(
                `❌ [APPROVE] Failed to send template ${id} - no users match platform requirements (${platformInfo}). Rejecting template.`,
              )
            } else {
              // Users matched but all failed (likely invalid tokens or other issues)
              this.logger.error(
                `❌ [APPROVE] Failed to send template ${id} - ${sendResult.failedCount} user(s) matched but all failed. No users received the notification. Rejecting template.`,
              )
            }
            
            // Reject the template with the reason instead of just reverting to PENDING
            await this.repo.update(id, {
              approvalStatus: ApprovalStatus.REJECTED,
              isSent: false,
              approvedBy: null,
              approvedAt: null,
              reasonForRejection: rejectionReason,
            })
            
            throw new BadRequestException(
              new BaseResponseDto({
                responseCode: 1,
                errorCode: ErrorCode.NO_USERS_FOR_BAKONG_PLATFORM,
                responseMessage: rejectionReason,
              }),
            )
          }
          
          // Mark as sent after successful send (only if at least one user received it)
          await this.repo.update(id, { isSent: true })
          this.logger.log(`✅ [APPROVE] Template ${id} sent and published successfully to ${sendResult.successfulCount} user(s)`)
        } catch (error: any) {
          // Check if error is about no users found (platform mismatch)
          // For BadRequestException with BaseResponseDto, check error.response structure
          const errorResponse = error?.response || error
          const errorCode = errorResponse?.errorCode
          const errorMessage = errorResponse?.responseMessage || error?.message || String(error)
          
          // Check by errorCode first (most reliable), then by message content
          const isNoUsersError =
            errorCode === ErrorCode.NO_USERS_FOR_BAKONG_PLATFORM ||
            errorMessage.includes('No users found matching the platform requirements') ||
            errorMessage.includes('No users found for') ||
            errorMessage.includes('no users found') ||
            errorMessage.includes('No users match')

          if (isNoUsersError) {
            // CRITICAL: Reject the template if no users found
            // This prevents templates from being marked as approved when they can't be sent
            // Note: We may have already rejected it above, but do it again to be safe
            const rejectionReason = errorResponse?.responseMessage || errorMessage || 'No users found for the specified platform. Please ensure there are registered users for this platform before approving.'
            
            this.logger.error(
              `❌ [APPROVE] Failed to send template ${id} - no users found for platform. Rejecting template.`,
            )
            await this.repo.update(id, {
              approvalStatus: ApprovalStatus.REJECTED,
              isSent: false,
              approvedBy: null,
              approvedAt: null,
              reasonForRejection: rejectionReason,
            })
            // Throw error so frontend can show warning message
            throw new BadRequestException(
              new BaseResponseDto({
                responseCode: 1,
                errorCode: ErrorCode.NO_USERS_FOR_BAKONG_PLATFORM,
                responseMessage: rejectionReason,
              }),
            )
          } else {
            // Other errors - log and re-throw so controller can handle it
            // Don't mark as sent if there was an error during sending
            this.logger.error(`❌ [APPROVE] Failed to send template ${id} after approval:`, error)
            // Re-throw the error so the controller can return proper error response
            throw error
          }
        }
      } else {
        // Already sent and not pending - this means it was already published before
        this.logger.log(
          `✅ [APPROVE] Template ${id} was already sent (not pending), keeping published status`,
        )
        // Ensure isSent is true (should already be, but make sure)
        await this.repo.update(id, { isSent: true })
      }
    } else if (updatedTemplate.isSent === true && updatedTemplate.sendType !== SendType.SEND_SCHEDULE) {
      // Already sent and not scheduled - no need to update isSent
      this.logger.log(`✅ [APPROVE] Template ${id} was already sent, keeping published status`)
    } else if (updatedTemplate.sendType !== SendType.SEND_SCHEDULE) {
      // Other non-scheduled cases - mark as sent
      this.logger.log(`✅ [APPROVE] Template ${id} marking as sent (non-scheduled notification)`)
      await this.repo.update(id, { isSent: true })
    } else {
      // Scheduled notification that's already sent - shouldn't happen, but handle gracefully
      this.logger.warn(
        `⚠️ [APPROVE] Template ${id} is scheduled but isSent is true - this shouldn't happen`,
      )
    }

    return await this.findOneRaw(id)
  }

  async reject(id: number, dto: RejectTemplateDto, currentUser?: any): Promise<Template> {
    const template = await this.repo.findOne({ where: { id } })
    if (!template) {
      throw new BadRequestException(
        new BaseResponseDto({
          responseCode: 1,
          errorCode: ErrorCode.RECORD_NOT_FOUND,
          responseMessage: 'Template not found',
        }),
      )
    }

    // Only allow rejection of PENDING status
    if (template.approvalStatus !== ApprovalStatus.PENDING) {
      throw new BadRequestException(
        new BaseResponseDto({
          responseCode: 1,
          errorCode: ErrorCode.VALIDATION_FAILED,
          responseMessage: `Cannot reject notification with status: ${template.approvalStatus}. Only PENDING notifications can be rejected.`,
        }),
      )
    }

    await this.repo.update(id, {
      approvalStatus: ApprovalStatus.REJECTED,
      approvedBy: currentUser?.username,
      approvedAt: new Date(),
      reasonForRejection: dto.reasonForRejection,
    })

    return await this.findOneRaw(id)
  }

  async editPublishedNotification(id: number, dto: UpdateTemplateDto, currentUser?: any, req?: any) {
    const oldTemplate = await this.findOneRaw(id)

    try {
      // When editing a published notification, always preserve published status
      // Force sendType to SEND_NOW and isSent to true to keep it in published tab
      const isEditingPublished = oldTemplate.isSent === true

      // UPDATE the existing template instead of creating a new one to preserve the ID
      const updateFields: any = {}
      if (dto.platforms !== undefined) {
        updateFields.platforms = ValidationHelper.parsePlatforms(dto.platforms)
      }
      if (dto.bakongPlatform !== undefined) {
        updateFields.bakongPlatform = dto.bakongPlatform
      }
      // Always keep as SEND_NOW when editing published notification
      if (isEditingPublished) {
        updateFields.sendType = SendType.SEND_NOW
        updateFields.isSent = true
        updateFields.sendSchedule = null // Clear any schedule to keep in published tab
        updateFields.sendInterval = null // Clear any interval to keep in published tab
      } else {
        if (dto.sendType !== undefined) updateFields.sendType = dto.sendType
        if (dto.isSent !== undefined) updateFields.isSent = dto.isSent
        if (dto.sendSchedule !== undefined) {
          // Validate and parse sendSchedule for scheduled notifications
          if (dto.sendSchedule) {
            const scheduledTime = moment.utc(dto.sendSchedule)
            if (!scheduledTime.isValid()) {
              throw new BadRequestException({
                responseCode: 1,
                errorCode: ErrorCode.VALIDATION_FAILED,
                responseMessage: 'Invalid sendSchedule date format',
                data: {
                  providedDate: dto.sendSchedule,
                  expectedFormat: 'ISO 8601 format (e.g., 2025-10-06T09:30:00)',
                },
              })
            }
            const now = moment.utc()
            // Add 1-minute grace period for network latency and clock skew
            if (scheduledTime.isBefore(now.clone().subtract(1, 'minute'))) {
              throw new BadRequestException(
                new BaseResponseDto({
                  responseCode: 1,
                  errorCode: ErrorCode.TEMPLATE_SEND_SCHEDULE_IN_PAST,
                  responseMessage: ResponseMessage.TEMPLATE_SEND_SCHEDULE_IN_PAST,
                  data: {
                    scheduledTime: scheduledTime.format('h:mm A MMM D, YYYY'),
                    currentTime: now.format('h:mm A MMM D, YYYY'),
                  },
                }),
              )
            }
            updateFields.sendSchedule = scheduledTime.toDate()
          } else {
            updateFields.sendSchedule = null
          }
        }
      }
      if (dto.notificationType !== undefined) {
        updateFields.notificationType = dto.notificationType
      }
      if (dto.categoryTypeId !== undefined) {
        updateFields.categoryTypeId = dto.categoryTypeId
      }
      if (currentUser?.username) {
        updateFields.updatedBy = currentUser.username
      }
      updateFields.updatedAt = new Date()

      // Update the existing template
      if (Object.keys(updateFields).length > 0) {
        await this.repo.update(id, updateFields)
      }

      // Update translations - preserve existing IDs
      if (dto.translations && dto.translations.length > 0) {
        for (const translation of dto.translations) {
          const { language, title, content, image, linkPreview, id: translationId } = translation

          const titleValue = title !== undefined && title !== null ? String(title) : ''
          const contentValue = content !== undefined && content !== null ? String(content) : ''

          // If translation ID is provided, use it directly; otherwise find by templateId + language
          let existingTranslation = null
          if (translationId) {
            existingTranslation = await this.translationRepo.findOne({
              where: { id: translationId, templateId: id },
            })
            if (!existingTranslation) {
              this.logger.warn(
                `⚠️ [editPublishedNotification] Translation ID ${translationId} not found for template ${id}, falling back to language matching`,
              )
            }
          }
          // Fallback to language matching if ID not provided or not found
          if (!existingTranslation) {
            existingTranslation = await this.translationRepo.findOneBy({
              templateId: id,
              language: language,
            })
          }

          let imageId = null
          if (translation.image !== undefined) {
            if (image && String(image).trim() !== '') {
              const imageExists = await this.imageService.validateImageExists(image)
              if (imageExists) {
                imageId = image
              }
            } else {
              imageId = null
            }
          } else if (existingTranslation) {
            imageId = existingTranslation.imageId
          }

          if (existingTranslation) {
            // Update existing translation
            await this.translationRepo.update(existingTranslation.id, {
              title: titleValue,
              content: contentValue,
              imageId: imageId,
              linkPreview: linkPreview,
              updatedAt: new Date(),
            })
          } else {
            // Create new translation if it doesn't exist
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
        console.log(
          `✅ [editPublishedNotification] Template ${id} updated and marked as published (no FCM resend, kept in published tab)`,
        )

        // Return the updated template (same ID)
        const templateToReturn = await this.findOneRaw(id)
        return this.formatTemplateResponse(templateToReturn, req)
      } else {
        // Handle non-published notifications (drafts being edited)
        const updatedTemplate = await this.findOneRaw(id)

        // Check if this is converting a scheduled notification to immediate send (Publish now from Schedule page)
        // OR if approver is clicking "Publish Now" on an APPROVED scheduled template
        const isApproverPublishingScheduled = 
          currentUser?.role === UserRole.APPROVAL &&
          oldTemplate.approvalStatus === ApprovalStatus.APPROVED &&
          oldTemplate.sendType === SendType.SEND_SCHEDULE &&
          oldTemplate.isSent === false &&
          dto.isSent === true // Approver clicked "Publish Now"
        
        const isConvertingToImmediateSend = 
          (updatedTemplate.sendType === SendType.SEND_NOW && 
           updatedTemplate.isSent === true &&
           oldTemplate.isSent === false) || // Was not sent before
          isApproverPublishingScheduled // OR approver publishing scheduled template

        if (isConvertingToImmediateSend) {
          if (isApproverPublishingScheduled) {
            console.log(
              `🚀 [editPublishedNotification] Approver clicking "Publish Now" on APPROVED scheduled template ${id} - sending immediately`,
            )
          } else {
            console.log(
              `🚀 [editPublishedNotification] Converting scheduled notification ${id} to immediate send - sending now`,
            )
          }

          // Fetch template with translations for sending
          const templateWithTranslations = await this.repo.findOne({
            where: { id },
            relations: ['translations', 'translations.image', 'categoryTypeEntity'],
          })

          if (templateWithTranslations && templateWithTranslations.translations) {
            try {
              // Send notification immediately
              const sendResult = await this.notificationService.sendWithTemplate(
                templateWithTranslations,
              )

              if (sendResult && sendResult.successfulCount > 0) {
                // If approver is publishing scheduled template, change sendType to SEND_NOW and clear schedule
                if (isApproverPublishingScheduled) {
                  await this.repo.update(id, {
                    sendType: SendType.SEND_NOW,
                    sendSchedule: null,
                    isSent: true,
                    publishedBy: currentUser?.username,
                    updatedAt: new Date(),
                  })
                  console.log(
                    `✅ [editPublishedNotification] Template ${id} sent immediately and changed to SEND_NOW (schedule cleared)`,
                  )
                } else {
                  await this.markAsPublished(id)
                }
                console.log(
                  `✅ [editPublishedNotification] Template ${id} sent immediately to ${sendResult.successfulCount} user(s)${sendResult.failedCount > 0 ? ` (${sendResult.failedCount} failed)` : ''}`,
                )
              } else {
                console.log(
                  `⚠️ [editPublishedNotification] Template ${id} updated but no notifications sent`,
                )
              }
            } catch (error) {
              console.error(
                `❌ [editPublishedNotification] Failed to send template ${id} immediately:`,
                error,
              )
              // Don't throw error - template was updated, just log the send failure
            }
          } else {
            console.error(
              `❌ [editPublishedNotification] Template ${id} has no translations, cannot send`,
            )
          }
        } else if (updatedTemplate.sendType === 'SEND_SCHEDULE' && updatedTemplate.sendSchedule) {
          console.log(
            `Scheduling updated notification for template ${id} at ${updatedTemplate.sendSchedule}`,
          )

          // Validate if there are matching users before scheduling
          // If no matching users, keep as draft (isSent: false)
          if (updatedTemplate.isSent === true) {
            const hasMatchingUsers = await this.validateMatchingUsers(updatedTemplate)
            if (!hasMatchingUsers) {
              console.log(
                `🔵 [EDIT PUBLISHED] ⚠️ No matching users found for scheduled notification - keeping as draft`,
              )
              await this.repo.update(id, { isSent: false, updatedAt: new Date() })
              console.log('✅ Template kept as draft due to no matching users')
            }
          }

          this.addScheduleNotification(updatedTemplate)
        } else if (updatedTemplate.sendType === 'SEND_INTERVAL' && updatedTemplate.sendInterval) {
          console.log(`Scheduling updated notification with interval for template ${id}`)
          this.addIntervalNotification(updatedTemplate)
        }

        console.log(`📝 [editPublishedNotification] Template ${id} updated`)

        // Return the updated template (same ID)
        const templateToReturn = await this.findOneRaw(id)
        return this.formatTemplateResponse(templateToReturn, req)
      }
    } catch (error) {
      console.error('Error editing published notification:', error)
      // Preserve the original error if it's already an HttpException or Error
      if (error instanceof BadRequestException || error instanceof HttpException) {
        throw error
      }
      // If it's a BaseResponseDto wrapped in an Error, extract it
      if (error instanceof BaseResponseDto) {
        throw new BadRequestException(error)
      }
      // Otherwise, wrap in BadRequestException with proper message
      const errorMessage = error?.message || error?.toString() || 'Bad Request Exception'
      throw new BadRequestException({
        responseCode: 1,
        errorCode: ErrorCode.VALIDATION_FAILED,
        responseMessage: errorMessage,
        data: error?.data || null,
      })
    }
  }

  async remove(id: number, req?: any) {
    const template = await this.findOneRaw(id)
    this.validateModificationTemplate(template, true)

    if (template.isSent) {
      await this.notificationService.deleteNotificationsByTemplateId(id)
    }

    await this.repo.delete(id)
    return this.formatTemplateResponse(template, req)
  }

  async forceDeleteTemplate(id: number) {
    const template = await this.findOneRaw(id)

    if (template.isSent) {
      await this.notificationService.deleteNotificationsByTemplateId(id)
    }

    await this.repo.delete(id)
    return this.formatTemplateResponse(template)
  }

  all(language?: string, req?: any) {
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
      return items.map((item) => this.formatTemplateResponse(item, req))
    })
  }

  async findTemplates(page?: number, size?: number, isAscending?: boolean, language?: string, req?: any) {
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

    const formattedItems = items.map((item) => this.formatTemplateResponse(item, req))
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
    req?: any,
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
      throw new BadRequestException(
        new BaseResponseDto({
          responseCode: 1,
          errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
          responseMessage: error?.message || 'Failed to fetch templates',
          data: {
            error: error?.message,
            context: 'findTemplatesAsNotifications',
          },
        }),
      )
    }
  }

  async findOne(id: number, req?: any) {
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

    return this.formatTemplateResponse(template, req)
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
  private formatTemplateResponse(template: Template, req?: any) {
    // Parse platforms to ensure it's always an array in the response
    const parsedPlatforms = ValidationHelper.parsePlatforms(template.platforms)

    const baseUrl = this.baseFunctionHelper
      ? this.baseFunctionHelper.getBaseUrl(req)
      : 'http://localhost:4005'
    
    // Detect V2 version
    const isV2 = (req as any)?.version === '2' || req?.url?.includes('/v2/') || req?.originalUrl?.includes('/v2/')

    const categoryIcon = (isV2 && template.categoryTypeId)
      ? `${baseUrl}/api/v2/category-type/${template.categoryTypeId}/icon`
      : undefined

    // Determine request language for categoryType translation
    const language = (req?.query?.language || req?.body?.language || 'EN') as Language

    const formattedTemplate: any = {
      templateId: template.id,
      platforms: parsedPlatforms, // Always return as array for frontend
      bakongPlatform: template.bakongPlatform,
      sendType: template.sendType,
      notificationType: template.notificationType,
      categoryType: isV2
        ? (InboxResponseDto.getCategoryDisplayName(template.categoryTypeEntity, language) || 'Other')
        : template.categoryTypeEntity?.name,
      categoryTypeId: template.categoryTypeId,
      categoryIcon: categoryIcon,
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
      approvalStatus: template.approvalStatus,
      approvedBy: template.approvedBy,
      approvedAt: template.approvedAt ? moment(template.approvedAt).toISOString() : null,
      reasonForRejection: template.reasonForRejection || null,
      // Preserve send result properties if they exist
      successfulCount: (template as any).successfulCount,
      failedCount: (template as any).failedCount,
      failedUsers: (template as any).failedUsers,
      failedDueToInvalidTokens: (template as any).failedDueToInvalidTokens,
      failedUserDetails: (template as any).failedUserDetails, // Include detailed error info for debugging
      // Preserve savedAsDraftNoUsers flag if it exists
      // CRITICAL: Only set to true if explicitly set AND failedCount === 0 (no users attempted)
      // If failedCount > 0, it means users exist but all failed - this is NOT "no users"
      savedAsDraftNoUsers: (template as any).savedAsDraftNoUsers === true &&
        ((template as any).failedCount === undefined || (template as any).failedCount === 0),
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
    // CRITICAL: Only set to true if failedCount === 0 (no users attempted)
    // If failedCount > 0, it means users exist but all failed - this is NOT "no users"
    if ((template as any).savedAsDraftNoUsers === true &&
        ((template as any).failedCount === undefined || (template as any).failedCount === 0)) {
      formattedTemplate.savedAsDraftNoUsers = true
    } else {
      // Explicitly set to false if failedCount > 0 to prevent incorrect flag persistence
      formattedTemplate.savedAsDraftNoUsers = false
    }

    // Include send result properties if they exist
    if ((template as any).successfulCount !== undefined) {
      formattedTemplate.successfulCount = (template as any).successfulCount
      formattedTemplate.failedCount = (template as any).failedCount
      formattedTemplate.failedUsers = (template as any).failedUsers || []
      formattedTemplate.failedDueToInvalidTokens = (template as any).failedDueToInvalidTokens || false
      formattedTemplate.failedUserDetails = (template as any).failedUserDetails || [] // Include detailed error info for debugging
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
    } else if (
      (template.sendType === 'SEND_SCHEDULE' || template.sendType === 'SEND_INTERVAL') &&
      template.approvalStatus === ApprovalStatus.APPROVED
    ) {
      // Only set status to 'scheduled' if it's approved and not yet sent
      // Drafts with schedule should still be 'draft' status until approved
      status = 'scheduled'
    } else {
      status = 'draft'
    }

    // Get username first
    const username = template.publishedBy || template.updatedBy || template.createdBy || 'System'
    // Get displayName from map if available, otherwise fallback to username
    const author = displayNameMap?.get(username) || username
    let dateToShow: Date
    // For scheduled notifications, always show the scheduled time if it exists
    // This ensures users see the correct scheduled time, not the update time
    if (template.sendSchedule) {
      dateToShow = template.sendSchedule
    } else if (template.isSent && template.updatedAt) {
      dateToShow = template.updatedAt
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
      updatedAt: template.updatedAt,
      scheduledTime: template.sendSchedule
        ? (() => {
            // Ensure we're working with UTC to avoid double timezone conversion
            // Convert to ISO string first to ensure UTC representation
            const scheduleDate = template.sendSchedule instanceof Date 
              ? template.sendSchedule 
              : new Date(template.sendSchedule)
            // Always use ISO string (UTC) to ensure correct timezone conversion
            const utcISOString = scheduleDate.toISOString()
            return TimezoneUtils.formatCambodiaTime(utcISOString)
          })()
        : null,
      platforms: platforms,
      bakongPlatform: template.bakongPlatform || null,
      approvalStatus: template.approvalStatus,
      approvedBy: template.approvedBy,
      approvedAt: template.approvedAt,
    }
  }

  validateModificationTemplate(template: Template, allowDelete = false) {
    // Only block updates if template is APPROVED (not just sent)
    // PENDING notifications with isSent=true should still be updatable
    if (template.isSent && template.approvalStatus === ApprovalStatus.APPROVED && !allowDelete) {
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

            // When scheduled notification is sent, mark as published but preserve original data
            // Keep sendType as SEND_SCHEDULE and sendSchedule to preserve the original scheduled time
            // This allows the notification to show "(scheduled time)" in the Published tab
            const updateResult = await this.repo
              .createQueryBuilder()
              .update(Template)
              .set({
                isSent: true,
                // Preserve sendType as SEND_SCHEDULE (don't change to SEND_NOW)
                // Preserve sendSchedule to keep the original scheduled date/time
                // Only set isSent to true to mark it as published
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
              relations: ['translations', 'translations.image', 'categoryTypeEntity'],
            })

            if (templateWithTranslations && templateWithTranslations.translations) {
              const sentCount = await this.notificationService.sendWithTemplate(
                templateWithTranslations,
              )

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
            relations: ['translations', 'translations.image', 'categoryTypeEntity'],
          })

          if (templateWithTranslations && templateWithTranslations.translations) {
            const sentCount = await this.notificationService.sendWithTemplate(
              templateWithTranslations,
            )

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
        relations: ['translations', 'translations.image', 'categoryTypeEntity'],
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
      relations: ['translations', 'translations.image', 'categoryTypeEntity'],
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
      relations: ['translations', 'translations.image', 'categoryTypeEntity'],
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

    const templateViewCounts = todayNotifications.reduce((acc, notif) => {
      const templateId = notif.templateId
      if (templateId) {
        acc[templateId] = (acc[templateId] || 0) + 1
      }
      return acc
    }, {} as Record<number, number>)

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
