import { Test, TestingModule } from '@nestjs/testing'
import { CreateTemplateDto } from './dto/create-template.dto'
import { UpdateTemplateDto } from './dto/update-template.dto'
import { TemplateController } from './template.controller'
import { TemplateService } from './template.service'

describe('TemplateController', () => {
  let controller: TemplateController
  let service: TemplateService

  beforeEach(async () => {
    const ApiServiceProvider = {
      provide: TemplateService,
      useFactory: () => ({
        create: jest.fn(() => []),
        all: jest.fn(() => []),
        findTemplates: jest.fn(() => []),
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        findOne: jest.fn(() => {}),
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        update: jest.fn(() => {}),
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        remove: jest.fn(() => {}),
      }),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplateController],
      providers: [TemplateService, ApiServiceProvider],
    }).compile()

    controller = module.get<TemplateController>(TemplateController)
    service = module.get<TemplateService>(TemplateService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('should call create method', () => {
    const dto = new CreateTemplateDto()
    expect(controller.create(dto, { user: { id: 1 } })).not.toEqual(null)
  })

  it('should call create service method', () => {
    const dto = new CreateTemplateDto()
    controller.create(dto, { user: { id: 1 } })

    expect(service.create).toHaveBeenCalled()
    expect(service.create).toHaveBeenCalledWith(dto, { user: { id: 1 } })
  })

  it('should call update service method', () => {
    const dto = new UpdateTemplateDto()
    const id = '1'
    controller.update(id, dto, { user: { id: 1 } })
    expect(service.update).toHaveBeenCalled()
    expect(service.update).toHaveBeenCalledWith(+id, dto, { user: { id: 1 } })
  })

  it('should call remove service method', () => {
    const id = '1'
    controller.remove(id)

    expect(service.remove).toHaveBeenCalled()
    expect(service.remove).toHaveBeenCalledWith(+id)
  })

  it('should call all service method', () => {
    controller.getAll()
    expect(service.all).toHaveBeenCalled()
  })

  it('should call findOne service method', () => {
    const id = '1'
    controller.findOne(id)

    expect(service.findOne).toHaveBeenCalled()
    expect(service.findOne).toHaveBeenCalledWith(+id)
  })

  it('should call findTemplates service method', () => {
    const params = { page: 1, size: 10, isAscending: true }
    controller.findTemplates(params)

    expect(service.findTemplates).toHaveBeenCalled()
    expect(service.findTemplates).toHaveBeenCalledWith(params.page, params.size, params.isAscending)
  })
})
