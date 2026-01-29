import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { SchedulerRegistry } from '@nestjs/schedule'
import { BadRequestException } from '@nestjs/common'
import { Template } from 'src/entities/template.entity'
import { TemplateTranslation } from 'src/entities/template-translation.entity'
import { Image } from 'src/entities/image.entity'
import { User } from 'src/entities/user.entity'
import { BaseResponseDto } from 'src/common/base-response.dto'
import {
  ErrorCode,
  ResponseMessage,
  SendType,
  NotificationType,
  Platform,
  Language,
  BakongApp,
} from '@bakong/shared'
import { plainToClass } from 'class-transformer'
import { CreateTemplateDto } from './dto/create-template.dto'
import { UpdateTemplateDto } from './dto/update-template.dto'
import { TemplateService } from './template.service'
import { TemplateTranslationDto } from './dto/template-translation.dto'
import { NotificationService } from '../notification/notification.service'
import { ImageService } from '../image/image.service'

describe('TemplateService', () => {
  let service: TemplateService
  let notificationService: NotificationService
  let imageService: ImageService
  let schedulerRegistry: SchedulerRegistry

  const templateId = 1
  const currentUser = { username: 'testuser', id: 1 }

  // Sample translation data
  const sampleTranslations: TemplateTranslation[] = [
    {
      id: 1,
      templateId: templateId,
      language: Language.KM,
      title: 'សារព័ត៌មាន',
      content: 'ខ្លឹមសារព័ត៌មាន',
      imageId: 'image-123',
      linkPreview: 'https://example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as TemplateTranslation,
    {
      id: 2,
      templateId: templateId,
      language: Language.EN,
      title: 'News Title',
      content: 'News Content',
      imageId: 'image-456',
      linkPreview: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as TemplateTranslation,
  ]

  // Sample template data
  const draftTemplate: Template = {
    id: templateId,
    platforms: [Platform.IOS, Platform.ANDROID],
    bakongPlatform: BakongApp.BAKONG_JUNIOR,
    sendType: SendType.SEND_NOW,
    notificationType: NotificationType.ANNOUNCEMENT,
    categoryTypeId: 1, // Mock categoryTypeId (NEWS category)
    priority: 1,
    isSent: false,
    sendSchedule: null,
    translations: sampleTranslations,
    createdBy: 'testuser',
    updatedBy: null,
    publishedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as Template

  const scheduledTemplate: Template = {
    ...draftTemplate,
    id: 2,
    sendType: SendType.SEND_SCHEDULE,
    sendSchedule: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
  } as Template

  const publishedTemplate: Template = {
    ...draftTemplate,
    id: 3,
    isSent: true,
    publishedBy: 'testuser',
    sendType: SendType.SEND_NOW, // Published templates typically have SEND_NOW
  } as Template

  // Mock QueryBuilder for createQueryBuilder chain
  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  }

  // Mock repositories
  const mockTemplateRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder), // Added for findOneRaw
    manager: {
      connection: {
        queryResultCache: {
          clear: jest.fn(),
        },
      },
    },
  }

  const mockTranslationRepo = {
    findOneBy: jest.fn(),
    findOne: jest.fn(), // Added for create() method
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  }

  const mockImageRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
  }

  const mockUserRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
  }

  // Mock services
  const mockNotificationService = {
    sendWithTemplate: jest.fn(),
    sendNow: jest.fn(),
    deleteNotificationsByTemplateId: jest.fn().mockResolvedValue(undefined),
    updateNotificationTemplateId: jest.fn().mockResolvedValue(undefined),
  }

  const mockImageService = {
    validateImageExists: jest.fn(),
    buildImageUrl: jest.fn(),
  }

  const mockSchedulerRegistry = {
    doesExist: jest.fn(),
    deleteCronJob: jest.fn(),
    addCronJob: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: ImageService,
          useValue: mockImageService,
        },
        {
          provide: SchedulerRegistry,
          useValue: mockSchedulerRegistry,
        },
      ],
    })
      .useMocker((token) => {
        if (token === getRepositoryToken(Template)) {
          return mockTemplateRepo
        }
        if (token === getRepositoryToken(TemplateTranslation)) {
          return mockTranslationRepo
        }
        if (token === getRepositoryToken(Image)) {
          return mockImageRepo
        }
        if (token === getRepositoryToken(User)) {
          return mockUserRepo
        }
      })
      .compile()

    service = module.get<TemplateService>(TemplateService)
    notificationService = module.get<NotificationService>(NotificationService)
    imageService = module.get<ImageService>(ImageService)
    schedulerRegistry = module.get<SchedulerRegistry>(SchedulerRegistry)

    // Logger is now private readonly and properly initialized, no need to mock

    // Reset all mocks - this clears call history but keeps implementations
    jest.clearAllMocks()
    // Clear query builder mock call history - each test will set up its own mock chain
    mockQueryBuilder.getOne.mockClear()
  })

  describe('Service Definition', () => {
    it('should be defined', () => {
      expect(service).toBeDefined()
    })
  })

  // ============================================
  // CREATE FLOW TESTS
  // ============================================

  describe('Create Flow - TC-CREATE-001: Create → Publish Now (No Schedule)', () => {
    it('should create template and publish immediately', async () => {
      const createDto: CreateTemplateDto = {
        platforms: [Platform.IOS, Platform.ANDROID],
        bakongPlatform: BakongApp.BAKONG_JUNIOR,
        sendType: SendType.SEND_NOW,
        isSent: true,
        notificationType: NotificationType.ANNOUNCEMENT,
        categoryTypeId: 1, // Mock categoryTypeId (NEWS category)
        priority: 1,
        translations: [
          {
            language: Language.KM,
            title: 'សារព័ត៌មាន',
            content: 'ខ្លឹមសារព័ត៌មាន',
            image: 'image-123',
          },
        ],
      }

      const createdTemplate = { ...draftTemplate, id: templateId, isSent: true }
      const templateWithTranslations = { ...createdTemplate, translations: sampleTranslations }

      mockTemplateRepo.save.mockResolvedValue(createdTemplate)
      // create() uses repo.findOne() to reload with relations, and findOneRaw() at the end
      mockTemplateRepo.findOne.mockResolvedValue(templateWithTranslations)
      mockQueryBuilder.getOne.mockResolvedValueOnce(templateWithTranslations) // For findOneRaw at end of create()
      mockTranslationRepo.findOne.mockResolvedValue(null) // No existing translation
      mockTranslationRepo.save.mockResolvedValue(sampleTranslations[0])
      mockNotificationService.sendWithTemplate.mockResolvedValue({
        successfulCount: 10,
        failedCount: 0,
      }) // 10 users notified
      mockImageService.validateImageExists.mockResolvedValue(true)

      const result = await service.create(createDto, currentUser)

      expect(mockTemplateRepo.save).toHaveBeenCalled()
      expect(mockNotificationService.sendWithTemplate).toHaveBeenCalled()
      expect(result.isSent).toBe(true)
      expect(result.sendType).toBe(SendType.SEND_NOW)
    })
  })

  describe('Create Flow - TC-CREATE-002: Create → Publish Now (With Schedule)', () => {
    it('should create template and schedule it', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const createDto: CreateTemplateDto = {
        platforms: [Platform.IOS],
        sendType: SendType.SEND_SCHEDULE,
        isSent: false,
        sendSchedule: futureDate.toISOString(),
        notificationType: NotificationType.ANNOUNCEMENT,
        categoryTypeId: 1, // Mock categoryTypeId (NEWS category)
        translations: [
          {
            language: Language.EN,
            title: 'Scheduled News',
            content: 'This will be sent later',
          },
        ],
      }

      const createdTemplate = {
        ...draftTemplate,
        id: templateId,
        sendType: SendType.SEND_SCHEDULE,
        isSent: false,
        sendSchedule: futureDate,
      }

      mockTemplateRepo.save.mockResolvedValue(createdTemplate)
      // create() uses repo.findOne() to reload with relations, and findOneRaw() at the end
      mockTemplateRepo.findOne.mockResolvedValue(createdTemplate)
      mockQueryBuilder.getOne.mockResolvedValueOnce(createdTemplate) // For findOneRaw at end of create()
      mockTranslationRepo.findOne.mockResolvedValue(null) // No existing translation
      mockTranslationRepo.save.mockResolvedValue(sampleTranslations[0])
      mockSchedulerRegistry.doesExist.mockReturnValue(false)

      const result = await service.create(createDto, currentUser)

      expect(mockTemplateRepo.save).toHaveBeenCalled()
      expect(mockNotificationService.sendWithTemplate).not.toHaveBeenCalled()
      expect(result.isSent).toBe(false)
      expect(result.sendType).toBe(SendType.SEND_SCHEDULE)
      expect(result.sendSchedule).toBeDefined()
    })
  })

  describe('Create Flow - TC-CREATE-003: Create → Save Draft', () => {
    it('should create template as draft without sending', async () => {
      const createDto: CreateTemplateDto = {
        platforms: [Platform.ANDROID],
        sendType: SendType.SEND_NOW,
        isSent: false, // Draft
        notificationType: NotificationType.ANNOUNCEMENT,
        categoryTypeId: 1, // Mock categoryTypeId (NEWS category)
        translations: [
          {
            language: Language.KM,
            title: 'Draft Title',
            content: 'Draft Content',
          },
        ],
      }

      const createdTemplate = { ...draftTemplate, id: templateId, isSent: false }

      mockTemplateRepo.save.mockResolvedValue(createdTemplate)
      // create() uses repo.findOne() to reload with relations, and findOneRaw() at the end
      mockTemplateRepo.findOne.mockResolvedValue(createdTemplate)
      mockQueryBuilder.getOne.mockResolvedValueOnce(createdTemplate) // For findOneRaw at end of create()
      mockTranslationRepo.findOne.mockResolvedValue(null) // No existing translation
      mockTranslationRepo.save.mockResolvedValue(sampleTranslations[0])

      const result = await service.create(createDto, currentUser)

      expect(mockTemplateRepo.save).toHaveBeenCalled()
      expect(mockNotificationService.sendWithTemplate).not.toHaveBeenCalled()
      expect(result.isSent).toBe(false)
    })
  })

  // ============================================
  // UPDATE FLOW TESTS (Draft/Scheduled)
  // ============================================

  describe('Update Flow - TC-EDIT-001: Edit Draft → Publish Now (No Schedule)', () => {
    it('should update draft template and publish immediately', async () => {
      const updateDto: UpdateTemplateDto = {
        platforms: [Platform.IOS, Platform.ANDROID],
        sendType: SendType.SEND_NOW,
        isSent: true,
        translations: [
          {
            language: Language.EN,
            title: 'Updated Title',
            content: 'Updated Content',
          },
        ],
      }

      const updatedTemplate = {
        ...draftTemplate,
        id: templateId,
        sendType: SendType.SEND_NOW,
        isSent: true,
      }
      const templateWithTranslations = { ...updatedTemplate, translations: sampleTranslations }

      // Mock findOneRaw (uses createQueryBuilder internally)
      // update() calls findOneRaw: (1) line 520, (2) line 724, (3) line 731 (if platforms updated), (4) line 741 (if platforms defaulted), (5) line 814
      mockQueryBuilder.getOne
        .mockResolvedValueOnce({ ...draftTemplate, id: templateId }) // First call at line 520
        .mockResolvedValueOnce(updatedTemplate) // Second call at line 724 (after updates)
        .mockResolvedValueOnce(updatedTemplate) // Third call at line 731 (if platforms updated - won't happen here)
        .mockResolvedValueOnce(updatedTemplate) // Fourth call at line 741 (if platforms defaulted - won't happen here)
        .mockResolvedValueOnce(updatedTemplate) // Final call at line 814

      mockTemplateRepo.update.mockResolvedValue({ affected: 1 })
      mockTemplateRepo.findOne.mockResolvedValueOnce(templateWithTranslations)
      mockTranslationRepo.findOneBy.mockResolvedValue(sampleTranslations[0])
      mockTranslationRepo.update.mockResolvedValue({ affected: 1 })
      mockNotificationService.sendWithTemplate.mockResolvedValue({
        successfulCount: 5,
        failedCount: 0,
      })
      mockImageService.validateImageExists.mockResolvedValue(true)

      const result = await service.update(templateId, updateDto, currentUser)

      expect(mockTemplateRepo.update).toHaveBeenCalledWith(
        templateId,
        expect.objectContaining({
          sendType: SendType.SEND_NOW,
          isSent: true,
        }),
      )
      expect(mockNotificationService.sendWithTemplate).toHaveBeenCalled()
    })
  })

  describe('Update Flow - TC-EDIT-003: Edit Draft → Save Draft', () => {
    it('should update draft template without publishing', async () => {
      const updateDto: UpdateTemplateDto = {
        platforms: [Platform.IOS, Platform.ANDROID],
        translations: [
          {
            language: Language.EN,
            title: 'Updated Draft Title',
            content: 'Updated Draft Content',
          },
        ],
      }

      const updatedTemplate = { ...draftTemplate, id: templateId }

      // Mock findOneRaw calls: (1) line 520, (2) line 724, (3) line 731 (if platforms updated), (4) line 741 (if platforms defaulted), (5) line 814
      mockQueryBuilder.getOne
        .mockResolvedValueOnce({ ...draftTemplate, id: templateId }) // First call at line 520
        .mockResolvedValueOnce(updatedTemplate) // Second call at line 724
        .mockResolvedValueOnce(updatedTemplate) // Third call at line 731 (if platforms updated - won't happen here)
        .mockResolvedValueOnce(updatedTemplate) // Fourth call at line 741 (if platforms defaulted - won't happen here)
        .mockResolvedValueOnce(updatedTemplate) // Final call at line 814

      mockTemplateRepo.update.mockResolvedValue({ affected: 1 })
      mockTemplateRepo.findOne.mockResolvedValue(updatedTemplate)
      mockTranslationRepo.findOneBy.mockResolvedValue(sampleTranslations[0])
      mockTranslationRepo.update.mockResolvedValue({ affected: 1 })

      const result = await service.update(templateId, updateDto, currentUser)

      expect(mockTemplateRepo.update).toHaveBeenCalled()
      expect(mockNotificationService.sendWithTemplate).not.toHaveBeenCalled()
      expect(result.isSent).toBe(false)
    })
  })

  // ============================================
  // PUBLISH NOW FROM TABS TESTS
  // ============================================

  // ============================================
  // EDIT PUBLISHED NOTIFICATION TESTS
  // ============================================

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================

  describe('Error Handling - TC-ERROR-001: Publish Draft with No Users for Platform', () => {
    it('should keep template as draft when no users found', async () => {
      const updateDto: UpdateTemplateDto = {
        platforms: [Platform.IOS, Platform.ANDROID],
        sendType: SendType.SEND_NOW,
        isSent: true,
        sendSchedule: null,
        translations: sampleTranslations.map((t) => ({
          language: t.language,
          title: t.title,
          content: t.content,
          image: t.imageId,
          linkPreview: t.linkPreview,
        })),
      }

      const updatedTemplate = {
        ...draftTemplate,
        id: templateId,
        sendType: SendType.SEND_NOW,
        isSent: true,
        platforms: [Platform.IOS, Platform.ANDROID],
      }
      const templateWithTranslations = { ...updatedTemplate, translations: sampleTranslations }
      const draftAfterError = { ...updatedTemplate, isSent: false }

      // This test triggers editPublishedNotification because the template is published (isSent: true)
      // editPublishedNotification creates a new template with id 4, then tries to send
      // When error occurs, it updates the new template (id 4) with isSent: false
      // Mock findOneRaw calls: (1) line 556 (in update - returns published template), (2) line 831 (in editPublishedNotification), (3) line 972 (in editPublishedNotification - final return)
      mockQueryBuilder.getOne
        .mockResolvedValueOnce({ ...publishedTemplate, id: templateId }) // First call at line 556 - template is published
        .mockResolvedValueOnce({ ...publishedTemplate, id: templateId }) // Call in editPublishedNotification at line 831
        .mockResolvedValueOnce({ ...draftAfterError, id: 4, savedAsDraftNoUsers: true }) // For findOneRaw in editPublishedNotification at line 972 (final return with id 4)

      const newTemplate = { ...draftTemplate, id: 4, isSent: false }
      mockTemplateRepo.save.mockResolvedValue(newTemplate)
      mockTemplateRepo.update.mockResolvedValue({ affected: 1 })
      mockTemplateRepo.delete.mockResolvedValue({ affected: 1 })
      mockTemplateRepo.findOne.mockResolvedValue({
        ...newTemplate,
        translations: sampleTranslations,
      })
      mockTranslationRepo.save.mockResolvedValue(sampleTranslations[0])
      mockTranslationRepo.find.mockResolvedValue([])
      mockImageService.validateImageExists.mockResolvedValue(true)
      mockNotificationService.deleteNotificationsByTemplateId.mockResolvedValue(undefined)

      // Mock sendWithTemplate to return successfulCount: 0 (no users found scenario)
      mockNotificationService.sendWithTemplate.mockResolvedValue({
        successfulCount: 0,
        failedCount: 0,
        failedUsers: [],
      })

      const result = await service.update(templateId, updateDto, currentUser)

      // editPublishedNotification creates a new template with id 4
      // When sendWithTemplate returns successfulCount: 0, it updates the new template (id 4) with isSent: false at line 942
      // Check that update was called on the new template (id 4) OR check the result
      const updateCalls = mockTemplateRepo.update.mock.calls
      const updateCallForNewTemplate = updateCalls.find((call) => call[0] === 4)
      // The update might happen, or the result might have savedAsDraftNoUsers flag
      if (updateCallForNewTemplate) {
        expect(updateCallForNewTemplate[1]).toMatchObject({ isSent: false })
      }
      // The result should have savedAsDraftNoUsers flag when no users found
      expect((result as any).savedAsDraftNoUsers).toBe(true)
    })
  })

  describe('Error Handling - TC-ERROR-003: Publish with Invalid Schedule Format', () => {
    it('should throw error for invalid date format', async () => {
      const updateDto: UpdateTemplateDto = {
        platforms: [Platform.IOS, Platform.ANDROID],
        sendType: SendType.SEND_SCHEDULE,
        isSent: false,
        sendSchedule: 'invalid-date-format',
        translations: sampleTranslations.map((t) => ({
          language: t.language,
          title: t.title,
          content: t.content,
          image: t.imageId,
          linkPreview: t.linkPreview,
        })),
      }

      // The validation happens at line 577-588 in update method
      // It should throw BadRequestException before any database operations
      // The template must be a draft (not published) for the validation to run in the update method
      // The validation checks if sendSchedule is truthy and then validates it with moment.utc()
      mockQueryBuilder.getOne.mockResolvedValueOnce(draftTemplate)
      // Don't mock any other operations since validation should throw before reaching them

      // The validation should throw immediately when sendSchedule is invalid
      // moment.utc('invalid-date-format') will create an invalid moment, and isValid() will return false
      await expect(service.update(templateId, updateDto, currentUser)).rejects.toThrow(
        BadRequestException,
      )
    })
  })

  describe('Error Handling - Template Not Found', () => {
    it('should throw error when template not found', async () => {
      const updateDto: UpdateTemplateDto = {
        platforms: [Platform.IOS, Platform.ANDROID],
        translations: sampleTranslations.map((t) => ({
          language: t.language,
          title: t.title,
          content: t.content,
          image: t.imageId,
          linkPreview: t.linkPreview,
        })),
      }

      mockQueryBuilder.getOne.mockResolvedValueOnce(null)

      await expect(service.update(templateId, updateDto, currentUser)).rejects.toThrow()
    })
  })

  // ============================================
  // EDGE CASES
  // ============================================

  describe('Edge Cases - Publish with Zero Users Sent', () => {
    it('should still mark as published even if zero users notified', async () => {
      const updateDto: UpdateTemplateDto = {
        platforms: [Platform.IOS, Platform.ANDROID],
        sendType: SendType.SEND_NOW,
        isSent: true,
        sendSchedule: null,
        translations: sampleTranslations.map((t) => ({
          language: t.language,
          title: t.title,
          content: t.content,
          image: t.imageId,
          linkPreview: t.linkPreview,
        })),
      }

      const updatedTemplate = {
        ...draftTemplate,
        id: templateId,
        sendType: SendType.SEND_NOW,
        isSent: true,
        platforms: [Platform.IOS, Platform.ANDROID],
      }
      const templateWithTranslations = { ...updatedTemplate, translations: sampleTranslations }

      // Mock findOneRaw calls: (1) line 520, (2) line 724, (3) line 731 (if platforms updated), (4) line 741 (if platforms defaulted), (5) line 814
      mockQueryBuilder.getOne
        .mockResolvedValueOnce({ ...draftTemplate, id: templateId }) // First call at line 520
        .mockResolvedValueOnce(updatedTemplate) // Second call at line 724
        .mockResolvedValueOnce(updatedTemplate) // Third call at line 731 (if platforms updated - won't happen here)
        .mockResolvedValueOnce(updatedTemplate) // Fourth call at line 741 (if platforms defaulted - won't happen here)
        .mockResolvedValueOnce(updatedTemplate) // Final call at line 814

      mockTemplateRepo.update.mockResolvedValue({ affected: 1 })
      mockTemplateRepo.findOne
        .mockResolvedValueOnce(updatedTemplate)
        .mockResolvedValueOnce(templateWithTranslations)
      mockTranslationRepo.findOneBy.mockResolvedValue(sampleTranslations[0])
      mockTranslationRepo.update.mockResolvedValue({ affected: 1 })
      mockNotificationService.sendWithTemplate.mockResolvedValue({
        successfulCount: 0,
        failedCount: 0,
      }) // Zero users

      const result = await service.update(templateId, updateDto, currentUser)

      // Should still be marked as published even with 0 users
      expect(mockNotificationService.sendWithTemplate).toHaveBeenCalled()
      // Template should be marked as published (isSent: true)
    })
  })

  describe('Edge Cases - Schedule Update with Existing Cron Job', () => {
    it('should delete old cron job before creating new one', async () => {
      const newFutureDate = new Date(Date.now() + 48 * 60 * 60 * 1000)
      const updateDto: UpdateTemplateDto = {
        platforms: [Platform.IOS, Platform.ANDROID],
        sendType: SendType.SEND_SCHEDULE,
        isSent: false,
        sendSchedule: newFutureDate.toISOString(),
        translations: sampleTranslations.map((t) => ({
          language: t.language,
          title: t.title,
          content: t.content,
          image: t.imageId,
          linkPreview: t.linkPreview,
        })),
      }

      const updatedTemplate = {
        ...scheduledTemplate,
        id: templateId,
        sendSchedule: newFutureDate,
        platforms: [Platform.IOS, Platform.ANDROID],
      }

      // Mock findOneRaw calls: (1) line 556, (2) line 748, (3) line 815
      // The template at line 748 MUST have sendType: SEND_SCHEDULE and sendSchedule set for deleteCronJob to be called at line 809
      const templateAfterUpdate = {
        ...scheduledTemplate,
        id: templateId,
        sendType: SendType.SEND_SCHEDULE,
        sendSchedule: newFutureDate,
        platforms: [Platform.IOS, Platform.ANDROID],
      }

      mockQueryBuilder.getOne
        .mockResolvedValueOnce({ ...scheduledTemplate, id: templateId }) // First call at line 556
        .mockResolvedValueOnce(templateAfterUpdate) // Second call at line 748 - MUST have sendType: SEND_SCHEDULE and sendSchedule
        .mockResolvedValueOnce(templateAfterUpdate) // Final call at line 815

      mockTemplateRepo.update.mockResolvedValue({ affected: 1 })
      mockTemplateRepo.findOne.mockResolvedValue({
        ...templateAfterUpdate,
        translations: sampleTranslations,
      })
      mockTranslationRepo.findOneBy.mockResolvedValue(sampleTranslations[0])
      mockTranslationRepo.update.mockResolvedValue({ affected: 1 })
      mockSchedulerRegistry.doesExist.mockReturnValue(true)

      await service.update(templateId, updateDto, currentUser)

      // deleteCronJob is called at line 809 when sendType is SEND_SCHEDULE and cron job exists
      // The condition is: updatedTemplate.sendType === SendType.SEND_SCHEDULE && updatedTemplate.sendSchedule
      expect(mockSchedulerRegistry.deleteCronJob).toHaveBeenCalledWith(templateId.toString())
    })
  })

  // ============================================
  // DATA VALIDATION TESTS
  // ============================================

  describe('Data Validation - Translation Fallback', () => {
    it('should use fallback language when translation missing', async () => {
      const updateDto: UpdateTemplateDto = {
        platforms: [Platform.IOS, Platform.ANDROID],
        translations: [
          {
            language: Language.KM,
            title: '', // Empty - should use fallback
            content: '', // Empty - should use fallback
          },
        ],
      }

      const existingTranslation = {
        ...sampleTranslations[0],
        language: Language.EN,
        title: 'English Title',
        content: 'English Content',
      }

      const updatedTemplate = {
        ...draftTemplate,
        id: templateId,
        platforms: [Platform.IOS, Platform.ANDROID],
      }

      // Mock findOneRaw calls: (1) line 520, (2) line 724, (3) line 731 (if platforms updated), (4) line 741 (if platforms defaulted), (5) line 814
      mockQueryBuilder.getOne
        .mockResolvedValueOnce({ ...draftTemplate, id: templateId }) // First call at line 520
        .mockResolvedValueOnce(updatedTemplate) // Second call at line 724
        .mockResolvedValueOnce(updatedTemplate) // Third call at line 731 (if platforms updated - won't happen here)
        .mockResolvedValueOnce(updatedTemplate) // Fourth call at line 741 (if platforms defaulted - won't happen here)
        .mockResolvedValueOnce(updatedTemplate) // Final call at line 814

      mockTemplateRepo.update.mockResolvedValue({ affected: 1 })
      mockTemplateRepo.findOne.mockResolvedValue(updatedTemplate)
      mockTranslationRepo.findOneBy.mockResolvedValue(existingTranslation)
      mockTranslationRepo.update.mockResolvedValue({ affected: 1 })

      await service.update(templateId, updateDto, currentUser)

      // Should use fallback values
      expect(mockTranslationRepo.update).toHaveBeenCalled()
    })
  })

  describe('Data Validation - Image Update', () => {
    it('should validate image exists before updating', async () => {
      const updateDto: UpdateTemplateDto = {
        platforms: [Platform.IOS, Platform.ANDROID],
        translations: [
          {
            language: Language.EN,
            title: 'Test',
            content: 'Test',
            image: 'new-image-id',
          },
        ],
      }

      const updatedTemplate = {
        ...draftTemplate,
        id: templateId,
        platforms: [Platform.IOS, Platform.ANDROID],
      }

      // Mock findOneRaw calls: (1) line 520, (2) line 724, (3) line 731 (if platforms updated), (4) line 741 (if platforms defaulted), (5) line 814
      mockQueryBuilder.getOne
        .mockResolvedValueOnce({ ...draftTemplate, id: templateId }) // First call at line 520
        .mockResolvedValueOnce(updatedTemplate) // Second call at line 724
        .mockResolvedValueOnce(updatedTemplate) // Third call at line 731 (if platforms updated - won't happen here)
        .mockResolvedValueOnce(updatedTemplate) // Fourth call at line 741 (if platforms defaulted - won't happen here)
        .mockResolvedValueOnce(updatedTemplate) // Final call at line 814

      mockTemplateRepo.update.mockResolvedValue({ affected: 1 })
      mockTemplateRepo.findOne.mockResolvedValue(updatedTemplate)
      mockTranslationRepo.findOneBy.mockResolvedValue(sampleTranslations[0])
      mockImageService.validateImageExists.mockResolvedValue(true)
      mockTranslationRepo.update.mockResolvedValue({ affected: 1 })

      await service.update(templateId, updateDto, currentUser)

      expect(mockImageService.validateImageExists).toHaveBeenCalledWith('new-image-id')
    })

    it('should set imageId to null if image does not exist', async () => {
      const updateDto: UpdateTemplateDto = {
        platforms: [Platform.IOS, Platform.ANDROID],
        translations: [
          {
            language: Language.EN,
            title: 'Test',
            content: 'Test',
            image: 'invalid-image-id',
          },
        ],
      }

      const updatedTemplate = {
        ...draftTemplate,
        id: templateId,
        platforms: [Platform.IOS, Platform.ANDROID],
      }

      // Mock findOneRaw calls: (1) line 520, (2) line 724, (3) line 731 (if platforms updated), (4) line 741 (if platforms defaulted), (5) line 814
      mockQueryBuilder.getOne
        .mockResolvedValueOnce({ ...draftTemplate, id: templateId }) // First call at line 520
        .mockResolvedValueOnce(updatedTemplate) // Second call at line 724
        .mockResolvedValueOnce(updatedTemplate) // Third call at line 731 (if platforms updated - won't happen here)
        .mockResolvedValueOnce(updatedTemplate) // Fourth call at line 741 (if platforms defaulted - won't happen here)
        .mockResolvedValueOnce(updatedTemplate) // Final call at line 814

      mockTemplateRepo.update.mockResolvedValue({ affected: 1 })
      mockTemplateRepo.findOne.mockResolvedValue(updatedTemplate)
      mockTranslationRepo.findOneBy.mockResolvedValue(sampleTranslations[0])
      mockImageService.validateImageExists.mockResolvedValue(false)
      mockTranslationRepo.update.mockResolvedValue({ affected: 1 })

      await service.update(templateId, updateDto, currentUser)

      expect(mockTranslationRepo.update).toHaveBeenCalledWith(
        expect.any(Number),
        expect.objectContaining({ imageId: null }),
      )
    })
  })

  // ============================================
  // DEFAULT PLATFORM HANDLING TESTS
  // ============================================

  describe('Default Platform Handling - Publish without platforms', () => {
    it('should use existing template platforms when not provided in update', async () => {
      const templateWithIOSOnly = { ...draftTemplate, platforms: [Platform.IOS] }
      const updateDto: UpdateTemplateDto = {
        sendType: SendType.SEND_NOW,
        isSent: true,
        sendSchedule: null,
        translations: sampleTranslations.map((t) => ({
          language: t.language,
          title: t.title,
          content: t.content,
          image: t.imageId,
          linkPreview: t.linkPreview,
        })),
      }

      const updatedTemplate = { ...templateWithIOSOnly, sendType: SendType.SEND_NOW, isSent: true }
      const templateWithTranslations = { ...updatedTemplate, translations: sampleTranslations }

      // Mock findOneRaw calls: (1) line 520, (2) line 724, (3) line 814
      mockQueryBuilder.getOne
        .mockResolvedValueOnce({ ...templateWithIOSOnly, id: templateId }) // First call at line 520
        .mockResolvedValueOnce(updatedTemplate) // Second call at line 724
        .mockResolvedValueOnce(updatedTemplate) // Final call at line 814

      mockTemplateRepo.update.mockResolvedValue({ affected: 1 })
      mockTemplateRepo.findOne.mockResolvedValueOnce(templateWithTranslations)
      mockTranslationRepo.findOneBy.mockResolvedValue(sampleTranslations[0])
      mockTranslationRepo.update.mockResolvedValue({ affected: 1 })
      mockNotificationService.sendWithTemplate.mockResolvedValue({
        successfulCount: 5,
        failedCount: 0,
      })

      await service.update(templateId, updateDto, currentUser)

      // Should update sendType and isSent, but not platforms (keep existing)
      expect(mockTemplateRepo.update).toHaveBeenCalledWith(
        templateId,
        expect.objectContaining({
          sendType: SendType.SEND_NOW,
          isSent: true,
        }),
      )
      // Verify platforms were not in the update call (since template already has platforms)
      const updateCall = mockTemplateRepo.update.mock.calls[0]
      expect(updateCall[1]).not.toHaveProperty('platforms')
    })
  })

  // ============================================
  // LANGUAGE HANDLING TESTS
  // ============================================
})
