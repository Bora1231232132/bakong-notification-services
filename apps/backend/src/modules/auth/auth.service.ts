import { ResponseMessage } from '@bakong/shared'
import { Injectable, OnModuleInit } from '@nestjs/common'
import { UserService } from '../user/user.service'
import * as bcrypt from 'bcrypt'
import { JwtService } from '@nestjs/jwt'
import { User } from 'src/entities/user.entity'
import k from 'src/constant'
import { UserRole } from '@bakong/shared'
import { CreateUserDto } from '../user/dto/create-user.dto'
import moment from 'moment'
import { BaseResponseDto } from 'src/common/base-response.dto'
import { ErrorCode } from '@bakong/shared'

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    const admin = await this.userService.findByUsername(k.API_ADMIN_USERNAME)
    if (!admin) {
      await this.userService.create({
        username: k.API_ADMIN_USERNAME,
        password: k.API_ADMIN_PASSWORD,
        displayName: k.API_ADMIN_USERNAME,
        role: UserRole.ADMIN_USER,
      })
    }
  }

  async login(user: User) {
    const expireAt = moment().add(24, 'hours').valueOf()
    const payload = {
      username: user.username,
      role: user.role,
      sub: user.id,
      exp: Math.floor(expireAt / 1000),
    }
    return {
      accessToken: this.jwtService.sign(payload),
      expireAt: expireAt,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        displayName: user.displayName,
      },
    }
  }

  async validateUserLogin(username: string, password: string) {
    const user = await this.userService.findByUsername(username)
    if (user.failLoginAttempt >= 3) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.ACCOUNT_TIMEOUT,
        responseMessage: ResponseMessage.ACCOUNT_TIMEOUT,
      })
    }
    if (user) {
      if (await bcrypt.compare(password, user.password)) {
        return user
      }
      await this.userService.increementFailLoginAttempt(user.id)
    }
    return null
  }

  async register(dto: CreateUserDto) {
    const user = await this.userService.create(dto)
    return this.login(user)
  }

  async getAllUsers(page = 1, pageSize = 10, search?: string, role?: string) {
    try {
      const users = await this.userService.findAll()

      let filteredUsers = users
      if (search) {
        const searchLower = search.toLowerCase()
        filteredUsers = filteredUsers.filter(
          (user) =>
            user.username.toLowerCase().includes(searchLower) ||
            user.displayName.toLowerCase().includes(searchLower) ||
            user.role.toLowerCase().includes(searchLower),
        )
      }

      if (role) {
        filteredUsers = filteredUsers.filter((user) => user.role === role)
      }

      filteredUsers.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA
      })

      const startIndex = (page - 1) * pageSize
      const endIndex = startIndex + pageSize
      const paginatedData = filteredUsers.slice(startIndex, endIndex)

      return {
        data: paginatedData,
        total: filteredUsers.length,
        page,
        pageSize,
        totalPages: Math.ceil(filteredUsers.length / pageSize),
      }
    } catch (error) {
      throw error
    }
  }

  async getUserById(id: number) {
    try {
      const user = await this.userService.findById(id)

      if (!user) {
        return { message: 'User not found' }
      }

      return { data: user }
    } catch (error) {
      throw error
    }
  }
}
