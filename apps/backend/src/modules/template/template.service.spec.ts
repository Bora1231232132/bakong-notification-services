import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Template } from 'src/entities/template.entity'
import { TemplateTranslation } from 'src/entities/template-translation.entity'
import { BadRequestException } from '@nestjs/common'
import { BaseResponseDto } from 'src/common/base-response.dto'
import { ErrorCode, ResponseMessage } from '@bakong/shared'
import { plainToClass } from 'class-transformer'
import { CreateTemplateDto } from './dto/create-template.dto'
import { UpdateTemplateDto } from './dto/update-template.dto'
import { TemplateService } from './template.service'
import { Platform } from '@bakong/shared'
import { TemplateTranslationDto } from './dto/template-translation.dto'

describe('TemplateService', () => {
  let service: TemplateService

  const templateId = 1
  const translations = [
    new TemplateTranslation(),
    new TemplateTranslation(),
    new TemplateTranslation(),
  ]
  const templates: Template[] = [
    {
      ...new Template(),
      id: templateId,
      platforms: [Platform.IOS, Platform.ANDROID],
      isSent: false,
      translations: translations,
    },
    {
      ...new Template(),
      id: templateId + 1,
      platforms: [Platform.IOS],
      isSent: false,
      translations: translations,
    },
  ]
  const oneTemplate: Template = plainToClass(Template, {
    id: templateId,
    platforms: [Platform.ANDROID],
    isSent: false,
    translations: translations,
  })

  const isSentTemplate: Template = plainToClass(Template, {
    id: templateId,
    platforms: [Platform.ANDROID],
    isSent: true,
    translations: translations,
  })

  const templateRepo = {
    find: jest.fn().mockReturnValue(templates),
    findOneBy: jest.fn().mockResolvedValue(oneTemplate),
    findAndCount: jest.fn().mockResolvedValue([templates, 2]),
    create: jest.fn().mockResolvedValue(oneTemplate),
    save: jest.fn().mockResolvedValue(oneTemplate),
    update: jest.fn().mockResolvedValue(oneTemplate),
    delete: jest.fn().mockResolvedValue({}),
  }

  const translationReop = {
    findOneBy: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue(null),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplateService],
    })
      .useMocker((token) => {
        if (token === getRepositoryToken(Template)) {
          return templateRepo
        }

        if (token === getRepositoryToken(TemplateTranslation)) {
          return translationReop
        }
      })
      .compile()

    service = module.get<TemplateService>(TemplateService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should return all records', async () => {
    const findSpy = jest.spyOn(templateRepo, 'find')
    const results = await service.all()

    expect(results).toEqual(templates)
    expect(findSpy).toHaveBeenCalledTimes(1)
  })

  describe('function findOne', () => {
    it('should success if requests found', async () => {
      const findOneSpy = jest.spyOn(templateRepo, 'findOneBy')
      const results = await service.findOne(oneTemplate.id)

      expect(results).toEqual(oneTemplate)
      expect(findOneSpy).toHaveBeenCalledTimes(1)
      expect(findOneSpy).toHaveBeenCalledWith({ id: oneTemplate.id })
    })

    it('should raise an error if template not found', async () => {
      templateRepo.findOneBy.mockResolvedValueOnce(null)

      expect(service.findOne(templateId)).rejects.toThrow(
        new BadRequestException(
          new BaseResponseDto({
            responseCode: 1,
            errorCode: ErrorCode.RECORD_NOT_FOUND,
            responseMessage: ResponseMessage.RECORD_NOT_FOUND + templateId,
          }),
        ),
      )
    })
  })

  describe('function findTemplates', () => {
    it('should success if requests found', async () => {
      const results = await service.findTemplates()

      expect(results.data).toEqual(templates)
      expect(results.meta).toEqual({
        hasNextPage: false,
        hasPreviousPage: false,
        itemCount: 2,
        page: 1,
        totalPages: 1,
        size: 12,
      })
    })

    it('should return page: 2, size: 1, nextPage: false', async () => {
      templateRepo.findAndCount.mockResolvedValueOnce([oneTemplate, 2])
      const results = await service.findTemplates(2, 1, true)

      expect(results.data).toEqual(oneTemplate)
      expect(results.meta).toEqual({
        hasNextPage: false,
        hasPreviousPage: true,
        itemCount: 2,
        page: 2,
        totalPages: 2,
        size: 1,
      })
    })
  })

  describe('function createTemplate', () => {
    const createTemplateDto: CreateTemplateDto = {
      platforms: [Platform.ANDROID],
      translations: translations.map((translation) =>
        plainToClass(TemplateTranslationDto, translation),
      ),
      imageId: null,
      sendType: null,
      isSent: false,
    }

    it('should success and return template', async () => {
      const result = await service.create(createTemplateDto)
      expect(result).toEqual(oneTemplate)
    })
  })

  describe('function updateTemplate', () => {
    const updateTemplateDto: UpdateTemplateDto = {
      platforms: [Platform.ANDROID],
      translations: translations.map((translation) =>
        plainToClass(TemplateTranslationDto, translation),
      ),
    }

    it('should success and return template', async () => {
      const result = await service.update(templateId, updateTemplateDto)
      expect(result).toEqual(oneTemplate)
    })

    it('should throw error if template not found', async () => {
      templateRepo.findOneBy.mockResolvedValueOnce(null)

      expect(service.update(templateId, updateTemplateDto)).rejects.toThrow(
        new BadRequestException(
          new BaseResponseDto({
            responseCode: 1,
            errorCode: ErrorCode.RECORD_NOT_FOUND,
            responseMessage: ResponseMessage.RECORD_NOT_FOUND + templateId,
          }),
        ),
      )
    })

    it('should throw error if template is already sent', async () => {
      templateRepo.findOneBy.mockResolvedValueOnce(isSentTemplate)

      expect(service.update(templateId, updateTemplateDto)).rejects.toThrow(
        new BadRequestException(
          new BaseResponseDto({
            responseCode: 1,
            errorCode: ErrorCode.SENT_TEMPLATE,
            responseMessage: ResponseMessage.SENT_TEMPLATE,
          }),
        ),
      )
    })
  })

  describe('function deleteTemplate', () => {
    it('should success and return template', async () => {
      const result = await service.remove(templateId)
      expect(result).toEqual({})
    })

    it('should throw error if template not found', async () => {
      templateRepo.findOneBy.mockResolvedValueOnce(null)

      expect(service.remove(templateId)).rejects.toThrow(
        new BadRequestException(
          new BaseResponseDto({
            responseCode: 1,
            errorCode: ErrorCode.RECORD_NOT_FOUND,
            responseMessage: ResponseMessage.RECORD_NOT_FOUND + templateId,
          }),
        ),
      )
    })

    it('should throw error if template is already sent', async () => {
      templateRepo.findOneBy.mockResolvedValueOnce(isSentTemplate)

      expect(service.remove(templateId)).rejects.toThrow(
        new BadRequestException(
          new BaseResponseDto({
            responseCode: 1,
            errorCode: ErrorCode.SENT_TEMPLATE,
            responseMessage: ResponseMessage.SENT_TEMPLATE,
          }),
        ),
      )
    })
  })
})
