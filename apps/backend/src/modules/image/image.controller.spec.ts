import { Test, TestingModule } from '@nestjs/testing'
import { ImageController } from './image.controller'
import { ImageService } from './image.service'
import { Response } from 'express'
import { BaseResponseDto } from '../../common/base-response.dto'
import { ErrorCode, ResponseMessage } from '@bakong/shared'
import { NotFoundException } from '@nestjs/common'

describe('ImageController', () => {
  let controller: ImageController
  let service: ImageService

  const mockResponse: Partial<Response> = {
    set: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  }

  const createMockFile = (
    size: number = 1024,
    mimetype: string = 'image/jpeg',
    originalname: string = 'test.jpg',
  ): Express.Multer.File => ({
    fieldname: 'file',
    originalname,
    encoding: '7bit',
    mimetype,
    size,
    buffer: Buffer.alloc(size),
    destination: '',
    filename: originalname,
    path: '',
    stream: null as any,
  })

  beforeEach(async () => {
    const mockImageService = {
      create: jest.fn(),
      findByFileId: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImageController],
      providers: [
        {
          provide: ImageService,
          useValue: mockImageService,
        },
      ],
    }).compile()

    controller = module.get<ImageController>(ImageController)
    service = module.get<ImageService>(ImageService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Controller Definition', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined()
    })
  })

  describe('uploadFiles', () => {
    describe('Success Cases', () => {
      it('should upload a single valid image file', async () => {
        const mockFile = createMockFile(5 * 1024 * 1024, 'image/jpeg', 'test.jpg')
        const mockFileId = '123e4567-e89b-12d3-a456-426614174000'

        jest.spyOn(service, 'create').mockResolvedValue({ fileId: mockFileId })

        const result = await controller.uploadFiles([mockFile])

        expect(service.create).toHaveBeenCalledTimes(1)
        expect(service.create).toHaveBeenCalledWith({
          file: mockFile.buffer,
          mimeType: 'image/jpeg',
          originalFileName: 'test.jpg',
        })
        expect(result).toEqual({
          files: [
            {
              language: undefined,
              fileId: mockFileId,
              mimeType: 'image/jpeg',
              originalFileName: 'test.jpg',
            },
          ],
        })
      })

      it('should upload multiple valid image files', async () => {
        const mockFiles = [
          createMockFile(2 * 1024 * 1024, 'image/jpeg', 'test1.jpg'),
          createMockFile(3 * 1024 * 1024, 'image/png', 'test2.png'),
          createMockFile(1 * 1024 * 1024, 'image/jpeg', 'test3.jpg'),
        ]
        const mockFileIds = [
          '123e4567-e89b-12d3-a456-426614174001',
          '123e4567-e89b-12d3-a456-426614174002',
          '123e4567-e89b-12d3-a456-426614174003',
        ]

        jest
          .spyOn(service, 'create')
          .mockResolvedValueOnce({ fileId: mockFileIds[0] })
          .mockResolvedValueOnce({ fileId: mockFileIds[1] })
          .mockResolvedValueOnce({ fileId: mockFileIds[2] })

        const result = await controller.uploadFiles(mockFiles)

        expect(service.create).toHaveBeenCalledTimes(3)
        expect(result.files).toHaveLength(3)
        expect(result.files[0].fileId).toBe(mockFileIds[0])
        expect(result.files[1].fileId).toBe(mockFileIds[1])
        expect(result.files[2].fileId).toBe(mockFileIds[2])
      })

      it('should upload image at exactly 10MB limit', async () => {
        const maxBytes = 10 * 1024 * 1024
        const mockFile = createMockFile(maxBytes, 'image/jpeg', 'exact-10mb.jpg')
        const mockFileId = '123e4567-e89b-12d3-a456-426614174004'

        jest.spyOn(service, 'create').mockResolvedValue({ fileId: mockFileId })

        const result = await controller.uploadFiles([mockFile])

        expect(service.create).toHaveBeenCalledTimes(1)
        expect(result.files[0].fileId).toBe(mockFileId)
      })

      it('should upload files with languages parameter', async () => {
        const mockFiles = [
          createMockFile(1 * 1024 * 1024, 'image/jpeg', 'km.jpg'),
          createMockFile(1 * 1024 * 1024, 'image/jpeg', 'en.jpg'),
          createMockFile(1 * 1024 * 1024, 'image/jpeg', 'jp.jpg'),
        ]
        const mockFileIds = [
          '123e4567-e89b-12d3-a456-426614174005',
          '123e4567-e89b-12d3-a456-426614174006',
          '123e4567-e89b-12d3-a456-426614174007',
        ]
        const languages = JSON.stringify(['KM', 'EN', 'JP'])

        jest
          .spyOn(service, 'create')
          .mockResolvedValueOnce({ fileId: mockFileIds[0] })
          .mockResolvedValueOnce({ fileId: mockFileIds[1] })
          .mockResolvedValueOnce({ fileId: mockFileIds[2] })

        const result = await controller.uploadFiles(mockFiles, languages)

        expect(result.files[0].language).toBe('KM')
        expect(result.files[1].language).toBe('EN')
        expect(result.files[2].language).toBe('JP')
      })

      it('should reject files with missing mimetype (validation error)', async () => {
        const mockFile = createMockFile(1 * 1024 * 1024, '', 'test.jpg')
        mockFile.mimetype = undefined as any

        try {
          await controller.uploadFiles([mockFile])
          fail('Should have thrown an error')
        } catch (error: any) {
          expect(error.responseCode).toBe(1)
          expect(error.errorCode).toBe(ErrorCode.VALIDATION_FAILED)
          expect(error.data.validations).toContain('files[0] is not an image (type: unknown)')
        }
      })

      it('should truncate long filenames to 100 characters', async () => {
        const longName = 'a'.repeat(150) + '.jpg'
        const mockFile = createMockFile(1 * 1024 * 1024, 'image/jpeg', longName)
        const mockFileId = '123e4567-e89b-12d3-a456-426614174009'

        jest.spyOn(service, 'create').mockResolvedValue({ fileId: mockFileId })

        const result = await controller.uploadFiles([mockFile])

        expect(service.create).toHaveBeenCalledWith({
          file: mockFile.buffer,
          mimeType: 'image/jpeg',
          originalFileName: longName.substring(0, 100),
        })
        expect(result.files[0].originalFileName).toBe(longName.substring(0, 100))
      })

      it('should handle invalid languages JSON gracefully', async () => {
        const mockFile = createMockFile(1 * 1024 * 1024, 'image/jpeg', 'test.jpg')
        const mockFileId = '123e4567-e89b-12d3-a456-426614174010'
        const invalidLanguages = 'not-valid-json'

        jest.spyOn(service, 'create').mockResolvedValue({ fileId: mockFileId })

        const result = await controller.uploadFiles([mockFile], invalidLanguages)

        expect(result.files[0].language).toBeUndefined()
      })

      it('should handle languages as non-array gracefully', async () => {
        const mockFile = createMockFile(1 * 1024 * 1024, 'image/jpeg', 'test.jpg')
        const mockFileId = '123e4567-e89b-12d3-a456-426614174011'
        const invalidLanguages = JSON.stringify({ not: 'array' })

        jest.spyOn(service, 'create').mockResolvedValue({ fileId: mockFileId })

        const result = await controller.uploadFiles([mockFile], invalidLanguages)

        expect(result.files[0].language).toBeUndefined()
      })
    })

    describe('Validation Error Cases', () => {
      it('should throw error when no files are provided', async () => {
        try {
          await controller.uploadFiles([])
          fail('Should have thrown an error')
        } catch (error: any) {
          expect(error.responseCode).toBe(1)
          expect(error.errorCode).toBe(ErrorCode.VALIDATION_FAILED)
          expect(error.responseMessage).toBe(ResponseMessage.VALIDATION_FAILED)
          expect(error.data.validations).toContain('No files were provided.')
        }
      })

      it('should throw error when files array is null', async () => {
        try {
          await controller.uploadFiles(null as any)
          fail('Should have thrown an error')
        } catch (error: any) {
          expect(error.data.validations).toContain('No files were provided.')
        }
      })

      it('should throw error when file exceeds 10MB', async () => {
        const maxBytes = 10 * 1024 * 1024
        const oversizedFile = createMockFile(maxBytes + 1, 'image/jpeg', 'oversized.jpg')

        try {
          await controller.uploadFiles([oversizedFile])
          fail('Should have thrown an error')
        } catch (error: any) {
          expect(error.responseCode).toBe(1)
          expect(error.errorCode).toBe(ErrorCode.VALIDATION_FAILED)
          expect(error.data.validations).toContain(`files[0] exceeds 10MB (size: ${maxBytes + 1})`)
        }
      })

      it('should throw error when file is exactly over 10MB', async () => {
        const oversizedFile = createMockFile(10 * 1024 * 1024 + 1024, 'image/jpeg', 'big.jpg')

        try {
          await controller.uploadFiles([oversizedFile])
          fail('Should have thrown an error')
        } catch (error: any) {
          expect(error.data.validations[0]).toContain('exceeds 10MB')
        }
      })

      it('should throw error when file type is not an image', async () => {
        const pdfFile = createMockFile(1024, 'application/pdf', 'document.pdf')

        try {
          await controller.uploadFiles([pdfFile])
          fail('Should have thrown an error')
        } catch (error: any) {
          expect(error.responseCode).toBe(1)
          expect(error.data.validations).toContain(
            'files[0] is not an image (type: application/pdf)',
          )
        }
      })

      it('should throw error when file has unknown mimetype', async () => {
        const unknownFile = createMockFile(1024, 'unknown/type', 'file.unknown')
        unknownFile.mimetype = undefined as any

        try {
          await controller.uploadFiles([unknownFile])
          fail('Should have thrown an error')
        } catch (error: any) {
          expect(error.data.validations).toContain('files[0] is not an image (type: unknown)')
        }
      })

      it('should throw error when file has null mimetype', async () => {
        const nullMimeFile = createMockFile(1024, 'image/jpeg', 'test.jpg')
        nullMimeFile.mimetype = null as any

        try {
          await controller.uploadFiles([nullMimeFile])
          fail('Should have thrown an error')
        } catch (error: any) {
          expect(error.data.validations).toContain('files[0] is not an image (type: unknown)')
        }
      })

      it('should throw error when multiple files have validation errors', async () => {
        const files = [
          createMockFile(11 * 1024 * 1024, 'image/jpeg', 'oversized.jpg'), // Exceeds 10MB
          createMockFile(1024, 'application/pdf', 'document.pdf'), // Not an image
          createMockFile(5 * 1024 * 1024, 'image/jpeg', 'valid.jpg'), // Valid
        ]

        try {
          await controller.uploadFiles(files)
          fail('Should have thrown an error')
        } catch (error: any) {
          expect(error.data.validations).toHaveLength(2)
          expect(error.data.validations.some((v: string) => v.includes('exceeds 10MB'))).toBe(true)
          expect(error.data.validations.some((v: string) => v.includes('is not an image'))).toBe(
            true,
          )
        }
      })

      it('should handle file with null size (treats as 0, which is valid)', async () => {
        const fileWithNullSize = createMockFile(0, 'image/jpeg', 'test.jpg')
        fileWithNullSize.size = null as any
        const mockFileId = '123e4567-e89b-12d3-a456-426614174012'

        jest.spyOn(service, 'create').mockResolvedValue({ fileId: mockFileId })

        // Should not throw error since (null || 0) = 0, which is < 10MB
        const result = await controller.uploadFiles([fileWithNullSize])

        expect(result.files).toHaveLength(1)
        expect(result.files[0].fileId).toBe(mockFileId)
      })

      it('should throw error when file size is 0 but still validate type', async () => {
        const emptyFile = createMockFile(0, 'application/pdf', 'empty.pdf')

        try {
          await controller.uploadFiles([emptyFile])
          fail('Should have thrown an error')
        } catch (error: any) {
          expect(error.data.validations.some((v: string) => v.includes('is not an image'))).toBe(
            true,
          )
        }
      })
    })

    describe('Service Error Cases', () => {
      it('should propagate service errors', async () => {
        const mockFile = createMockFile(1 * 1024 * 1024, 'image/jpeg', 'test.jpg')
        const serviceError = new Error('Service error')

        jest.spyOn(service, 'create').mockRejectedValue(serviceError)

        await expect(controller.uploadFiles([mockFile])).rejects.toThrow('Service error')
      })

      it('should handle service returning null fileId', async () => {
        const mockFile = createMockFile(1 * 1024 * 1024, 'image/jpeg', 'test.jpg')

        jest.spyOn(service, 'create').mockResolvedValue({ fileId: null as any })

        const result = await controller.uploadFiles([mockFile])

        expect(result.files[0].fileId).toBeNull()
      })
    })
  })

  describe('findByFileId', () => {
    describe('Success Cases', () => {
      it('should find image by valid fileId and set response headers', async () => {
        const fileId = '123e4567-e89b-12d3-a456-426614174000'
        const mockImage = {
          fileId,
          file: Buffer.from('fake-image-data'),
          mimeType: 'image/jpeg',
        }

        jest.spyOn(service, 'findByFileId').mockResolvedValue(mockImage as any)

        await controller.findByFileId(mockResponse as Response, fileId)

        expect(service.findByFileId).toHaveBeenCalledWith(fileId)
        expect(mockResponse.set).toHaveBeenCalledWith({
          'Content-Type': 'image/jpeg',
        })
        expect(mockResponse.send).toHaveBeenCalledWith(mockImage.file)
      })

      it('should handle different image mime types', async () => {
        const fileId = '123e4567-e89b-12d3-a456-426614174001'
        const mockImage = {
          fileId,
          file: Buffer.from('fake-png-data'),
          mimeType: 'image/png',
        }

        jest.spyOn(service, 'findByFileId').mockResolvedValue(mockImage as any)

        await controller.findByFileId(mockResponse as Response, fileId)

        expect(mockResponse.set).toHaveBeenCalledWith({
          'Content-Type': 'image/png',
        })
      })
    })

    describe('Error Cases', () => {
      it('should propagate NotFoundException when image not found', async () => {
        const fileId = '123e4567-e89b-12d3-a456-426614174000'
        const notFoundError = new NotFoundException('Image not found')

        jest.spyOn(service, 'findByFileId').mockRejectedValue(notFoundError)

        await expect(controller.findByFileId(mockResponse as Response, fileId)).rejects.toThrow(
          NotFoundException,
        )
      })

      it('should propagate service errors', async () => {
        const fileId = '123e4567-e89b-12d3-a456-426614174000'
        const serviceError = new Error('Database error')

        jest.spyOn(service, 'findByFileId').mockRejectedValue(serviceError)

        await expect(controller.findByFileId(mockResponse as Response, fileId)).rejects.toThrow(
          'Database error',
        )
      })
    })

    describe('UUID Validation', () => {
      it('should validate UUID format via ParseUUIDPipe', async () => {
        // ParseUUIDPipe will throw BadRequestException for invalid UUIDs
        // This is handled by NestJS validation pipes, not in our controller logic
        // But we can test that valid UUIDs work
        const validUUID = '123e4567-e89b-12d3-a456-426614174000'
        const mockImage = {
          fileId: validUUID,
          file: Buffer.from('data'),
          mimeType: 'image/jpeg',
        }

        jest.spyOn(service, 'findByFileId').mockResolvedValue(mockImage as any)

        await controller.findByFileId(mockResponse as Response, validUUID)

        expect(service.findByFileId).toHaveBeenCalledWith(validUUID)
      })
    })
  })
})
