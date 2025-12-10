import { ErrorCode, ResponseMessage, UserRole, ValidationUtils } from '@bakong/shared'
import { Injectable, OnModuleInit } from '@nestjs/common'
import { UserService } from '../user/user.service'
import { ImageService } from '../image/image.service'
import * as bcrypt from 'bcrypt'
import { JwtService } from '@nestjs/jwt'
import { User } from 'src/entities/user.entity'
import k from 'src/constant'
import { CreateUserDto } from '../user/dto/create-user.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import moment from 'moment'
import { BaseResponseDto } from 'src/common/base-response.dto'

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly imageService: ImageService,
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

  async login(user: User, req?: any) {
    try {
      // Reset failed login attempts on successful login
      await this.userService.resetFailLoginAttempt(user.id)

      // Fetch user with imageId
      let userWithImage = null
      try {
        userWithImage = await this.userService.findById(user.id)
      } catch (error: any) {
        console.warn('Failed to fetch user with imageId, using basic user data:', error.message)
        // Continue with basic user data if fetch fails
        userWithImage = {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          imageId: null,
        }
      }

      const expireAt = moment().add(24, 'hours').valueOf()
      const payload = {
        username: user.username,
        role: user.role,
        sub: user.id,
        exp: Math.floor(expireAt / 1000),
      }

      // Build image path from imageId
      const image = userWithImage?.imageId ? `/api/v1/image/${userWithImage.imageId}` : null

      return new BaseResponseDto({
        responseCode: 0,
        responseMessage: 'Login successful',
        errorCode: 0,
        data: {
          accessToken: this.jwtService.sign(payload),
          expireAt: expireAt,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            displayName: user.displayName,
            image: image,
          },
        },
      })
    } catch (error: any) {
      console.error('Login error:', error)
      // If it's already a BaseResponseDto, rethrow it
      if (error instanceof BaseResponseDto) {
        throw error
      }
      // Otherwise wrap it
      throw new BaseResponseDto({
        responseCode: 1,
        responseMessage: error.message || 'Login failed',
        errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
      })
    }
  }

  async validateUserLogin(username: string, password: string) {
    // Validate username format before database lookup
    if (!ValidationUtils.isValidUsername(username)) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.VALIDATION_FAILED,
        responseMessage: 'Username must be lowercase with no spaces.',
      })
    }

    // Use findByUsernameWithPassword to ensure we get fresh password data from database
    const user = await this.userService.findByUsernameWithPassword(username)
    if (!user) {
      // User not found - throw specific error
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.USER_NOT_FOUND,
        responseMessage: ResponseMessage.USER_NOT_FOUND,
      })
    }

    // Check if account is locked (6 failed attempts)
    if (user.failLoginAttempt >= 6) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.ACCOUNT_TIMEOUT,
        responseMessage: `Account locked due to ${user.failLoginAttempt} failed login attempts. Please contact administrator to unlock your account.`,
      })
    }

    // Verify password
    if (await bcrypt.compare(password, user.password)) {
      // Password correct - reset failLoginAttempt and return user
      if (user.failLoginAttempt > 0) {
        await this.userService.resetFailLoginAttempt(user.id)
      }
      return user
    }

    // Password incorrect - increment failLoginAttempt
    await this.userService.increementFailLoginAttempt(user.id)

    // Get updated user to check current attempt count
    const updatedUser = await this.userService.findByUsername(username)
    const remainingAttempts = 6 - (updatedUser?.failLoginAttempt || 0)

    if (remainingAttempts <= 0) {
      // Account is now locked
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.ACCOUNT_TIMEOUT,
        responseMessage: `Account locked due to ${updatedUser.failLoginAttempt} failed login attempts. Please contact administrator to unlock your account.`,
      })
    }

    // Throw error with remaining attempts info
    throw new BaseResponseDto({
      responseCode: 1,
      errorCode: ErrorCode.INVALID_USERNAME_OR_PASSWORD,
      responseMessage: `Invalid password. ${remainingAttempts} attempt${
        remainingAttempts > 1 ? 's' : ''
      } remaining before account lockout.`,
    })
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

  /**
   * Changes user password with comprehensive security validation
   *
   * Security Steps:
   * 1. Verify user exists
   * 2. Validate current password against database hash
   * 3. Ensure new password is different from current
   * 4. Validate new password strength (handled by DTO decorators)
   * 5. Hash new password with bcrypt (cost factor 10)
   * 6. Update database within transaction
   * 7. Verify password was successfully updated
   * 8. Reset failed login attempts (proves user knows current password)
   *
   * @param userId - The ID of the user changing their password
   * @param dto - Contains currentPassword and newPassword
   * @returns Success response with message
   * @throws BaseResponseDto with appropriate error codes
   */
  async changePassword(userId: number, dto: ChangePasswordDto) {
    // Step 1: Fetch user with password field from database
    const user = await this.userService.findByIdWithPassword(userId)
    if (!user) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.USER_NOT_FOUND,
        responseMessage: 'User not found',
      })
    }

    // Step 2: Validate current password using bcrypt.compare
    // bcrypt.compare is timing-safe and prevents timing attacks
    const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.password)
    if (!isCurrentPasswordValid) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.VALIDATION_FAILED,
        responseMessage: 'Current password is incorrect',
      })
    }

    // Step 3: Ensure new password is different from current password
    // This prevents users from "changing" to the same password
    const isSamePassword = await bcrypt.compare(dto.newPassword, user.password)
    if (isSamePassword) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.VALIDATION_FAILED,
        responseMessage: 'New password must be different from current password',
      })
    }

    // Step 4 & 5: Update password in database (hashing happens in userService.updatePassword)
    // The updatePassword method uses a transaction to ensure atomicity
    const updatedUser = await this.userService.updatePassword(userId, dto.newPassword)

    if (!updatedUser) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.USER_NOT_FOUND,
        responseMessage: 'Failed to update password. User not found after update.',
      })
    }

    // Step 6: Verify the password was actually updated by comparing the new password hash
    // This ensures the database update was successful
    const verifyNewPassword = await bcrypt.compare(dto.newPassword, updatedUser.password)
    if (!verifyNewPassword) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.VALIDATION_FAILED,
        responseMessage: 'Password update failed. Please try again.',
      })
    }

    // Step 7: Reset failed login attempts after successful password change
    // This proves the user knows their current password, so we can reset the counter
    await this.userService.resetFailLoginAttempt(userId)

    return {
      responseCode: 0,
      responseMessage: 'Password changed successfully',
    }
  }

  async uploadAndUpdateAvatar(
    userId: number,
    imageData: { file: Buffer; mimeType: string; originalFileName?: string | null },
    req?: any,
  ) {
    // Step 1: Upload/create the image
    const imageResult = await this.imageService.create({
      file: imageData.file,
      mimeType: imageData.mimeType,
      originalFileName: imageData.originalFileName,
    })

    const imageId = imageResult.fileId

    // Step 2: Update user's avatar with the new imageId
    const updatedUser = await this.userService.updateImageId(userId, imageId)
    if (!updatedUser) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.USER_NOT_FOUND,
        responseMessage: 'User not found',
      })
    }

    return {
      imageId,
    }
  }
}
