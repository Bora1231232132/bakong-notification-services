import { BadRequestException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { plainToClass } from 'class-transformer'
import { BaseResponseDto } from '../../common/base-response.dto'
import { ErrorCode, ResponseMessage } from '@bakong/shared'
import { Image } from 'src/entities/image.entity'
import { UploadImageDto } from './dto/upload-image.dto'
import { ImageService } from './image.service'

describe('ImageService', () => {
  let service: ImageService

  const fileId = 'bb0543d6-acfe-49f7-bc90-8386385c8f7f'
  const image: Image = plainToClass(Image, {
    id: 1,
    fileId: fileId,
  })

  const imageRepo = {
    findOneBy: jest.fn().mockResolvedValue(image),
    create: jest.fn().mockResolvedValue(image),
    save: jest.fn().mockResolvedValue(image),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageService],
    })
      .useMocker((token) => {
        if (token === getRepositoryToken(Image)) {
          return imageRepo
        }
      })
      .compile()

    service = module.get<ImageService>(ImageService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('function findByFileId', () => {
    it('should success if requests found', async () => {
      const findOneSpy = jest.spyOn(imageRepo, 'findOneBy')
      const results = await service.findByFileId(fileId)

      expect(results).toEqual(image)
      expect(findOneSpy).toHaveBeenCalledTimes(1)
      expect(findOneSpy).toHaveBeenCalledWith({ fileId: image.fileId })
    })

    it('should raise an error if image not found', async () => {
      imageRepo.findOneBy.mockResolvedValueOnce(null)

      expect(service.findByFileId(fileId)).rejects.toThrow(
        new BadRequestException(
          new BaseResponseDto({
            responseCode: 1,
            errorCode: ErrorCode.FILE_NOT_FOUND,
            responseMessage: ResponseMessage.FILE_NOT_FOUND,
          }),
        ),
      )
    })
  })

  describe('function createImage', () => {
    const uploadImageDto: UploadImageDto = {
      mimeType: 'Image/jpeg',
      originalFileName: 'test.jpg',
      file: null,
    }

    it('should success and return template', async () => {
      const result = await service.create(uploadImageDto)
      expect(result).toEqual({ fileId: image.fileId })
    })
  })
})
