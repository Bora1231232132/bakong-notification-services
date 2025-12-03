import { NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { BaseResponseDto } from '../../common/base-response.dto'
import { ErrorCode, ResponseMessage } from '@bakong/shared'
import { Image } from '../../entities/image.entity'
import { UploadImageDto } from './dto/upload-image.dto'
import { ImageService } from './image.service'
import { BaseFunctionHelper } from '../../common/util/base-function.helper'
import sharp from 'sharp'

// Mock sharp
jest.mock('sharp', () => {
  const mockSharp = jest.fn(() => ({
    metadata: jest.fn(),
    resize: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn(),
  }))
  return mockSharp
})

describe('ImageService', () => {
  let service: ImageService
  let imageRepo: jest.Mocked<Repository<Image>>
  let baseFunctionHelper: jest.Mocked<BaseFunctionHelper>

  const fileId = 'bb0543d6-acfe-49f7-bc90-8386385c8f7f'
  const mockImage = {
    id: 1,
    fileId: fileId,
    file: Buffer.from('fake-image-data'),
    mimeType: 'image/jpeg',
    originalFileName: 'test.jpg',
    fileHash: 'abc123def456',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as unknown as Image

  const createMockBuffer = (size: number = 1024): Buffer => Buffer.alloc(size, 'test-data')

  beforeEach(async () => {
    const mockImageRepo = {
      findOne: jest.fn(),
      findOneBy: jest.fn().mockResolvedValue(mockImage),
      create: jest.fn().mockReturnValue(mockImage),
      save: jest.fn().mockResolvedValue(mockImage),
    }

    const mockBaseFunctionHelper = {
      getBaseUrl: jest.fn().mockReturnValue('http://localhost:4001'),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageService,
        {
          provide: getRepositoryToken(Image),
          useValue: mockImageRepo,
        },
        {
          provide: BaseFunctionHelper,
          useValue: mockBaseFunctionHelper,
        },
      ],
    }).compile()

    service = module.get<ImageService>(ImageService)
    imageRepo = module.get(getRepositoryToken(Image))
    baseFunctionHelper = module.get(BaseFunctionHelper)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Service Definition', () => {
    it('should be defined', () => {
      expect(service).toBeDefined()
    })
  })

  describe('findByFileId', () => {
    describe('Success Cases', () => {
      it('should return image when found', async () => {
        const result = await service.findByFileId(fileId)

        expect(result).toEqual(mockImage)
        expect(imageRepo.findOneBy).toHaveBeenCalledTimes(1)
        expect(imageRepo.findOneBy).toHaveBeenCalledWith({ fileId })
      })
    })

    describe('Error Cases', () => {
      it('should throw NotFoundException when image not found', async () => {
        imageRepo.findOneBy.mockResolvedValueOnce(null)

        await expect(service.findByFileId(fileId)).rejects.toThrow(NotFoundException)

        try {
          await service.findByFileId(fileId)
        } catch (error: any) {
          expect(error).toBeInstanceOf(NotFoundException)
          expect(error.response).toBeInstanceOf(BaseResponseDto)
          expect(error.response.responseCode).toBe(1)
          expect(error.response.errorCode).toBe(ErrorCode.FILE_NOT_FOUND)
          expect(error.response.responseMessage).toBe(ResponseMessage.FILE_NOT_FOUND)
        }
      })

      it('should propagate repository errors', async () => {
        const dbError = new Error('Database connection failed')
        imageRepo.findOneBy.mockRejectedValueOnce(dbError)

        await expect(service.findByFileId(fileId)).rejects.toThrow('Database connection failed')
      })
    })
  })

  describe('create', () => {
    const createUploadDto = (fileSize: number = 1024): UploadImageDto => ({
      file: createMockBuffer(fileSize),
      mimeType: 'image/jpeg',
      originalFileName: 'test.jpg',
    })

    describe('Success Cases', () => {
      it('should create new image when no duplicate exists', async () => {
        imageRepo.findOne.mockResolvedValueOnce(null) // No duplicate
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue({ width: 100, height: 100 }),
          resize: jest.fn().mockReturnThis(),
          jpeg: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(createMockBuffer(512)),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        const dto = createUploadDto()
        const result = await service.create(dto)

        expect(result).toEqual({ fileId: mockImage.fileId })
        expect(imageRepo.findOne).toHaveBeenCalled()
        expect(imageRepo.create).toHaveBeenCalled()
        expect(imageRepo.save).toHaveBeenCalled()
      })

      it('should return existing fileId when duplicate fileHash exists', async () => {
        const existingImage = { fileId: 'existing-file-id' }
        imageRepo.findOne.mockResolvedValueOnce(existingImage as Image)

        const dto = createUploadDto()
        const result = await service.create(dto)

        expect(result).toEqual({ fileId: 'existing-file-id' })
        expect(imageRepo.findOne).toHaveBeenCalled()
        expect(imageRepo.create).not.toHaveBeenCalled()
        expect(imageRepo.save).not.toHaveBeenCalled()
      })

      it('should compress image before saving', async () => {
        imageRepo.findOne.mockResolvedValueOnce(null)
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue({ width: 3000, height: 2000 }), // Large image
          resize: jest.fn().mockReturnThis(),
          jpeg: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(createMockBuffer(800)),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        const dto = createUploadDto(2000)
        await service.create(dto)

        expect(mockSharpInstance.resize).toHaveBeenCalled()
        expect(mockSharpInstance.jpeg).toHaveBeenCalled()
      })

      it('should handle PNG with alpha channel', async () => {
        imageRepo.findOne.mockResolvedValueOnce(null)
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue({ width: 100, height: 100, hasAlpha: true }),
          resize: jest.fn().mockReturnThis(),
          png: jest.fn().mockReturnThis(),
          jpeg: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(createMockBuffer(512)),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        const dto: UploadImageDto = {
          file: createMockBuffer(),
          mimeType: 'image/png',
          originalFileName: 'test.png',
        }

        await service.create(dto)

        expect(mockSharpInstance.png).toHaveBeenCalledWith({ compressionLevel: 9 })
        expect(mockSharpInstance.jpeg).not.toHaveBeenCalled()
      })
    })

    describe('Race Condition Handling', () => {
      it('should handle unique constraint violation on fileHash (race condition)', async () => {
        imageRepo.findOne
          .mockResolvedValueOnce(null) // First check: no duplicate
          .mockResolvedValueOnce({ fileId: 'race-condition-file-id' } as Image) // After race condition

        const raceConditionError: any = new Error('Unique constraint violation')
        raceConditionError.code = '23505'
        raceConditionError.constraint = 'UQ_image_fileHash'

        imageRepo.save.mockRejectedValueOnce(raceConditionError)

        const dto = createUploadDto()
        const result = await service.create(dto)

        expect(result).toEqual({ fileId: 'race-condition-file-id' })
        expect(imageRepo.findOne).toHaveBeenCalledTimes(2)
      })

      it('should handle race condition with numeric error code', async () => {
        imageRepo.findOne
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ fileId: 'numeric-code-file-id' } as Image)

        const raceConditionError: any = new Error('Unique constraint violation')
        raceConditionError.code = 23505
        raceConditionError.detail = 'fileHash'

        imageRepo.save.mockRejectedValueOnce(raceConditionError)

        const dto = createUploadDto()
        const result = await service.create(dto)

        expect(result).toEqual({ fileId: 'numeric-code-file-id' })
      })

      it('should re-throw non-fileHash constraint violations', async () => {
        imageRepo.findOne.mockResolvedValueOnce(null)

        const otherError: any = new Error('Other constraint violation')
        otherError.code = '23505'
        otherError.constraint = 'UQ_other_column' // Different constraint

        imageRepo.save.mockRejectedValueOnce(otherError)

        const dto = createUploadDto()
        await expect(service.create(dto)).rejects.toThrow('Other constraint violation')
      })

      it('should re-throw non-unique-constraint errors', async () => {
        imageRepo.findOne.mockResolvedValueOnce(null)

        const dbError = new Error('Database connection failed')
        imageRepo.save.mockRejectedValueOnce(dbError)

        const dto = createUploadDto()
        await expect(service.create(dto)).rejects.toThrow('Database connection failed')
      })
    })

    describe('Error Handling', () => {
      it('should continue if duplicate check fails', async () => {
        imageRepo.findOne.mockRejectedValueOnce(new Error('Database error'))
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue({ width: 100, height: 100 }),
          resize: jest.fn().mockReturnThis(),
          jpeg: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(createMockBuffer(512)),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        const dto = createUploadDto()
        const result = await service.create(dto)

        // Should still create the image despite duplicate check error
        expect(result).toEqual({ fileId: mockImage.fileId })
      })

      it('should handle compression errors gracefully', async () => {
        imageRepo.findOne.mockResolvedValueOnce(null)
        const mockSharpInstance = {
          metadata: jest.fn().mockRejectedValue(new Error('Compression failed')),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        const dto = createUploadDto()
        const result = await service.create(dto)

        // Should use original file if compression fails
        expect(result).toEqual({ fileId: mockImage.fileId })
      })
    })
  })

  describe('compressImage', () => {
    it('should compress large images', async () => {
      const largeBuffer = createMockBuffer(5000)
      const mockSharpInstance = {
        metadata: jest.fn().mockResolvedValue({ width: 3000, height: 2000 }),
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(createMockBuffer(2000)),
      }
      ;(sharp as any).mockReturnValue(mockSharpInstance)

      const result = await service.compressImage(largeBuffer, 'image/jpeg')

      expect(mockSharpInstance.resize).toHaveBeenCalled()
      expect(result.buffer).toBeDefined()
      expect(result.mimeType).toBe('image/jpeg')
    })

    it('should not resize images within limits', async () => {
      const smallBuffer = createMockBuffer(500)
      const mockSharpInstance = {
        metadata: jest.fn().mockResolvedValue({ width: 100, height: 100 }),
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(createMockBuffer(500)),
      }
      ;(sharp as any).mockReturnValue(mockSharpInstance)

      await service.compressImage(smallBuffer, 'image/jpeg')

      expect(mockSharpInstance.resize).not.toHaveBeenCalled()
    })

    it('should return original buffer on compression error', async () => {
      const buffer = createMockBuffer(1000)
      const mockSharpInstance = {
        metadata: jest.fn().mockRejectedValue(new Error('Sharp error')),
      }
      ;(sharp as any).mockReturnValue(mockSharpInstance)

      const result = await service.compressImage(buffer, 'image/jpeg')

      expect(result.buffer).toEqual(buffer)
      expect(result.mimeType).toBe('image/jpeg')
    })

    describe('Aspect Ratio Handling', () => {
      it('should maintain 2:1 aspect ratio during compression', async () => {
        const buffer = createMockBuffer(5000)
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue({ width: 2000, height: 1000 }), // 2:1 ratio
          resize: jest.fn().mockReturnThis(),
          jpeg: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(createMockBuffer(2000)),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        const result = await service.compressImage(buffer, 'image/jpeg')

        expect(mockSharpInstance.resize).toHaveBeenCalledWith(
          1920,
          1080,
          expect.objectContaining({
            fit: 'inside',
            withoutEnlargement: true,
          }),
        )
        expect(result.buffer).toBeDefined()
      })

      it('should handle 16:9 aspect ratio images', async () => {
        const buffer = createMockBuffer(5000)
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue({ width: 1920, height: 1080 }), // 16:9 ratio, exactly at limit
          resize: jest.fn().mockReturnThis(),
          jpeg: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(createMockBuffer(2000)),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        const result = await service.compressImage(buffer, 'image/jpeg')

        // Should not resize since dimensions are exactly at limit (not exceeding)
        expect(mockSharpInstance.resize).not.toHaveBeenCalled()
        expect(result.buffer).toBeDefined()
        expect(result.mimeType).toBe('image/jpeg')
      })

      it('should handle 3:2 aspect ratio images', async () => {
        const buffer = createMockBuffer(5000)
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue({ width: 1500, height: 1000 }), // 3:2 ratio, within limits
          resize: jest.fn().mockReturnThis(),
          jpeg: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(createMockBuffer(2000)),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        const result = await service.compressImage(buffer, 'image/jpeg')

        // Should not resize since dimensions are within limits
        expect(mockSharpInstance.resize).not.toHaveBeenCalled()
        expect(result.buffer).toBeDefined()
      })

      it('should handle 4:3 aspect ratio images', async () => {
        const buffer = createMockBuffer(5000)
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue({ width: 1600, height: 1200 }), // 4:3 ratio, height exceeds 1080
          resize: jest.fn().mockReturnThis(),
          jpeg: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(createMockBuffer(2000)),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        const result = await service.compressImage(buffer, 'image/jpeg')

        // Should resize since height (1200) exceeds maxHeight (1080)
        expect(mockSharpInstance.resize).toHaveBeenCalled()
        expect(result.buffer).toBeDefined()
      })

      it('should handle 21:9 ultra-wide aspect ratio images', async () => {
        const buffer = createMockBuffer(5000)
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue({ width: 2100, height: 900 }), // 21:9 ratio, width exceeds 1920
          resize: jest.fn().mockReturnThis(),
          jpeg: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(createMockBuffer(2000)),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        const result = await service.compressImage(buffer, 'image/jpeg')

        // Should resize since width (2100) exceeds maxWidth (1920)
        expect(mockSharpInstance.resize).toHaveBeenCalled()
        expect(result.buffer).toBeDefined()
      })

      it('should handle 1:1 square aspect ratio images', async () => {
        const buffer = createMockBuffer(5000)
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue({ width: 2000, height: 2000 }), // 1:1 square, width exceeds 1920
          resize: jest.fn().mockReturnThis(),
          jpeg: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(createMockBuffer(2000)),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        const result = await service.compressImage(buffer, 'image/jpeg')

        // Should resize since width (2000) exceeds maxWidth (1920)
        expect(mockSharpInstance.resize).toHaveBeenCalled()
        expect(result.buffer).toBeDefined()
      })

      it('should handle portrait 1:2 aspect ratio images', async () => {
        const buffer = createMockBuffer(5000)
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue({ width: 1000, height: 2000 }), // 1:2 portrait, height exceeds 1080
          resize: jest.fn().mockReturnThis(),
          jpeg: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(createMockBuffer(2000)),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        const result = await service.compressImage(buffer, 'image/jpeg')

        // Should resize since height (2000) exceeds maxHeight (1080)
        expect(mockSharpInstance.resize).toHaveBeenCalled()
        expect(result.buffer).toBeDefined()
      })

      it('should handle very wide 3:1 aspect ratio images', async () => {
        const buffer = createMockBuffer(5000)
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue({ width: 3000, height: 1000 }), // 3:1 very wide
          resize: jest.fn().mockReturnThis(),
          jpeg: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(createMockBuffer(2000)),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        const result = await service.compressImage(buffer, 'image/jpeg')

        expect(mockSharpInstance.resize).toHaveBeenCalled()
        expect(result.buffer).toBeDefined()
      })

      it('should handle very tall 1:3 aspect ratio images', async () => {
        const buffer = createMockBuffer(5000)
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue({ width: 1000, height: 3000 }), // 1:3 very tall
          resize: jest.fn().mockReturnThis(),
          jpeg: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(createMockBuffer(2000)),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        const result = await service.compressImage(buffer, 'image/jpeg')

        expect(mockSharpInstance.resize).toHaveBeenCalled()
        expect(result.buffer).toBeDefined()
      })

      it('should maintain aspect ratio when resizing large 2:1 images', async () => {
        const buffer = createMockBuffer(5000)
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue({ width: 4000, height: 2000 }), // Large 2:1
          resize: jest.fn().mockReturnThis(),
          jpeg: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(createMockBuffer(2000)),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        await service.compressImage(buffer, 'image/jpeg')

        expect(mockSharpInstance.resize).toHaveBeenCalledWith(
          1920,
          1080,
          expect.objectContaining({
            fit: 'inside', // Maintains aspect ratio
            withoutEnlargement: true,
          }),
        )
      })

      it('should maintain aspect ratio when resizing large 16:9 images', async () => {
        const buffer = createMockBuffer(5000)
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue({ width: 3840, height: 2160 }), // Large 16:9 (4K)
          resize: jest.fn().mockReturnThis(),
          jpeg: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(createMockBuffer(2000)),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        await service.compressImage(buffer, 'image/jpeg')

        expect(mockSharpInstance.resize).toHaveBeenCalledWith(
          1920,
          1080,
          expect.objectContaining({
            fit: 'inside', // Maintains aspect ratio
            withoutEnlargement: true,
          }),
        )
      })

      it('should not resize images that are already within limits (2:1)', async () => {
        const buffer = createMockBuffer(500)
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue({ width: 1000, height: 500 }), // Small 2:1, within limits
          resize: jest.fn().mockReturnThis(),
          jpeg: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(createMockBuffer(500)),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        await service.compressImage(buffer, 'image/jpeg')

        expect(mockSharpInstance.resize).not.toHaveBeenCalled()
      })

      it('should handle images with width exceeding maxWidth but height within limit', async () => {
        const buffer = createMockBuffer(5000)
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue({ width: 3000, height: 800 }), // Wide but short, width exceeds 1920
          resize: jest.fn().mockReturnThis(),
          jpeg: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(createMockBuffer(2000)),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        const result = await service.compressImage(buffer, 'image/jpeg')

        // Should resize since width (3000) exceeds maxWidth (1920)
        expect(mockSharpInstance.resize).toHaveBeenCalled()
        expect(result.buffer).toBeDefined()
      })

      it('should handle images with height exceeding maxHeight but width within limit', async () => {
        const buffer = createMockBuffer(5000)
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue({ width: 800, height: 2000 }), // Narrow but tall, height exceeds 1080
          resize: jest.fn().mockReturnThis(),
          jpeg: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(createMockBuffer(2000)),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        const result = await service.compressImage(buffer, 'image/jpeg')

        // Should resize since height (2000) exceeds maxHeight (1080)
        expect(mockSharpInstance.resize).toHaveBeenCalled()
        expect(result.buffer).toBeDefined()
      })

      it('should handle images with both width and height exceeding limits', async () => {
        const buffer = createMockBuffer(5000)
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue({ width: 4000, height: 3000 }), // Both exceed
          resize: jest.fn().mockReturnThis(),
          jpeg: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(createMockBuffer(2000)),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        const result = await service.compressImage(buffer, 'image/jpeg')

        expect(mockSharpInstance.resize).toHaveBeenCalled()
        expect(result.buffer).toBeDefined()
      })

      it('should handle PNG with alpha channel and maintain aspect ratio', async () => {
        const buffer = createMockBuffer(5000)
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue({ width: 2000, height: 1000, hasAlpha: true }), // 2:1 PNG
          resize: jest.fn().mockReturnThis(),
          png: jest.fn().mockReturnThis(),
          jpeg: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(createMockBuffer(2000)),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        const result = await service.compressImage(buffer, 'image/png')

        expect(mockSharpInstance.resize).toHaveBeenCalled()
        expect(mockSharpInstance.png).toHaveBeenCalledWith({ compressionLevel: 9 })
        expect(result.buffer).toBeDefined()
      })

      it('should handle edge case: exactly maxWidth x maxHeight (1920x1080)', async () => {
        const buffer = createMockBuffer(5000)
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue({ width: 1920, height: 1080 }), // Exactly at limit
          resize: jest.fn().mockReturnThis(),
          jpeg: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(createMockBuffer(2000)),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        await service.compressImage(buffer, 'image/jpeg')

        // Should not resize since it's exactly at the limit
        expect(mockSharpInstance.resize).not.toHaveBeenCalled()
      })

      it('should handle edge case: one pixel over maxWidth', async () => {
        const buffer = createMockBuffer(5000)
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue({ width: 1921, height: 1080 }), // One pixel over
          resize: jest.fn().mockReturnThis(),
          jpeg: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(createMockBuffer(2000)),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        const result = await service.compressImage(buffer, 'image/jpeg')

        expect(mockSharpInstance.resize).toHaveBeenCalled()
        expect(result.buffer).toBeDefined()
      })

      it('should handle edge case: one pixel over maxHeight', async () => {
        const buffer = createMockBuffer(5000)
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue({ width: 1920, height: 1081 }), // One pixel over
          resize: jest.fn().mockReturnThis(),
          jpeg: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(createMockBuffer(2000)),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        const result = await service.compressImage(buffer, 'image/jpeg')

        expect(mockSharpInstance.resize).toHaveBeenCalled()
        expect(result.buffer).toBeDefined()
      })

      it('should handle missing metadata gracefully', async () => {
        const buffer = createMockBuffer(1000)
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue({}), // No width/height
          resize: jest.fn().mockReturnThis(),
          jpeg: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(createMockBuffer(1000)),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        const result = await service.compressImage(buffer, 'image/jpeg')

        expect(mockSharpInstance.resize).not.toHaveBeenCalled()
        expect(result.buffer).toBeDefined()
      })

      it('should handle zero dimensions gracefully', async () => {
        const buffer = createMockBuffer(1000)
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue({ width: 0, height: 0 }),
          resize: jest.fn().mockReturnThis(),
          jpeg: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockResolvedValue(createMockBuffer(1000)),
        }
        ;(sharp as any).mockReturnValue(mockSharpInstance)

        const result = await service.compressImage(buffer, 'image/jpeg')

        expect(mockSharpInstance.resize).not.toHaveBeenCalled()
        expect(result.buffer).toBeDefined()
      })
    })
  })

  describe('buildImageUrl', () => {
    it('should build URL with provided baseUrl', () => {
      const url = service.buildImageUrl(fileId, null, 'https://example.com')

      expect(url).toBe(`https://example.com/api/v1/image/${fileId}`)
    })

    it('should use BaseFunctionHelper when baseUrl not provided', () => {
      const url = service.buildImageUrl(fileId)

      expect(baseFunctionHelper.getBaseUrl).toHaveBeenCalled()
      expect(url).toContain('/api/v1/image/')
      expect(url).toContain(fileId)
    })

    it('should enforce HTTPS for production domains', () => {
      const url1 = service.buildImageUrl(fileId, null, 'http://nbc.gov.kh')
      const url2 = service.buildImageUrl(fileId, null, 'http://bakong-notification.com')

      expect(url1).toContain('https://')
      expect(url2).toContain('https://')
    })

    it('should return empty string for empty imageId', () => {
      const url = service.buildImageUrl('')

      expect(url).toBe('')
    })
  })

  describe('getImageUrlFromTranslation', () => {
    it('should return URL when translation has imageId', () => {
      const translation = {
        imageId: fileId,
      } as any

      const url = service.getImageUrlFromTranslation(translation)

      expect(url).toContain('/api/v1/image/')
      expect(url).toContain(fileId)
    })

    it('should return empty string when translation has no imageId', () => {
      const translation = {
        imageId: null,
      } as any

      const url = service.getImageUrlFromTranslation(translation)

      expect(url).toBe('')
    })
  })

  describe('validateImageExists', () => {
    it('should return true when image exists', async () => {
      imageRepo.findOne.mockResolvedValueOnce(mockImage)

      const result = await service.validateImageExists(fileId)

      expect(result).toBe(true)
      expect(imageRepo.findOne).toHaveBeenCalledWith({ where: { fileId } })
    })

    it('should return false when image does not exist', async () => {
      imageRepo.findOne.mockResolvedValueOnce(null)

      const result = await service.validateImageExists(fileId)

      expect(result).toBe(false)
    })

    it('should return false for empty imageId', async () => {
      const result = await service.validateImageExists('')

      expect(result).toBe(false)
      expect(imageRepo.findOne).not.toHaveBeenCalled()
    })
  })

  describe('validateImageId', () => {
    it('should return valid for correct UUID format', () => {
      const result = service.validateImageId(fileId)

      expect(result.isValid).toBe(true)
      expect(result.errorMessage).toBeUndefined()
    })

    it('should return invalid for empty string', () => {
      const result = service.validateImageId('')

      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toBe('Image ID is required and must be a string')
    })

    it('should return invalid for null', () => {
      const result = service.validateImageId(null as any)

      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toBe('Image ID is required and must be a string')
    })

    it('should return invalid for non-string', () => {
      const result = service.validateImageId(123 as any)

      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toBe('Image ID is required and must be a string')
    })

    it('should return invalid for incorrect UUID format', () => {
      const result = service.validateImageId('not-a-uuid')

      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toBe('Invalid image ID format')
    })

    it('should return invalid for malformed UUID', () => {
      // The regex accepts UUID v1-v5, so we test with a truly invalid format
      const invalidUuid = 'not-a-valid-uuid-format-at-all'
      const result = service.validateImageId(invalidUuid)

      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toBe('Invalid image ID format')
    })
  })

  describe('validateImageUrl', () => {
    it('should return valid URL for valid fileId and baseUrl', () => {
      const url = service.validateImageUrl('https://example.com', fileId)

      expect(url).toBe(`https://example.com/api/v1/image/${fileId}`)
    })

    it('should return empty string for invalid URL', () => {
      const url = service.validateImageUrl('not-a-url', fileId)

      expect(url).toBe('')
    })

    it('should return empty string for empty fileId', () => {
      const url = service.validateImageUrl('https://example.com', '')

      expect(url).toBe('')
    })

    it('should build URL even with invalid fileId format (validation happens elsewhere)', () => {
      // Note: validateImageUrl only validates URL format, not fileId UUID format
      // UUID validation should be done separately using validateImageId
      const invalidFileId = 'not-a-uuid'
      const url = service.validateImageUrl('https://example.com', invalidFileId)

      // The method builds the URL if it's a valid URL format, regardless of UUID format
      expect(url).toBe(`https://example.com/api/v1/image/${invalidFileId}`)
    })
  })
})
