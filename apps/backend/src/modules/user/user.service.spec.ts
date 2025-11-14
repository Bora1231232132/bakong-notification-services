import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { plainToClass } from 'class-transformer'
import { UserRole } from '@bakong/shared'
import { User } from 'src/entities/user.entity'
import { CreateUserDto } from './dto/create-user.dto'
import { UserService } from './user.service'

describe('UserService', () => {
  let service: UserService

  const userId = 1
  const failLoginAttempt = 0
  const oneUser: User = plainToClass(User, {
    id: userId,
    username: 'admin',
    password: 'admin@123',
    failLoginAttempt: failLoginAttempt,
    role: UserRole.ADMIN_USER,
    displayName: 'Theany',
  })

  const userRepo = {
    findOne: jest.fn().mockResolvedValue(oneUser),
    create: jest.fn().mockResolvedValue(oneUser),
    save: jest.fn().mockResolvedValue(oneUser),
    update: jest.fn().mockResolvedValue(oneUser),
    increment: jest.fn().mockResolvedValue(failLoginAttempt + 1),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService],
    })
      .useMocker((token) => {
        if (token === getRepositoryToken(User)) {
          return userRepo
        }
      })
      .compile()

    service = module.get<UserService>(UserService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('function findByUsername', () => {
    it('should success if requests found', async () => {
      const findOneSpy = jest.spyOn(userRepo, 'findOne')
      const results = await service.findByUsername(oneUser.username)

      expect(results).toEqual(oneUser)
      expect(findOneSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('function createUser', () => {
    const createUserDto: CreateUserDto = {
      username: 'test',
      password: 'test@123',
      displayName: 'Test User',
      role: UserRole.NORMAL_USER,
    }

    it('should success and return User', async () => {
      const result = await service.create(createUserDto)
      expect(result).toEqual(oneUser)
    })
  })

  describe('function increementFailLoginAttempt', () => {
    it('should success and increase by 1', async () => {
      const result = await service.increementFailLoginAttempt(userId)

      expect(result).toEqual(1)
    })
  })

  describe('function resetFailLoginAttempt', () => {
    it('should success and set failLoginAttempt to 0', async () => {
      const result = await service.resetFailLoginAttempt(userId)

      expect(result['failLoginAttempt']).toEqual(0)
    })
  })
})
