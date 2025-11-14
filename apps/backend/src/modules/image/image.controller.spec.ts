import { Test, TestingModule } from '@nestjs/testing'
import { ImageController } from './image.controller'
import { ImageService } from './image.service'
import { Response } from 'express'

describe('ImageController', () => {
  let controller: ImageController
  let service: ImageService

  const mockRequest: any = {
    send: jest.fn(),
    set: jest.fn(),
  }

  const mockResponse: Partial<Response> = {
    status: jest.fn().mockImplementation().mockReturnValue(200),
    json: jest.fn().mockImplementation().mockReturnValue({}),
  }

  beforeEach(async () => {
    const ApiServiceProvider = {
      provide: ImageService,
      useFactory: () => ({
        findByFileId: jest.fn(() => mockResponse),
        uploadFile: jest.fn(() => null),
      }),
    }
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImageController],
      providers: [ImageService, ApiServiceProvider],
    }).compile()

    controller = module.get<ImageController>(ImageController)
    service = module.get<ImageService>(ImageService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('should find by fileId', async () => {
    const fileId = '1'
    await controller.findByFileId(mockRequest, fileId)

    expect(service.findByFileId).toHaveBeenCalled()
    expect(service.findByFileId).toHaveBeenCalledWith(fileId)
  })
})
