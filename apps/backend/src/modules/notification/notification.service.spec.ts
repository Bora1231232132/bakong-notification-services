import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { BakongUser } from 'src/entities/bakong-user.entity'
import { Notification } from 'src/entities/notification.entity'
import { NotificationService } from './notification.service'

describe('NotificationService', () => {
  let service: NotificationService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationService],
    })
      .useMocker((token) => {
        if (token === getRepositoryToken(BakongUser)) {
          return jest.fn().mockReturnValue(null)
        }

        if (token === getRepositoryToken(Notification)) {
          return jest.fn().mockReturnValue(null)
        }
      })
      .compile()

    service = module.get<NotificationService>(NotificationService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
