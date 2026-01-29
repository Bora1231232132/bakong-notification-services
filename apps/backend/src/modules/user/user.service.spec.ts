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
  const oneUser: User = plainToClass(User, {
    id: userId,
    username: 'admin',
    password: 'admin@123',
    syncStatus: {
      failLoginAttempt: 0,
      login_at: null,
      changePassword_count: 0,
    },
    role: UserRole.ADMINISTRATOR,
    displayName: 'Theany',
  })

  const userRepo = {
    findOne: jest.fn().mockResolvedValue(oneUser),
    create: jest.fn().mockResolvedValue(oneUser),
    save: jest.fn().mockResolvedValue(oneUser),
    update: jest.fn().mockResolvedValue(oneUser),
    createQueryBuilder: jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    })),
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
      email: 'test@example.com',
      password: 'test@123',
      displayName: 'Test User',
      role: UserRole.EDITOR,
      phoneNumber: '+855 00 000 000',
    }

    it('should success and return User', async () => {
      const result = await service.create(createUserDto)
      expect(result).toEqual(oneUser)
    })
  })

  describe('function increementFailLoginAttempt', () => {
    it('should success and increase by 1', async () => {
      const result = await service.increementFailLoginAttempt(userId)

      expect(result.affected).toEqual(1)
    })
  })

  describe('function resetFailLoginAttempt', () => {
    it('should success and reset failLoginAttempt to 0', async () => {
      const result = await service.resetFailLoginAttempt(userId)

      expect(result.affected).toEqual(1)
    })
  })
})
