import { ErrorCode, ResponseMessage, UserRole, ValidationUtils, UserStatus } from '@bakong/shared'
import { Injectable, OnModuleInit } from '@nestjs/common'
import { UserService } from '../user/user.service'
import { ImageService } from '../image/image.service'
import { OtpService } from './otp.service'
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
    private readonly otpService: OtpService,
  ) {}

  async onModuleInit() {
    const admin = await this.userService.findByUsername(k.API_ADMIN_USERNAME)
    if (!admin) {
      const createdAdmin = await this.userService.create({
        username: k.API_ADMIN_USERNAME,
        email: `${k.API_ADMIN_USERNAME}@bakong.local`,
        password: k.API_ADMIN_PASSWORD,
        displayName: k.API_ADMIN_USERNAME,
        role: UserRole.ADMINISTRATOR,
        phoneNumber: '+855 00 000 000',
      })
      // Ensure admin is always ACTIVE (create already sets it, but double-check)
      if (createdAdmin.status !== UserStatus.ACTIVE) {
        await this.userService.update(createdAdmin.id, {
          status: UserStatus.ACTIVE,
        } as any)
      }
    } else {
      // Ensure existing admin is ACTIVE and has ADMINISTRATOR role
      if (admin.status !== UserStatus.ACTIVE || admin.role !== UserRole.ADMINISTRATOR) {
        await this.userService.update(admin.id, {
          status: UserStatus.ACTIVE,
          role: UserRole.ADMINISTRATOR,
        } as any)
      }
    }
  }

  async login(user: User, req?: any) {
    try {
      // Check if user has temporary password and has exceeded login attempts
      if (user.mustChangePassword) {
        const tempPasswordAttempts = user.syncStatus?.tempPasswordLoginAttempts ?? 0
        
        if (tempPasswordAttempts >= 3) {
          throw new BaseResponseDto({
            responseCode: 1,
            errorCode: ErrorCode.ACCOUNT_TIMEOUT,
            responseMessage: 'You have exceeded the maximum number of login attempts with the temporary password. Your account has been locked. Please contact an administrator to reset your password.',
          })
        }
        
        // Increment temporary password login attempts
        await this.userService.updateSyncStatus(user.id, {
          tempPasswordLoginAttempts: tempPasswordAttempts + 1,
        })
      }
      
      // Reset failed login attempts on successful login
      await this.userService.resetFailLoginAttempt(user.id)
      // Update login_at timestamp
      await this.userService.updateSyncStatus(user.id, { login_at: new Date().toISOString() })

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
          phoneNumber: user.phoneNumber,
          imageId: null,
        }
      }

      const expireAt = moment().add(24, 'hours').valueOf()
      const payload = {
        username: user.username,
        role: user.role,
        sub: user.id,
        exp: Math.floor(expireAt / 1000),
        mustChangePassword: user.mustChangePassword || false,
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
          mustChangePassword: user.mustChangePassword || false,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            displayName: user.displayName,
            image: image, // Use the computed image path instead of hardcoded null
            mustChangePassword: user.mustChangePassword || false,
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

  async validateUserLogin(email: string, password: string) {
    // Normalize email so login is more flexible:
    // - trim spaces
    // - make lookup case-insensitive
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.VALIDATION_FAILED,
        responseMessage: 'Email is required.',
      })
    }

    // Validate email format
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i
    if (!emailRegex.test(normalizedEmail)) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.VALIDATION_FAILED,
        responseMessage: 'Please enter a valid email address.',
      })
    }

    // Use findByEmailWithPassword to ensure we get fresh password data from database
    const user = await this.userService.findByEmailWithPassword(normalizedEmail)
    if (!user) {
      // User not found - throw generic error to prevent email enumeration
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.INVALID_USERNAME_OR_PASSWORD,
        responseMessage: 'Invalid email or password. Please check your credentials and try again.',
      })
    }

    // Check if account is deactivated
    if (user.status !== UserStatus.ACTIVE) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.NO_PERMISSION,
        responseMessage:
          'Your account has been deactivated. Please contact administrator to reactivate your account.',
      })
    }

    // Check if account is locked (6 failed attempts)
    const failLoginAttempt = user.syncStatus?.failLoginAttempt ?? 0
    if (failLoginAttempt >= 6) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.ACCOUNT_TIMEOUT,
        responseMessage: `Account locked due to ${failLoginAttempt} failed login attempts. Please contact administrator to unlock your account.`,
      })
    }

    // Verify password
    if (await bcrypt.compare(password, user.password)) {
      // Password correct - reset failLoginAttempt and return user
      const currentFailAttempts = user.syncStatus?.failLoginAttempt ?? 0
      if (currentFailAttempts > 0) {
        await this.userService.resetFailLoginAttempt(user.id)
      }
      return user
    }

    // Password incorrect - increment failLoginAttempt
    await this.userService.increementFailLoginAttempt(user.id)

    // Get updated user to check current attempt count
    const updatedUser = await this.userService.findByEmail(normalizedEmail)
    const updatedFailAttempts = updatedUser?.syncStatus?.failLoginAttempt ?? 0
    const remainingAttempts = 6 - updatedFailAttempts

    if (remainingAttempts <= 0) {
      // Account is now locked
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.ACCOUNT_TIMEOUT,
        responseMessage: `Account locked due to ${updatedFailAttempts} failed login attempts. Please contact administrator to unlock your account.`,
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

    // Step 8: Increment changePassword_count
    const currentUser = await this.userService.findById(userId)
    const currentCount = currentUser?.syncStatus?.changePassword_count ?? 0
    await this.userService.updateSyncStatus(userId, {
      changePassword_count: currentCount + 1,
    })

    return BaseResponseDto.success({
      message: 'Password changed successfully',
    })
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

  /**
   * Verify account using token from email link
   * Activates the account when verification link is clicked
   */
  async verifyAccount(token: string) {
    const result = await this.otpService.verifyToken(token)

    if (!result.valid) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.VALIDATION_FAILED,
        responseMessage:
          result.reason === 'EXPIRED'
            ? 'Verification link has expired. Please contact administrator for a new link.'
            : 'Invalid or expired verification link.',
      })
    }

    // Verify user exists
    const user = await this.userService.findById(result.userId!)
    if (!user) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.USER_NOT_FOUND,
        responseMessage: 'User not found',
      })
    }

    // Activate account (status changes from DEACTIVATED to ACTIVE)
    await this.userService.update(result.userId!, { status: UserStatus.ACTIVE } as any)

    return new BaseResponseDto({
      responseCode: 0,
      responseMessage: 'Account verified successfully. You can now set your password.',
      data: {
        verified: true,
        userId: result.userId,
        message: 'Please set your password to complete account setup.',
      },
    })
  }

  /**
   * Setup password for verified users
   * Can be used after account verification or by active users
   */
  async setupPassword(userId: number, newPassword: string) {
    // Verify user exists
    const user = await this.userService.findById(userId)
    if (!user) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.USER_NOT_FOUND,
        responseMessage: 'User not found',
      })
    }

    // Check if user is verified (ACTIVE status)
    if (user.status !== UserStatus.ACTIVE) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.VALIDATION_FAILED,
        responseMessage: 'Please verify your account first before setting a password.',
      })
    }

    // Update password
    await this.userService.updatePassword(userId, newPassword)

    return new BaseResponseDto({
      responseCode: 0,
      responseMessage: 'Password set successfully.',
      data: { passwordSet: true },
    })
  }

  /**
   * Setup initial password for users with default password
   * This is called when user logs in with default password and must change it
   * No current password required - only userId and newPassword
   */
  async setupInitialPassword(userId: number, newPassword: string) {
    // Verify user exists
    const user = await this.userService.findById(userId)
    if (!user) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.USER_NOT_FOUND,
        responseMessage: 'User not found',
      })
    }

    // Check if user must change password
    if (!user.mustChangePassword) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.VALIDATION_FAILED,
        responseMessage: 'Password has already been changed. Use change-password endpoint instead.',
      })
    }

    // Update password and set mustChangePassword to false
    await this.userService.updatePassword(userId, newPassword)
    await this.userService.updateMustChangePassword(userId, false)
    
    // Reset temporary password login attempts counter
    await this.userService.updateSyncStatus(userId, {
      tempPasswordLoginAttempts: 0,
    })

    // Fetch updated user to generate new token
    const updatedUser = await this.userService.findById(userId)
    const expireAt = moment().add(24, 'hours').valueOf()
    const payload = {
      username: updatedUser.username,
      role: updatedUser.role,
      sub: updatedUser.id,
      exp: Math.floor(expireAt / 1000),
      mustChangePassword: false,
    }
    const accessToken = this.jwtService.sign(payload)

    return new BaseResponseDto({
      responseCode: 0,
      responseMessage: 'Password changed successfully. You can now access the system.',
      data: {
        passwordChanged: true,
        accessToken,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          role: updatedUser.role,
          displayName: updatedUser.displayName,
          mustChangePassword: false,
          image: null,
        },
      },
    })
  }
}
