import { BaseFunctionHelper } from './base-function.helper'
import { BakongApp } from '@bakong/shared'
import { Repository } from 'typeorm'
import { BakongUser } from 'src/entities/bakong-user.entity'
import { Logger } from '@nestjs/common'

describe('BaseFunctionHelper - inferBakongPlatform', () => {
  let helper: BaseFunctionHelper
  let mockRepo: jest.Mocked<Repository<BakongUser>>
  let mockLogger: jest.Mocked<Logger>

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    } as any

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as any

    helper = new BaseFunctionHelper(mockRepo, mockLogger)
  })

  // Test inference logic using reflection to access private method
  const testInference = (participantCode?: string, accountId?: string): BakongApp | undefined => {
    // Access private method via reflection
    const inferMethod = (helper as any).inferBakongPlatform.bind(helper)
    return inferMethod(participantCode, accountId)
  }

  describe('inferBakongPlatform from participantCode', () => {
    it('should infer BAKONG from BKRT prefix', () => {
      expect(testInference('BKRTKHPPXXX', 'user@test')).toBe(BakongApp.BAKONG)
      expect(testInference('bkrtkhppxxx', 'user@test')).toBe(BakongApp.BAKONG) // lowercase
      expect(testInference('BKRT123', 'user@test')).toBe(BakongApp.BAKONG)
    })

    it('should infer BAKONG_JUNIOR from BKJR prefix', () => {
      expect(testInference('BKJRKHPPXXX', 'user@test')).toBe(BakongApp.BAKONG_JUNIOR)
      expect(testInference('bkjrkhppxxx', 'user@test')).toBe(BakongApp.BAKONG_JUNIOR) // lowercase
      expect(testInference('BKJR123', 'user@test')).toBe(BakongApp.BAKONG_JUNIOR)
    })

    it('should infer BAKONG_TOURIST from TOUR prefix', () => {
      expect(testInference('TOURKHPPXXX', 'user@test')).toBe(BakongApp.BAKONG_TOURIST)
      expect(testInference('tourkhppxxx', 'user@test')).toBe(BakongApp.BAKONG_TOURIST) // lowercase
      expect(testInference('TOUR123', 'user@test')).toBe(BakongApp.BAKONG_TOURIST)
    })

    it('should return undefined for unknown participantCode', () => {
      expect(testInference('UNKNOWN123', 'user@test')).toBeUndefined()
      expect(testInference('FTCC123', 'user@test')).toBeUndefined()
    })
  })

  describe('inferBakongPlatform from accountId', () => {
    it('should infer BAKONG from @bkrt domain', () => {
      expect(testInference(undefined, 'user@bkrt')).toBe(BakongApp.BAKONG)
      expect(testInference(undefined, 'user@BKRT')).toBe(BakongApp.BAKONG) // uppercase
      expect(testInference(undefined, 'test.user@bkrt')).toBe(BakongApp.BAKONG)
    })

    it('should infer BAKONG_JUNIOR from @bkjr domain', () => {
      expect(testInference(undefined, 'user@bkjr')).toBe(BakongApp.BAKONG_JUNIOR)
      expect(testInference(undefined, 'user@BKJR')).toBe(BakongApp.BAKONG_JUNIOR) // uppercase
      expect(testInference(undefined, 'test.user@bkjr')).toBe(BakongApp.BAKONG_JUNIOR)
    })

    it('should infer BAKONG_TOURIST from @tour domain', () => {
      expect(testInference(undefined, 'user@tour')).toBe(BakongApp.BAKONG_TOURIST)
      expect(testInference(undefined, 'user@TOUR')).toBe(BakongApp.BAKONG_TOURIST) // uppercase
      expect(testInference(undefined, 'test.user@tour')).toBe(BakongApp.BAKONG_TOURIST)
    })

    it('should return undefined for unknown accountId domain', () => {
      expect(testInference(undefined, 'user@unknown')).toBeUndefined()
      expect(testInference(undefined, 'user123')).toBeUndefined()
      expect(testInference(undefined, 'user@test.com')).toBeUndefined()
    })
  })

  describe('Priority: participantCode over accountId', () => {
    it('should use participantCode even if accountId suggests different platform', () => {
      // participantCode says BAKONG, accountId says BAKONG_JUNIOR
      expect(testInference('BKRTKHPPXXX', 'user@bkjr')).toBe(BakongApp.BAKONG)
    })
  })

  describe('syncUser - new user creation', () => {
    it('should infer bakongPlatform for new user with participantCode', async () => {
      mockRepo.findOne.mockResolvedValue(null) // New user
      mockRepo.create.mockReturnValue({
        accountId: 'test@bkrt',
        participantCode: 'BKRTKHPPXXX',
        fcmToken: 'token123',
        platform: 'ANDROID',
        language: 'KM',
        bakongPlatform: BakongApp.BAKONG,
      } as any)
      mockRepo.save.mockResolvedValue({
        accountId: 'test@bkrt',
        bakongPlatform: BakongApp.BAKONG,
      } as any)

      const result = await helper.syncUser({
        accountId: 'test@bkrt',
        participantCode: 'BKRTKHPPXXX',
        fcmToken: 'token123',
        platform: 'ANDROID',
        language: 'KM',
      })

      expect(result.isNewUser).toBe(true)
      expect(result.savedUser.bakongPlatform).toBe(BakongApp.BAKONG)
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          bakongPlatform: BakongApp.BAKONG,
        }),
      )
    })

    it('should infer bakongPlatform for new user with accountId domain', async () => {
      mockRepo.findOne.mockResolvedValue(null) // New user
      mockRepo.create.mockReturnValue({
        accountId: 'user@bkjr',
        fcmToken: 'token123',
        platform: 'IOS',
        language: 'EN',
        bakongPlatform: BakongApp.BAKONG_JUNIOR,
      } as any)
      mockRepo.save.mockResolvedValue({
        accountId: 'user@bkjr',
        bakongPlatform: BakongApp.BAKONG_JUNIOR,
      } as any)

      const result = await helper.syncUser({
        accountId: 'user@bkjr',
        fcmToken: 'token123',
        platform: 'IOS',
        language: 'EN',
      })

      expect(result.isNewUser).toBe(true)
      expect(result.savedUser.bakongPlatform).toBe(BakongApp.BAKONG_JUNIOR)
    })

    it('should keep NULL if cannot infer bakongPlatform', async () => {
      mockRepo.findOne.mockResolvedValue(null) // New user
      mockRepo.create.mockReturnValue({
        accountId: 'user123',
        fcmToken: 'token123',
        platform: 'ANDROID',
        language: 'KM',
        bakongPlatform: undefined,
      } as any)
      mockRepo.save.mockResolvedValue({
        accountId: 'user123',
        bakongPlatform: undefined,
      } as any)

      const result = await helper.syncUser({
        accountId: 'user123',
        fcmToken: 'token123',
        platform: 'ANDROID',
        language: 'KM',
      })

      expect(result.isNewUser).toBe(true)
      expect(result.savedUser.bakongPlatform).toBeUndefined()
    })
  })
})
