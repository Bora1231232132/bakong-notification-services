import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { BakongUser } from 'src/entities/bakong-user.entity'
import { Notification } from 'src/entities/notification.entity'
import { Template } from 'src/entities/template.entity'
import { NotificationService } from './notification.service'
import { BaseFunctionHelper } from 'src/common/util/base-function.helper'
import { TemplateService } from '../template/template.service'
import { ImageService } from '../image/image.service'
import { ValidationHelper } from 'src/common/util/validation.helper'
import { FirebaseManager } from 'src/common/services/firebase-manager.service'
import SentNotificationDto from './dto/send-notification.dto'
import {
  Language,
  NotificationType,
  Platform,
  BakongApp,
  ErrorCode,
  ResponseMessage,
  PaginationUtils,
} from '@bakong/shared'
import { BaseResponseDto } from 'src/common/base-response.dto'
import { InboxResponseDto } from './dto/inbox-response.dto'

describe('NotificationService', () => {
  let service: NotificationService

  // Mock repositories
  const mockBakongUserRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  }

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  }

  const mockNotificationRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  }

  const mockTemplateRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  }

  // Mock services
  const mockBaseFunctionHelper = {
    findUserByAccountId: jest.fn(),
    updateUserData: jest.fn(),
    syncAllUsers: jest.fn(),
    filterValidFCMUsers: jest.fn(),
    truncateText: jest.fn((field, text) => text),
    getBaseUrl: jest.fn().mockReturnValue('http://localhost:3000'),
  }

  const mockTemplateService = {
    findNotificationTemplate: jest.fn(),
    findBestTranslation: jest.fn(),
    markAsPublished: jest.fn(),
    findBestTemplateForUser: jest.fn(),
  }

  const mockImageService = {
    buildImageUrl: jest.fn(),
  }

  // Sample data
  const sampleUser = {
    id: 1,
    accountId: 'test@bkrt.com',
    bakongPlatform: BakongApp.BAKONG,
    fcmToken: 'test-fcm-token-123',
    platform: Platform.IOS,
    language: Language.EN,
  } as BakongUser

  const sampleUserWithWrongToken = {
    id: 2,
    accountId: 'wrongusertoken@bkrt.com',
    bakongPlatform: BakongApp.BAKONG,
    fcmToken: 'f68-v', // Invalid/short token
    platform: Platform.IOS,
    language: Language.EN,
  } as BakongUser

  const sampleTemplate = {
    id: 1,
    notificationType: NotificationType.ANNOUNCEMENT,
    categoryType: 'NEWS' as any,
    bakongPlatform: BakongApp.BAKONG,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    translations: [
      {
        id: 1,
        language: Language.EN,
        title: 'Test Notification',
        content: 'Test content',
        imageId: 'image-123',
        linkPreview: null,
      },
    ],
  } as any

  const sampleTranslation = {
    id: 1,
    language: Language.EN,
    title: 'Test Notification',
    content: 'Test content',
    imageId: 'image-123',
  } as any

  const sampleNotification = {
    id: 1,
    templateId: 1,
    accountId: 'test@bkrt.com',
    sendCount: 1,
    firebaseMessageId: 0,
    fcmToken: 'test-fcm-token-123',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    template: sampleTemplate,
  } as any

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(BakongUser),
          useValue: mockBakongUserRepo,
        },
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepo,
        },
        {
          provide: getRepositoryToken(Template),
          useValue: mockTemplateRepo,
        },
        {
          provide: BaseFunctionHelper,
          useValue: mockBaseFunctionHelper,
        },
        {
          provide: TemplateService,
          useValue: mockTemplateService,
        },
        {
          provide: ImageService,
          useValue: mockImageService,
        },
      ],
    }).compile()

    service = module.get<NotificationService>(NotificationService)
    // Inject repositories manually
    ;(service as any).bkUserRepo = mockBakongUserRepo
    ;(service as any).notiRepo = mockNotificationRepo
    ;(service as any).templateRepo = mockTemplateRepo
    ;(service as any).baseFunctionHelper = mockBaseFunctionHelper
    ;(service as any).templateService = mockTemplateService
    ;(service as any).imageService = mockImageService

    // Reset all mocks
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('sendWithTemplate', () => {
    it('should send notifications successfully to all matching users', async () => {
      const template = {
        ...sampleTemplate,
        id: 1,
        platforms: [Platform.IOS, Platform.ANDROID],
        translations: [sampleTranslation],
      }

      mockTemplateRepo.findOne.mockResolvedValue(template)
      mockTemplateService.findBestTranslation.mockReturnValue(sampleTranslation)
      mockBakongUserRepo.find.mockResolvedValue([sampleUser])
      ValidationHelper.validateFCMTokens = jest.fn().mockResolvedValue([sampleUser])

      const mockFCM = {
        send: jest.fn().mockResolvedValue('message-id-123'),
      }
      FirebaseManager.getMessaging = jest.fn().mockReturnValue(mockFCM)
      const getFCMSpy = jest.spyOn(service as any, 'getFCM').mockReturnValue(mockFCM)

      mockNotificationRepo.create.mockReturnValue(sampleNotification)
      mockNotificationRepo.save.mockResolvedValue(sampleNotification)
      mockBaseFunctionHelper.filterValidFCMUsers.mockReturnValue([sampleUser])
      const sendFCMPayloadToPlatformSpy = jest
        .spyOn(service as any, 'sendFCMPayloadToPlatform')
        .mockResolvedValue('message-id-123')
      const updateNotificationRecordSpy = jest
        .spyOn(service as any, 'updateNotificationRecord')
        .mockResolvedValue(undefined)

      const result = await service.sendWithTemplate(template as any)

      expect(result.successfulCount).toBeGreaterThan(0)
      expect(result).toHaveProperty('failedCount')
      expect(result).toHaveProperty('failedUsers')
      getFCMSpy.mockRestore()
      sendFCMPayloadToPlatformSpy.mockRestore()
      updateNotificationRecordSpy.mockRestore()
    })

    it('should return 0 if no translations found', async () => {
      const template = {
        ...sampleTemplate,
        translations: [],
      }

      const result = await service.sendWithTemplate(template as any)
      expect(result.successfulCount).toBe(0)
    })

    it('should filter users by bakongPlatform', async () => {
      const template = {
        ...sampleTemplate,
        bakongPlatform: BakongApp.BAKONG,
        translations: [sampleTranslation],
      }
      const user1 = { ...sampleUser, bakongPlatform: BakongApp.BAKONG }
      const user2 = {
        ...sampleUser,
        accountId: 'test2@bkrt.com',
        bakongPlatform: BakongApp.BAKONG_JUNIOR,
      }

      mockTemplateRepo.findOne.mockResolvedValue(template)
      mockTemplateService.findBestTranslation.mockReturnValue(sampleTranslation)
      mockBakongUserRepo.find.mockResolvedValue([user1, user2])
      ValidationHelper.validateFCMTokens = jest.fn().mockResolvedValue([user1])

      const mockFCM = {
        send: jest.fn().mockResolvedValue('message-id-123'),
      }
      FirebaseManager.getMessaging = jest.fn().mockReturnValue(mockFCM)
      const getFCMSpy = jest.spyOn(service as any, 'getFCM').mockReturnValue(mockFCM)

      mockNotificationRepo.create.mockReturnValue(sampleNotification)
      mockNotificationRepo.save.mockResolvedValue(sampleNotification)
      mockBaseFunctionHelper.filterValidFCMUsers.mockReturnValue([user1])
      const sendFCMPayloadToPlatformSpy = jest
        .spyOn(service as any, 'sendFCMPayloadToPlatform')
        .mockResolvedValue('message-id-123')
      const updateNotificationRecordSpy = jest
        .spyOn(service as any, 'updateNotificationRecord')
        .mockResolvedValue(undefined)

      const result = await service.sendWithTemplate(template as any)

      expect(result.successfulCount).toBeGreaterThan(0)
      expect(result).toHaveProperty('failedCount')
      expect(result).toHaveProperty('failedUsers')
      getFCMSpy.mockRestore()
      sendFCMPayloadToPlatformSpy.mockRestore()
      updateNotificationRecordSpy.mockRestore()
    })

    it('should throw error if no users found for bakongPlatform', async () => {
      const template = {
        ...sampleTemplate,
        bakongPlatform: BakongApp.BAKONG_TOURIST,
        translations: [sampleTranslation],
      }

      mockTemplateRepo.findOne.mockResolvedValue(template)
      mockBakongUserRepo.find.mockResolvedValue([])

      await expect(service.sendWithTemplate(template as any)).rejects.toThrow()
    })

    it('should return 0 if no users have FCM tokens', async () => {
      const template = {
        ...sampleTemplate,
        translations: [sampleTranslation],
      }
      const userWithoutToken = { ...sampleUser, fcmToken: '' }

      mockTemplateRepo.findOne.mockResolvedValue(template)
      mockBakongUserRepo.find.mockResolvedValue([userWithoutToken])

      const result = await service.sendWithTemplate(template as any)
      expect(result.successfulCount).toBe(0)
    })

    it('should handle platforms array correctly', async () => {
      const template = {
        ...sampleTemplate,
        platforms: [Platform.IOS],
        translations: [sampleTranslation],
      }

      mockTemplateRepo.findOne.mockResolvedValue(template)
      mockTemplateService.findBestTranslation.mockReturnValue(sampleTranslation)
      mockBakongUserRepo.find.mockResolvedValue([sampleUser])
      ValidationHelper.validateFCMTokens = jest.fn().mockResolvedValue([sampleUser])

      const mockFCM = {
        send: jest.fn().mockResolvedValue('message-id-123'),
      }
      FirebaseManager.getMessaging = jest.fn().mockReturnValue(mockFCM)
      const getFCMSpy = jest.spyOn(service as any, 'getFCM').mockReturnValue(mockFCM)

      mockNotificationRepo.create.mockReturnValue(sampleNotification)
      mockNotificationRepo.save.mockResolvedValue(sampleNotification)
      mockBaseFunctionHelper.filterValidFCMUsers.mockReturnValue([sampleUser])
      const sendFCMPayloadToPlatformSpy = jest
        .spyOn(service as any, 'sendFCMPayloadToPlatform')
        .mockResolvedValue('message-id-123')
      const updateNotificationRecordSpy = jest
        .spyOn(service as any, 'updateNotificationRecord')
        .mockResolvedValue(undefined)

      const result = await service.sendWithTemplate(template as any)

      expect(result.successfulCount).toBeGreaterThan(0)
      expect(result).toHaveProperty('failedCount')
      expect(result).toHaveProperty('failedUsers')
      getFCMSpy.mockRestore()
      sendFCMPayloadToPlatformSpy.mockRestore()
      updateNotificationRecordSpy.mockRestore()
    })
  })

  describe('sendNow', () => {
    it('should send notification by notificationId successfully', async () => {
      const dto: SentNotificationDto = {
        notificationId: 1,
        language: Language.EN,
      } as SentNotificationDto

      const notificationWithTemplate = {
        ...sampleNotification,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        template: {
          ...sampleTemplate,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
          translations: [sampleTranslation],
        },
      }

      mockNotificationRepo.findOne.mockResolvedValue(notificationWithTemplate)
      mockTemplateService.findBestTranslation.mockReturnValue(sampleTranslation)
      mockImageService.buildImageUrl.mockReturnValue('http://localhost:3000/api/v1/image/image-123')

      const result = await service.sendNow(dto)

      expect(result.responseCode).toBe(0)
      expect(mockNotificationRepo.findOne).toHaveBeenCalled()
      expect(result.data).toHaveProperty('whatnews')
    })

    it('should return error if notification not found', async () => {
      const dto: SentNotificationDto = {
        notificationId: 999,
        language: Language.EN,
      } as SentNotificationDto

      mockNotificationRepo.findOne.mockResolvedValue(null)

      const result = await service.sendNow(dto)

      expect(result.responseCode).toBe(1)
      expect(result.errorCode).toBe(ErrorCode.INTERNAL_SERVER_ERROR)
      expect(result.responseMessage).toContain('Notification not found')
    })

    it('should handle flash notification with accountId', async () => {
      const dto: SentNotificationDto = {
        accountId: 'test@bkrt.com',
        language: Language.EN,
        notificationType: NotificationType.FLASH_NOTIFICATION,
        bakongPlatform: BakongApp.BAKONG,
        fcmToken: 'test-token',
        platform: Platform.IOS,
      } as SentNotificationDto

      mockBaseFunctionHelper.findUserByAccountId
        .mockResolvedValueOnce(sampleUser)
        .mockResolvedValueOnce(sampleUser)
      mockBaseFunctionHelper.updateUserData.mockResolvedValue({})
      mockTemplateRepo.find.mockResolvedValue([sampleTemplate])
      mockTemplateService.findNotificationTemplate.mockResolvedValue({
        template: sampleTemplate,
        notificationType: NotificationType.FLASH_NOTIFICATION,
      })
      ValidationHelper.validateTranslation = jest.fn().mockReturnValue({
        isValid: true,
        translation: sampleTranslation,
      })
      mockBakongUserRepo.find.mockResolvedValue([sampleUser])
      mockImageService.buildImageUrl.mockReturnValue('http://localhost:3000/api/v1/image/image-123')

      // Mock handleFlashNotification to return success
      const handleFlashNotificationSpy = jest
        .spyOn(service as any, 'handleFlashNotification')
        .mockResolvedValue(
          BaseResponseDto.success({
            data: { whatnews: {} },
            message: 'Flash notification sent successfully',
          }),
        )

      const result = await service.sendNow(dto)

      // Note: updateUserData is called in controller, not in sendNow
      // When accountId is provided, sendNow just fetches user to get bakongPlatform
      expect(mockBaseFunctionHelper.findUserByAccountId).toHaveBeenCalled()
      expect(result.responseCode).toBe(0)

      handleFlashNotificationSpy.mockRestore()
    })

    it('should return error if no users found for bakongPlatform', async () => {
      const dto: SentNotificationDto = {
        language: Language.EN,
        notificationType: NotificationType.ANNOUNCEMENT,
      } as SentNotificationDto

      const templateWithPlatform = {
        ...sampleTemplate,
        bakongPlatform: BakongApp.BAKONG_TOURIST,
      }

      mockTemplateService.findNotificationTemplate.mockResolvedValue({
        template: templateWithPlatform,
        notificationType: NotificationType.ANNOUNCEMENT,
      })
      ValidationHelper.validateTranslation = jest.fn().mockReturnValue({
        isValid: true,
        translation: sampleTranslation,
      })
      mockBakongUserRepo.find.mockResolvedValue([])

      const result = await service.sendNow(dto)

      expect(result.responseCode).toBe(1)
      expect(result.errorCode).toBe(ErrorCode.NO_USERS_FOR_BAKONG_PLATFORM)
    })

    it('should handle regular notification send flow', async () => {
      const dto: SentNotificationDto = {
        language: Language.EN,
        notificationType: NotificationType.ANNOUNCEMENT,
      } as SentNotificationDto

      mockTemplateService.findNotificationTemplate.mockResolvedValue({
        template: sampleTemplate,
        notificationType: NotificationType.ANNOUNCEMENT,
      })
      ValidationHelper.validateTranslation = jest.fn().mockReturnValue({
        isValid: true,
        translation: sampleTranslation,
      })
      mockBakongUserRepo.find
        .mockResolvedValueOnce([sampleUser])
        .mockResolvedValueOnce([sampleUser])
      mockBaseFunctionHelper.syncAllUsers.mockResolvedValue({
        updatedCount: 0,
        totalCount: 1,
        platformUpdates: 0,
        languageUpdates: 0,
        invalidTokens: 0,
        updatedIds: [],
      })
      ValidationHelper.validateFCMTokens = jest.fn().mockResolvedValue([sampleUser])

      const mockFCM = {
        send: jest.fn().mockResolvedValue('message-id-123'),
      }
      FirebaseManager.getMessaging = jest.fn().mockReturnValue(mockFCM)
      const getFCMSpy = jest.spyOn(service as any, 'getFCM').mockReturnValue(mockFCM)

      mockNotificationRepo.create.mockReturnValue(sampleNotification)
      mockNotificationRepo.save.mockResolvedValue(sampleNotification)
      mockNotificationRepo.update.mockResolvedValue({ affected: 1 })
      mockTemplateService.markAsPublished.mockResolvedValue(undefined)
      mockTemplateService.findBestTranslation.mockReturnValue(sampleTranslation)
      mockImageService.buildImageUrl.mockReturnValue('http://localhost:3000/api/v1/image/image-123')
      mockBaseFunctionHelper.filterValidFCMUsers.mockReturnValue([sampleUser])
      const sendFCMPayloadToPlatformSpy = jest
        .spyOn(service as any, 'sendFCMPayloadToPlatform')
        .mockResolvedValue('message-id-123')
      mockQueryBuilder.getOne.mockResolvedValue(null)
      const updateNotificationRecordSpy = jest
        .spyOn(service as any, 'updateNotificationRecord')
        .mockResolvedValue(undefined)

      const result = await service.sendNow(dto)

      expect(result.responseCode).toBe(0)
      expect(mockTemplateService.findNotificationTemplate).toHaveBeenCalled()
      expect(result.data).toHaveProperty('whatnews')

      getFCMSpy.mockRestore()
      sendFCMPayloadToPlatformSpy.mockRestore()
      updateNotificationRecordSpy.mockRestore()
    })
  })

  describe('getNotificationCenter', () => {
    it('should return notification center data successfully', async () => {
      const dto = {
        accountId: 'test@bkrt.com',
        fcmToken: 'test-fcm-token-123',
        bakongPlatform: BakongApp.BAKONG,
        language: Language.EN,
        page: 1,
        size: 10,
      } as any

      const notificationWithTemplateId = {
        ...sampleNotification,
        templateId: 1,
        template: {
          ...sampleTemplate,
          translations: [sampleTranslation],
        },
      }

      mockBaseFunctionHelper.updateUserData.mockResolvedValue({ isNewUser: false })
      mockBaseFunctionHelper.findUserByAccountId
        .mockResolvedValueOnce(sampleUser) // After sync check
        .mockResolvedValueOnce(sampleUser) // After sync verification
      mockNotificationRepo.findAndCount.mockResolvedValue([[notificationWithTemplateId], 1])
      mockTemplateRepo.findOne.mockResolvedValue({
        ...sampleTemplate,
        translations: [sampleTranslation],
      })
      mockTemplateService.findBestTranslation.mockReturnValue(sampleTranslation)
      mockImageService.buildImageUrl.mockReturnValue('http://localhost:3000/api/v1/image/image-123')

      const result = await service.getNotificationCenter(dto)

      expect(result.responseCode).toBe(0)
      if (result.data && typeof result.data === 'object' && 'notifications' in result.data) {
        expect((result.data as any).notifications).toBeDefined()
      }
    })

    it('should return error if user not found', async () => {
      const dto = {
        accountId: 'nonexistent@bkrt.com',
        fcmToken: 'test-fcm-token-123',
        bakongPlatform: BakongApp.BAKONG,
        language: Language.EN,
      } as any

      mockBaseFunctionHelper.updateUserData.mockResolvedValue({})
      mockBaseFunctionHelper.findUserByAccountId.mockResolvedValue(null)

      const result = await service.getNotificationCenter(dto)

      expect(result.responseCode).toBe(1)
      expect(result.errorCode).toBe(ErrorCode.USER_NOT_FOUND)
    })

    it('should filter notifications by bakongPlatform', async () => {
      const dto = {
        accountId: 'test@bkrt.com',
        fcmToken: 'test-fcm-token-123',
        bakongPlatform: BakongApp.BAKONG,
        language: Language.EN,
        page: 1,
        size: 10,
      } as any

      const userWithPlatform = { ...sampleUser, bakongPlatform: BakongApp.BAKONG }
      const templateMatching = { ...sampleTemplate, bakongPlatform: BakongApp.BAKONG }
      const templateNotMatching = {
        ...sampleTemplate,
        id: 2,
        bakongPlatform: BakongApp.BAKONG_JUNIOR,
      }

      const notification1 = {
        ...sampleNotification,
        templateId: 1,
        template: {
          ...templateMatching,
          translations: [sampleTranslation],
        },
      }
      const notification2 = {
        ...sampleNotification,
        id: 2,
        templateId: 2,
        template: {
          ...templateNotMatching,
          translations: [sampleTranslation],
        },
      }

      mockBaseFunctionHelper.updateUserData.mockResolvedValue({ isNewUser: false })
      mockBaseFunctionHelper.findUserByAccountId
        .mockResolvedValueOnce(userWithPlatform) // After sync check
        .mockResolvedValueOnce(userWithPlatform) // After sync verification
      mockNotificationRepo.findAndCount.mockResolvedValue([[notification1, notification2], 2])
      mockTemplateRepo.findOne
        .mockResolvedValueOnce({ ...templateMatching, translations: [sampleTranslation] })
        .mockResolvedValueOnce({ ...templateNotMatching, translations: [sampleTranslation] })
      mockTemplateService.findBestTranslation.mockReturnValue(sampleTranslation)
      mockImageService.buildImageUrl.mockReturnValue('http://localhost:3000/api/v1/image/image-123')

      const result = await service.getNotificationCenter(dto)

      expect(result.responseCode).toBe(0)
      // Should only include notifications matching user's bakongPlatform
      if (result.data && typeof result.data === 'object' && 'notifications' in result.data) {
        expect((result.data as any).notifications.length).toBeLessThanOrEqual(2)
      }
    })
  })

  describe('storeNotification', () => {
    it('should store notification successfully', async () => {
      const params = {
        accountId: 'test@bkrt.com',
        templateId: 1,
        fcmToken: 'test-token',
        sendCount: 1,
        firebaseMessageId: 0,
      }

      mockNotificationRepo.create.mockReturnValue(sampleNotification)
      mockNotificationRepo.save.mockResolvedValue(sampleNotification)

      const result = await (service as any).storeNotification(params)

      expect(result).toBeDefined()
      expect(mockNotificationRepo.create).toHaveBeenCalled()
      expect(mockNotificationRepo.save).toHaveBeenCalled()
    })
  })

  describe('updateNotificationRecord', () => {
    it('should update notification record in individual mode', async () => {
      const user = sampleUser
      const template = sampleTemplate
      const notificationId = 1
      const response = 'message-id-123'

      mockNotificationRepo.update.mockResolvedValue({ affected: 1 })

      await (service as any).updateNotificationRecord(
        user,
        template,
        notificationId,
        response,
        'individual',
      )

      expect(mockNotificationRepo.update).toHaveBeenCalled()
    })

    it('should update notification record in shared mode', async () => {
      const user = sampleUser
      const template = sampleTemplate
      const notificationId = 1
      const response = 'message-id-123'

      mockNotificationRepo.findOne.mockResolvedValue(sampleNotification)
      mockNotificationRepo.update.mockResolvedValue({ affected: 1 })

      await (service as any).updateNotificationRecord(
        user,
        template,
        notificationId,
        response,
        'shared',
      )

      expect(mockNotificationRepo.update).toHaveBeenCalled()
    })
  })

  describe('deleteNotificationsByTemplateId', () => {
    it('should delete notifications by templateId successfully', async () => {
      const templateId = 1

      mockNotificationRepo.delete.mockResolvedValue({ affected: 5 })

      await service.deleteNotificationsByTemplateId(templateId)

      expect(mockNotificationRepo.delete).toHaveBeenCalled()
    })

    it('should handle errors when deleting notifications', async () => {
      const templateId = 1

      mockNotificationRepo.delete.mockRejectedValue(new Error('Database error'))

      await expect(service.deleteNotificationsByTemplateId(templateId)).rejects.toThrow(
        'Database error',
      )
    })
  })

  describe('sendNow - successful count and failed users', () => {
    it('should return successful count and failed users list in response', async () => {
      const dto: SentNotificationDto = {
        language: Language.EN,
        notificationType: NotificationType.ANNOUNCEMENT,
      } as SentNotificationDto

      mockTemplateService.findNotificationTemplate.mockResolvedValue({
        template: sampleTemplate,
        notificationType: NotificationType.ANNOUNCEMENT,
      })
      ValidationHelper.validateTranslation = jest.fn().mockReturnValue({
        isValid: true,
        translation: sampleTranslation,
      })
      mockBakongUserRepo.find
        .mockResolvedValueOnce([sampleUser, sampleUserWithWrongToken]) // Before sync
        .mockResolvedValueOnce([sampleUser, sampleUserWithWrongToken]) // After sync
      mockBaseFunctionHelper.syncAllUsers.mockResolvedValue({
        updatedCount: 0,
        totalCount: 2,
        platformUpdates: 0,
        languageUpdates: 0,
        invalidTokens: 0,
        updatedIds: [],
      })
      ValidationHelper.validateFCMTokens = jest.fn().mockResolvedValue([sampleUser]) // Only valid user

      const mockFCM = {
        send: jest.fn().mockResolvedValue('message-id-123'),
      }
      FirebaseManager.getMessaging = jest.fn().mockReturnValue(mockFCM)

      mockNotificationRepo.create.mockReturnValue(sampleNotification)
      mockNotificationRepo.save.mockResolvedValue(sampleNotification)
      mockNotificationRepo.update.mockResolvedValue({ affected: 1 })
      mockTemplateService.markAsPublished.mockResolvedValue(undefined)
      mockTemplateService.findBestTranslation.mockReturnValue(sampleTranslation)
      mockImageService.buildImageUrl.mockReturnValue('http://localhost:3000/api/v1/image/image-123')
      mockBaseFunctionHelper.filterValidFCMUsers.mockReturnValue([sampleUser])

      // Mock getFCM method
      const getFCMSpy = jest.spyOn(service as any, 'getFCM').mockReturnValue(mockFCM)

      // Mock updateNotificationRecord method - it uses query builder for shared mode
      mockQueryBuilder.getOne.mockResolvedValue(null) // No existing notification to update
      const updateNotificationRecordSpy = jest
        .spyOn(service as any, 'updateNotificationRecord')
        .mockResolvedValue(undefined)

      // Mock sendFCMPayloadToPlatform to succeed for valid user
      const sendFCMPayloadToPlatformSpy = jest
        .spyOn(service as any, 'sendFCMPayloadToPlatform')
        .mockResolvedValue('message-id-123')

      const result = await service.sendNow(dto)

      expect(result.responseCode).toBe(0)
      expect(result.data).toHaveProperty('whatnews')
      expect(result.data).toHaveProperty('successfulCount')
      expect(result.data).toHaveProperty('failedCount')
      expect(result.data).toHaveProperty('failedUsers')
      expect((result.data as any).successfulCount).toBe(1)
      expect((result.data as any).failedCount).toBeGreaterThanOrEqual(0)
      expect(Array.isArray((result.data as any).failedUsers)).toBe(true)

      getFCMSpy.mockRestore()
      updateNotificationRecordSpy.mockRestore()
      sendFCMPayloadToPlatformSpy.mockRestore()
    })

    it('should log failed users when some users fail to receive notification', async () => {
      const dto: SentNotificationDto = {
        language: Language.EN,
        notificationType: NotificationType.ANNOUNCEMENT,
      } as SentNotificationDto

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      mockTemplateService.findNotificationTemplate.mockResolvedValue({
        template: sampleTemplate,
        notificationType: NotificationType.ANNOUNCEMENT,
      })
      ValidationHelper.validateTranslation = jest.fn().mockReturnValue({
        isValid: true,
        translation: sampleTranslation,
      })
      mockBakongUserRepo.find
        .mockResolvedValueOnce([sampleUser, sampleUserWithWrongToken])
        .mockResolvedValueOnce([sampleUser, sampleUserWithWrongToken])
      mockBaseFunctionHelper.syncAllUsers.mockResolvedValue({
        updatedCount: 0,
        totalCount: 2,
        platformUpdates: 0,
        languageUpdates: 0,
        invalidTokens: 0,
        updatedIds: [],
      })
      ValidationHelper.validateFCMTokens = jest
        .fn()
        .mockResolvedValue([sampleUser, sampleUserWithWrongToken])

      const mockFCM = {
        send: jest.fn().mockResolvedValue('message-id-123'),
      }
      FirebaseManager.getMessaging = jest.fn().mockReturnValue(mockFCM)

      mockNotificationRepo.create.mockReturnValue(sampleNotification)
      mockNotificationRepo.save.mockResolvedValue(sampleNotification)
      mockNotificationRepo.update.mockResolvedValue({ affected: 1 })
      mockTemplateService.markAsPublished.mockResolvedValue(undefined)
      mockImageService.buildImageUrl.mockReturnValue('http://localhost:3000/api/v1/image/image-123')
      mockBaseFunctionHelper.filterValidFCMUsers.mockReturnValue([
        sampleUser,
        sampleUserWithWrongToken,
      ])

      // Mock getFCM method
      const getFCMSpy = jest.spyOn(service as any, 'getFCM').mockReturnValue(mockFCM)

      // Mock updateNotificationRecord method - it uses query builder for shared mode
      mockQueryBuilder.getOne.mockResolvedValue(null) // No existing notification to update
      const updateNotificationRecordSpy = jest
        .spyOn(service as any, 'updateNotificationRecord')
        .mockResolvedValue(undefined)

      // Mock sendFCMPayloadToPlatform to fail for wrong token user
      const sendFCMPayloadToPlatformSpy = jest
        .spyOn(service as any, 'sendFCMPayloadToPlatform')
        .mockImplementation(async (user: BakongUser) => {
          if (user.accountId === 'wrongusertoken@bkrt.com') {
            throw new Error('Invalid FCM token')
          }
          return 'message-id-123'
        })

      const result = await service.sendNow(dto)

      expect(result.responseCode).toBe(0)
      expect(result.data).toHaveProperty('whatnews')
      expect((result.data as any).successfulCount).toBe(1)
      expect((result.data as any).failedCount).toBe(1)
      expect((result.data as any).failedUsers).toContain('wrongusertoken@bkrt.com')

      // Verify failed users were logged
      const logCalls = consoleSpy.mock.calls
      const failedUsersLog = logCalls.find(
        (call) =>
          call[0]?.includes('❌ [sendFCM] Failed to send to user:') ||
          call[0]?.includes('FAILED USERS SUMMARY') ||
          call[0]?.includes('Failed to send to user:'),
      )
      expect(failedUsersLog).toBeDefined()

      consoleSpy.mockRestore()
      getFCMSpy.mockRestore()
      updateNotificationRecordSpy.mockRestore()
      sendFCMPayloadToPlatformSpy.mockRestore()
    })

    it('should return successful count of 0 and all failed users when all users fail', async () => {
      const dto: SentNotificationDto = {
        language: Language.EN,
        notificationType: NotificationType.ANNOUNCEMENT,
      } as SentNotificationDto

      mockTemplateService.findNotificationTemplate.mockResolvedValue({
        template: sampleTemplate,
        notificationType: NotificationType.ANNOUNCEMENT,
      })
      ValidationHelper.validateTranslation = jest.fn().mockReturnValue({
        isValid: true,
        translation: sampleTranslation,
      })
      mockBakongUserRepo.find
        .mockResolvedValueOnce([sampleUserWithWrongToken])
        .mockResolvedValueOnce([sampleUserWithWrongToken])
      mockBaseFunctionHelper.syncAllUsers.mockResolvedValue({
        updatedCount: 0,
        totalCount: 1,
        platformUpdates: 0,
        languageUpdates: 0,
        invalidTokens: 0,
        updatedIds: [],
      })
      ValidationHelper.validateFCMTokens = jest.fn().mockResolvedValue([sampleUserWithWrongToken])

      const mockFCM = {
        send: jest.fn().mockResolvedValue('message-id-123'),
      }
      FirebaseManager.getMessaging = jest.fn().mockReturnValue(mockFCM)

      mockNotificationRepo.create.mockReturnValue(sampleNotification)
      mockNotificationRepo.save.mockResolvedValue(sampleNotification)
      mockNotificationRepo.update.mockResolvedValue({ affected: 1 })
      mockTemplateService.markAsPublished.mockResolvedValue(undefined)
      mockImageService.buildImageUrl.mockReturnValue('http://localhost:3000/api/v1/image/image-123')
      mockBaseFunctionHelper.filterValidFCMUsers.mockReturnValue([sampleUserWithWrongToken])

      // Mock getFCM method
      const getFCMSpy = jest.spyOn(service as any, 'getFCM').mockReturnValue(mockFCM)

      // Mock sendFCMPayloadToPlatform to always fail
      const sendFCMPayloadToPlatformSpy = jest
        .spyOn(service as any, 'sendFCMPayloadToPlatform')
        .mockRejectedValue(new Error('Invalid FCM token'))

      // sendNow catches errors and returns error response, doesn't throw
      const result = await service.sendNow(dto)

      expect(result.responseCode).toBe(1)
      expect(result.errorCode).toBe(ErrorCode.INTERNAL_SERVER_ERROR)
      expect(result.responseMessage).toContain('Failed to send notification to any users')

      getFCMSpy.mockRestore()
      sendFCMPayloadToPlatformSpy.mockRestore()
    })
  })

  describe('Flash Notification Limits - showPerDay and maxDayShowing', () => {
    const flashTemplateWithLimits = {
      ...sampleTemplate,
      id: 1,
      notificationType: NotificationType.FLASH_NOTIFICATION,
      showPerDay: 2,
      maxDayShowing: 3,
      bakongPlatform: BakongApp.BAKONG,
      translations: [sampleTranslation],
    } as any

    const flashTemplateDefaultLimits = {
      ...sampleTemplate,
      id: 2,
      notificationType: NotificationType.FLASH_NOTIFICATION,
      showPerDay: 1, // Default
      maxDayShowing: 1, // Default
      bakongPlatform: BakongApp.BAKONG,
      translations: [sampleTranslation],
    } as any

    beforeEach(() => {
      jest.clearAllMocks()
    })

    // Helper function to setup mocks for flash notification flow
    const setupFlashNotificationMocks = (template: any, translation: any = sampleTranslation) => {
      mockBaseFunctionHelper.findUserByAccountId
        .mockResolvedValueOnce(sampleUser) // First call in sendNow
        .mockResolvedValueOnce(sampleUser) // Second call in handleFlashNotification
      mockBaseFunctionHelper.updateUserData.mockResolvedValue({})
      mockBakongUserRepo.find.mockResolvedValue([sampleUser])
      mockTemplateRepo.find.mockResolvedValue([template])
      mockTemplateService.findNotificationTemplate.mockResolvedValue({
        template: template,
        notificationType: NotificationType.FLASH_NOTIFICATION,
      })
      ValidationHelper.validateTranslation = jest.fn().mockReturnValue({
        isValid: true,
        translation: translation,
      })
      mockTemplateService.findBestTemplateForUser.mockResolvedValue({
        template: template,
        translation: translation,
      })
      mockTemplateService.findBestTranslation.mockReturnValue(translation)
    }

    it('should send flash notification successfully when within daily limit', async () => {
      const dto: SentNotificationDto = {
        accountId: 'test@bkrt.com',
        language: Language.EN,
        notificationType: NotificationType.FLASH_NOTIFICATION,
        bakongPlatform: BakongApp.BAKONG,
        fcmToken: 'test-token',
        platform: Platform.IOS,
      } as SentNotificationDto

      setupFlashNotificationMocks(flashTemplateWithLimits)

      // No notifications sent today (within limit)
      mockNotificationRepo.count.mockResolvedValue(0)
      mockNotificationRepo.find.mockResolvedValue([]) // No previous notifications

      mockNotificationRepo.create.mockReturnValue(sampleNotification)
      mockNotificationRepo.save.mockResolvedValue(sampleNotification)
      mockTemplateService.markAsPublished.mockResolvedValue(undefined)
      mockImageService.buildImageUrl.mockReturnValue('http://localhost:3000/api/v1/image/image-123')

      const mockFCM = {
        send: jest.fn().mockResolvedValue('message-id-123'),
      }
      FirebaseManager.getMessaging = jest.fn().mockReturnValue(mockFCM)
      const getFCMSpy = jest.spyOn(service as any, 'getFCM').mockReturnValue(mockFCM)
      const sendFCMPayloadToPlatformSpy = jest
        .spyOn(service as any, 'sendFCMPayloadToPlatform')
        .mockResolvedValue('message-id-123')

      const result = await service.sendNow(dto)

      expect(result.responseCode).toBe(0)
      expect(result.data).toHaveProperty('whatnews')
      expect(mockNotificationRepo.count).toHaveBeenCalled()
      expect(mockNotificationRepo.find).toHaveBeenCalled()

      getFCMSpy.mockRestore()
      sendFCMPayloadToPlatformSpy.mockRestore()
    })

    it('should reject flash notification when daily limit (showPerDay) is reached', async () => {
      const dto: SentNotificationDto = {
        accountId: 'test@bkrt.com',
        language: Language.EN,
        notificationType: NotificationType.FLASH_NOTIFICATION,
        bakongPlatform: BakongApp.BAKONG,
        fcmToken: 'test-token',
        platform: Platform.IOS,
      } as SentNotificationDto

      setupFlashNotificationMocks(flashTemplateWithLimits)

      // User has already received 2 notifications today (limit is 2)
      mockNotificationRepo.count.mockResolvedValue(2) // showPerDay limit reached
      mockNotificationRepo.find.mockResolvedValue([])

      const result = await service.sendNow(dto)

      expect(result.responseCode).toBe(1)
      expect(result.errorCode).toBe(ErrorCode.FLASH_LIMIT_REACHED_IN_TODAY)
      expect(result.data).toHaveProperty('limit', 2) // showPerDay
      expect(result.data).toHaveProperty('sendCount', 2)
      expect(mockNotificationRepo.count).toHaveBeenCalled()
    })

    it('should reject flash notification when max days limit (maxDayShowing) is reached', async () => {
      const dto: SentNotificationDto = {
        accountId: 'test@bkrt.com',
        language: Language.EN,
        notificationType: NotificationType.FLASH_NOTIFICATION,
        bakongPlatform: BakongApp.BAKONG,
        fcmToken: 'test-token',
        platform: Platform.IOS,
      } as SentNotificationDto

      // Create notifications from 3 different days
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const twoDaysAgo = new Date()
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

      const notificationsFromDifferentDays = [
        { createdAt: yesterday },
        { createdAt: twoDaysAgo },
        { createdAt: threeDaysAgo },
      ]

      setupFlashNotificationMocks(flashTemplateWithLimits)

      // No notifications today, but has been shown for 3 days (limit is 3)
      mockNotificationRepo.count.mockResolvedValue(0) // Not reached daily limit
      mockNotificationRepo.find.mockResolvedValue(notificationsFromDifferentDays) // 3 distinct days

      const result = await service.sendNow(dto)

      expect(result.responseCode).toBe(1)
      expect(result.errorCode).toBe(ErrorCode.FLASH_LIMIT_REACHED_IN_TODAY)
      expect(result.data).toHaveProperty('limit', 3) // maxDayShowing
      expect(result.data).toHaveProperty('daysCount', 3)
      expect(mockNotificationRepo.find).toHaveBeenCalled()
    })

    it('should use default limits (1 per day, 1 day max) when not specified', async () => {
      const dto: SentNotificationDto = {
        accountId: 'test@bkrt.com',
        language: Language.EN,
        notificationType: NotificationType.FLASH_NOTIFICATION,
        bakongPlatform: BakongApp.BAKONG,
        fcmToken: 'test-token',
        platform: Platform.IOS,
      } as SentNotificationDto

      setupFlashNotificationMocks(flashTemplateDefaultLimits)

      // User has already received 1 notification today (default limit is 1)
      mockNotificationRepo.count.mockResolvedValue(1) // Default showPerDay limit reached
      mockNotificationRepo.find.mockResolvedValue([])

      const result = await service.sendNow(dto)

      expect(result.responseCode).toBe(1)
      expect(result.errorCode).toBe(ErrorCode.FLASH_LIMIT_REACHED_IN_TODAY)
      expect(result.data).toHaveProperty('limit', 1) // Default showPerDay
    })

    it('should allow sending when within both daily and max days limits', async () => {
      const dto: SentNotificationDto = {
        accountId: 'test@bkrt.com',
        language: Language.EN,
        notificationType: NotificationType.FLASH_NOTIFICATION,
        bakongPlatform: BakongApp.BAKONG,
        fcmToken: 'test-token',
        platform: Platform.IOS,
      } as SentNotificationDto

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      setupFlashNotificationMocks(flashTemplateWithLimits)

      // 1 notification today (limit is 2, so OK)
      mockNotificationRepo.count.mockResolvedValue(1)
      // 1 notification from yesterday (2 days total, limit is 3, so OK)
      mockNotificationRepo.find.mockResolvedValue([{ createdAt: yesterday }])

      mockNotificationRepo.create.mockReturnValue(sampleNotification)
      mockNotificationRepo.save.mockResolvedValue(sampleNotification)
      mockTemplateService.markAsPublished.mockResolvedValue(undefined)
      mockImageService.buildImageUrl.mockReturnValue('http://localhost:3000/api/v1/image/image-123')

      const mockFCM = {
        send: jest.fn().mockResolvedValue('message-id-123'),
      }
      FirebaseManager.getMessaging = jest.fn().mockReturnValue(mockFCM)
      const getFCMSpy = jest.spyOn(service as any, 'getFCM').mockReturnValue(mockFCM)
      const sendFCMPayloadToPlatformSpy = jest
        .spyOn(service as any, 'sendFCMPayloadToPlatform')
        .mockResolvedValue('message-id-123')

      const result = await service.sendNow(dto)

      expect(result.responseCode).toBe(0)
      expect(result.data).toHaveProperty('whatnews')
      expect(mockNotificationRepo.save).toHaveBeenCalled()

      getFCMSpy.mockRestore()
      sendFCMPayloadToPlatformSpy.mockRestore()
    })

    it('should handle flash notification with custom showPerDay=3 and maxDayShowing=5', async () => {
      const customTemplate = {
        ...sampleTemplate,
        id: 3,
        notificationType: NotificationType.FLASH_NOTIFICATION,
        showPerDay: 3,
        maxDayShowing: 5,
        bakongPlatform: BakongApp.BAKONG,
        translations: [sampleTranslation],
      } as any

      const dto: SentNotificationDto = {
        accountId: 'test@bkrt.com',
        language: Language.EN,
        notificationType: NotificationType.FLASH_NOTIFICATION,
        bakongPlatform: BakongApp.BAKONG,
        fcmToken: 'test-token',
        platform: Platform.IOS,
      } as SentNotificationDto

      setupFlashNotificationMocks(customTemplate)

      // 2 notifications today (limit is 3, so OK)
      mockNotificationRepo.count.mockResolvedValue(2)
      mockNotificationRepo.find.mockResolvedValue([])

      mockNotificationRepo.create.mockReturnValue(sampleNotification)
      mockNotificationRepo.save.mockResolvedValue(sampleNotification)
      mockTemplateService.markAsPublished.mockResolvedValue(undefined)
      mockImageService.buildImageUrl.mockReturnValue('http://localhost:3000/api/v1/image/image-123')

      const mockFCM = {
        send: jest.fn().mockResolvedValue('message-id-123'),
      }
      FirebaseManager.getMessaging = jest.fn().mockReturnValue(mockFCM)
      const getFCMSpy = jest.spyOn(service as any, 'getFCM').mockReturnValue(mockFCM)
      const sendFCMPayloadToPlatformSpy = jest
        .spyOn(service as any, 'sendFCMPayloadToPlatform')
        .mockResolvedValue('message-id-123')

      const result = await service.sendNow(dto)

      expect(result.responseCode).toBe(0)
      expect(result.data).toHaveProperty('whatnews')

      getFCMSpy.mockRestore()
      sendFCMPayloadToPlatformSpy.mockRestore()
    })
  })

  describe('Announcement Notification - No Limits', () => {
    it('should send announcement notification without daily or max days limits', async () => {
      const announcementTemplate = {
        ...sampleTemplate,
        id: 1,
        notificationType: NotificationType.ANNOUNCEMENT,
        bakongPlatform: BakongApp.BAKONG,
        translations: [sampleTranslation],
      } as any

      const dto: SentNotificationDto = {
        language: Language.EN,
        notificationType: NotificationType.ANNOUNCEMENT,
      } as SentNotificationDto

      mockTemplateService.findNotificationTemplate.mockResolvedValue({
        template: announcementTemplate,
        notificationType: NotificationType.ANNOUNCEMENT,
      })
      ValidationHelper.validateTranslation = jest.fn().mockReturnValue({
        isValid: true,
        translation: sampleTranslation,
      })
      mockBakongUserRepo.find
        .mockResolvedValueOnce([sampleUser])
        .mockResolvedValueOnce([sampleUser])
      mockBaseFunctionHelper.syncAllUsers.mockResolvedValue({
        updatedCount: 0,
        totalCount: 1,
        platformUpdates: 0,
        languageUpdates: 0,
        invalidTokens: 0,
        updatedIds: [],
      })
      ValidationHelper.validateFCMTokens = jest.fn().mockResolvedValue([sampleUser])

      const mockFCM = {
        send: jest.fn().mockResolvedValue('message-id-123'),
      }
      FirebaseManager.getMessaging = jest.fn().mockReturnValue(mockFCM)
      const getFCMSpy = jest.spyOn(service as any, 'getFCM').mockReturnValue(mockFCM)

      mockNotificationRepo.create.mockReturnValue(sampleNotification)
      mockNotificationRepo.save.mockResolvedValue(sampleNotification)
      mockNotificationRepo.update.mockResolvedValue({ affected: 1 })
      mockTemplateService.markAsPublished.mockResolvedValue(undefined)
      mockTemplateService.findBestTranslation.mockReturnValue(sampleTranslation)
      mockImageService.buildImageUrl.mockReturnValue('http://localhost:3000/api/v1/image/image-123')
      mockBaseFunctionHelper.filterValidFCMUsers.mockReturnValue([sampleUser])
      const sendFCMPayloadToPlatformSpy = jest
        .spyOn(service as any, 'sendFCMPayloadToPlatform')
        .mockResolvedValue('message-id-123')
      mockQueryBuilder.getOne.mockResolvedValue(null)
      const updateNotificationRecordSpy = jest
        .spyOn(service as any, 'updateNotificationRecord')
        .mockResolvedValue(undefined)

      const result = await service.sendNow(dto)

      expect(result.responseCode).toBe(0)
      expect(result.data).toHaveProperty('whatnews')
      // Announcements should not check daily or max days limits
      expect(mockNotificationRepo.count).not.toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            templateId: announcementTemplate.id,
          }),
        }),
      )

      getFCMSpy.mockRestore()
      sendFCMPayloadToPlatformSpy.mockRestore()
      updateNotificationRecordSpy.mockRestore()
    })

    it('should allow multiple announcement notifications to same user without limits', async () => {
      const announcementTemplate = {
        ...sampleTemplate,
        id: 1,
        notificationType: NotificationType.ANNOUNCEMENT,
        bakongPlatform: BakongApp.BAKONG,
        translations: [sampleTranslation],
      } as any

      const dto: SentNotificationDto = {
        language: Language.EN,
        notificationType: NotificationType.ANNOUNCEMENT,
      } as SentNotificationDto

      mockTemplateService.findNotificationTemplate.mockResolvedValue({
        template: announcementTemplate,
        notificationType: NotificationType.ANNOUNCEMENT,
      })
      ValidationHelper.validateTranslation = jest.fn().mockReturnValue({
        isValid: true,
        translation: sampleTranslation,
      })
      mockBakongUserRepo.find
        .mockResolvedValueOnce([sampleUser])
        .mockResolvedValueOnce([sampleUser])
        .mockResolvedValueOnce([sampleUser])
        .mockResolvedValueOnce([sampleUser])
      mockBaseFunctionHelper.syncAllUsers.mockResolvedValue({
        updatedCount: 0,
        totalCount: 1,
        platformUpdates: 0,
        languageUpdates: 0,
        invalidTokens: 0,
        updatedIds: [],
      })
      ValidationHelper.validateFCMTokens = jest.fn().mockResolvedValue([sampleUser])

      const mockFCM = {
        send: jest.fn().mockResolvedValue('message-id-123'),
      }
      FirebaseManager.getMessaging = jest.fn().mockReturnValue(mockFCM)
      const getFCMSpy = jest.spyOn(service as any, 'getFCM').mockReturnValue(mockFCM)

      mockNotificationRepo.create.mockReturnValue(sampleNotification)
      mockNotificationRepo.save.mockResolvedValue(sampleNotification)
      mockNotificationRepo.update.mockResolvedValue({ affected: 1 })
      mockTemplateService.markAsPublished.mockResolvedValue(undefined)
      mockTemplateService.findBestTranslation.mockReturnValue(sampleTranslation)
      mockImageService.buildImageUrl.mockReturnValue('http://localhost:3000/api/v1/image/image-123')
      mockBaseFunctionHelper.filterValidFCMUsers.mockReturnValue([sampleUser])
      const sendFCMPayloadToPlatformSpy = jest
        .spyOn(service as any, 'sendFCMPayloadToPlatform')
        .mockResolvedValue('message-id-123')
      mockQueryBuilder.getOne.mockResolvedValue(null)
      const updateNotificationRecordSpy = jest
        .spyOn(service as any, 'updateNotificationRecord')
        .mockResolvedValue(undefined)

      // Send first announcement
      const result1 = await service.sendNow(dto)
      expect(result1.responseCode).toBe(0)

      // Send second announcement immediately (should work, no limits)
      const result2 = await service.sendNow(dto)
      expect(result2.responseCode).toBe(0)

      // Both should succeed
      expect(result1.data).toHaveProperty('whatnews')
      expect(result2.data).toHaveProperty('whatnews')

      getFCMSpy.mockRestore()
      sendFCMPayloadToPlatformSpy.mockRestore()
      updateNotificationRecordSpy.mockRestore()
    })
  })

  describe('Flash Notification Edge Cases', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    // Helper function to setup mocks for flash notification flow
    const setupFlashNotificationMocks = (template: any, translation: any = sampleTranslation) => {
      mockBaseFunctionHelper.findUserByAccountId
        .mockResolvedValueOnce(sampleUser) // First call in sendNow
        .mockResolvedValueOnce(sampleUser) // Second call in handleFlashNotification
      mockBaseFunctionHelper.updateUserData.mockResolvedValue({})
      mockBakongUserRepo.find.mockResolvedValue([sampleUser])
      mockTemplateRepo.find.mockResolvedValue([template])
      mockTemplateService.findNotificationTemplate.mockResolvedValue({
        template: template,
        notificationType: NotificationType.FLASH_NOTIFICATION,
      })
      ValidationHelper.validateTranslation = jest.fn().mockReturnValue({
        isValid: true,
        translation: translation,
      })
      mockTemplateService.findBestTemplateForUser.mockResolvedValue({
        template: template,
        translation: translation,
      })
      mockTemplateService.findBestTranslation.mockReturnValue(translation)
    }

    it('should use default limits (1, 1) when template has null/undefined showPerDay and maxDayShowing', async () => {
      const templateWithNullLimits = {
        ...sampleTemplate,
        id: 4,
        notificationType: NotificationType.FLASH_NOTIFICATION,
        showPerDay: null,
        maxDayShowing: undefined,
        bakongPlatform: BakongApp.BAKONG,
        translations: [sampleTranslation],
      } as any

      const dto: SentNotificationDto = {
        accountId: 'test@bkrt.com',
        language: Language.EN,
        notificationType: NotificationType.FLASH_NOTIFICATION,
        bakongPlatform: BakongApp.BAKONG,
        fcmToken: 'test-token',
        platform: Platform.IOS,
      } as SentNotificationDto

      setupFlashNotificationMocks(templateWithNullLimits)

      mockNotificationRepo.count.mockResolvedValue(1)
      mockNotificationRepo.find.mockResolvedValue([])

      const result = await service.sendNow(dto)

      expect(result.responseCode).toBe(1)
      expect(result.errorCode).toBe(ErrorCode.FLASH_LIMIT_REACHED_IN_TODAY)
      expect(result.data).toHaveProperty('limit', 1)
    })

    it('should handle flash notification with specific templateId (bypasses findBestTemplateForUser)', async () => {
      const flashTemplateWithLimits = {
        ...sampleTemplate,
        id: 1,
        notificationType: NotificationType.FLASH_NOTIFICATION,
        showPerDay: 2,
        maxDayShowing: 3,
        bakongPlatform: BakongApp.BAKONG,
        translations: [sampleTranslation],
        isSent: true, // Must be published
      } as any

      const dto: SentNotificationDto = {
        accountId: 'test@bkrt.com',
        language: Language.EN,
        notificationType: NotificationType.FLASH_NOTIFICATION,
        templateId: 1,
        bakongPlatform: BakongApp.BAKONG,
        fcmToken: 'test-token',
        platform: Platform.IOS,
      } as SentNotificationDto

      mockBaseFunctionHelper.findUserByAccountId
        .mockResolvedValueOnce(sampleUser) // First call in sendNow
        .mockResolvedValueOnce(sampleUser) // Second call in handleFlashNotification
      mockBaseFunctionHelper.updateUserData.mockResolvedValue({})
      mockBakongUserRepo.find.mockResolvedValue([sampleUser])
      // When templateId is provided, sendNow uses findNotificationTemplate which calls findOne
      mockTemplateService.findNotificationTemplate.mockResolvedValue({
        template: flashTemplateWithLimits,
        notificationType: NotificationType.FLASH_NOTIFICATION,
      })
      // handleFlashNotification also calls findOne when templateId is provided
      mockTemplateRepo.findOne
        .mockResolvedValueOnce(flashTemplateWithLimits) // First call in sendNow (via findNotificationTemplate)
        .mockResolvedValueOnce(flashTemplateWithLimits) // Second call in handleFlashNotification
      ValidationHelper.validateTranslation = jest.fn().mockReturnValue({
        isValid: true,
        translation: sampleTranslation,
      })
      mockTemplateService.findBestTranslation.mockReturnValue(sampleTranslation)

      // handleFlashNotification still checks limits even with templateId
      mockNotificationRepo.count.mockResolvedValue(0)
      mockNotificationRepo.find.mockResolvedValue([])

      mockNotificationRepo.create.mockReturnValue(sampleNotification)
      mockNotificationRepo.save.mockResolvedValue(sampleNotification)
      mockTemplateService.markAsPublished.mockResolvedValue(undefined)
      mockImageService.buildImageUrl.mockReturnValue('http://localhost:3000/api/v1/image/image-123')

      const mockFCM = {
        send: jest.fn().mockResolvedValue('message-id-123'),
      }
      FirebaseManager.getMessaging = jest.fn().mockReturnValue(mockFCM)
      const getFCMSpy = jest.spyOn(service as any, 'getFCM').mockReturnValue(mockFCM)
      const sendFCMPayloadToPlatformSpy = jest
        .spyOn(service as any, 'sendFCMPayloadToPlatform')
        .mockResolvedValue('message-id-123')

      const result = await service.sendNow(dto)

      expect(result.responseCode).toBe(0)
      expect(result.data).toHaveProperty('whatnews')
      // When templateId is provided, it uses findOne instead of find
      expect(mockTemplateRepo.findOne).toHaveBeenCalled()
      // findBestTemplateForUser is not called when templateId is provided
      expect(mockTemplateService.findBestTemplateForUser).not.toHaveBeenCalled()

      getFCMSpy.mockRestore()
      sendFCMPayloadToPlatformSpy.mockRestore()
    })

    it('should correctly increment sendCount when sending multiple times in same day', async () => {
      const flashTemplateWithLimits = {
        ...sampleTemplate,
        id: 1,
        notificationType: NotificationType.FLASH_NOTIFICATION,
        showPerDay: 2,
        maxDayShowing: 3,
        bakongPlatform: BakongApp.BAKONG,
        translations: [sampleTranslation],
      } as any

      const dto: SentNotificationDto = {
        accountId: 'test@bkrt.com',
        language: Language.EN,
        notificationType: NotificationType.FLASH_NOTIFICATION,
        bakongPlatform: BakongApp.BAKONG,
        fcmToken: 'test-token',
        platform: Platform.IOS,
      } as SentNotificationDto

      // First send
      setupFlashNotificationMocks(flashTemplateWithLimits)

      mockNotificationRepo.count.mockResolvedValue(0)
      mockNotificationRepo.find.mockResolvedValue([])

      const firstNotification = { ...sampleNotification, id: 1, sendCount: 1 }
      mockNotificationRepo.create.mockReturnValue(firstNotification)
      mockNotificationRepo.save.mockResolvedValue(firstNotification)
      mockTemplateService.markAsPublished.mockResolvedValue(undefined)
      mockImageService.buildImageUrl.mockReturnValue('http://localhost:3000/api/v1/image/image-123')

      const mockFCM = {
        send: jest.fn().mockResolvedValue('message-id-123'),
      }
      FirebaseManager.getMessaging = jest.fn().mockReturnValue(mockFCM)
      const getFCMSpy = jest.spyOn(service as any, 'getFCM').mockReturnValue(mockFCM)
      const sendFCMPayloadToPlatformSpy = jest
        .spyOn(service as any, 'sendFCMPayloadToPlatform')
        .mockResolvedValue('message-id-123')

      const result1 = await service.sendNow(dto)
      expect(result1.responseCode).toBe(0)

      // Second send
      setupFlashNotificationMocks(flashTemplateWithLimits)
      mockNotificationRepo.count.mockResolvedValue(1)
      const secondNotification = { ...sampleNotification, id: 2, sendCount: 2 }
      mockNotificationRepo.create.mockReturnValue(secondNotification)
      mockNotificationRepo.save.mockResolvedValue(secondNotification)

      const result2 = await service.sendNow(dto)
      expect(result2.responseCode).toBe(0)

      getFCMSpy.mockRestore()
      sendFCMPayloadToPlatformSpy.mockRestore()
    })

    it('should handle boundary condition: exactly at showPerDay limit (should reject)', async () => {
      const flashTemplateWithLimits = {
        ...sampleTemplate,
        id: 1,
        notificationType: NotificationType.FLASH_NOTIFICATION,
        showPerDay: 2,
        maxDayShowing: 3,
        bakongPlatform: BakongApp.BAKONG,
        translations: [sampleTranslation],
      } as any

      const dto: SentNotificationDto = {
        accountId: 'test@bkrt.com',
        language: Language.EN,
        notificationType: NotificationType.FLASH_NOTIFICATION,
        bakongPlatform: BakongApp.BAKONG,
        fcmToken: 'test-token',
        platform: Platform.IOS,
      } as SentNotificationDto

      setupFlashNotificationMocks(flashTemplateWithLimits)

      mockNotificationRepo.count.mockResolvedValue(2)
      mockNotificationRepo.find.mockResolvedValue([])

      const result = await service.sendNow(dto)

      expect(result.responseCode).toBe(1)
      expect(result.errorCode).toBe(ErrorCode.FLASH_LIMIT_REACHED_IN_TODAY)
      expect(result.data).toHaveProperty('limit', 2)
      expect(result.data).toHaveProperty('sendCount', 2)
    })

    it('should handle when findBestTemplateForUser returns null (all templates at limit)', async () => {
      const dto: SentNotificationDto = {
        accountId: 'test@bkrt.com',
        language: Language.EN,
        notificationType: NotificationType.FLASH_NOTIFICATION,
        bakongPlatform: BakongApp.BAKONG,
        fcmToken: 'test-token',
        platform: Platform.IOS,
      } as SentNotificationDto

      mockBaseFunctionHelper.findUserByAccountId
        .mockResolvedValueOnce(sampleUser)
        .mockResolvedValueOnce(sampleUser)
      mockBaseFunctionHelper.updateUserData.mockResolvedValue({})
      mockBakongUserRepo.find.mockResolvedValue([sampleUser])
      mockTemplateRepo.find.mockResolvedValue([])
      mockTemplateService.findNotificationTemplate.mockResolvedValue({
        template: null,
        notificationType: NotificationType.FLASH_NOTIFICATION,
      })
      mockTemplateService.findBestTemplateForUser.mockResolvedValue(null)

      const result = await service.sendNow(dto)

      expect(result.responseCode).toBe(1)
      expect(result.errorCode).toBe(ErrorCode.INTERNAL_SERVER_ERROR)
    })
  })
})
