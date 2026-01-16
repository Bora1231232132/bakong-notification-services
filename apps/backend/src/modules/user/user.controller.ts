import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import { ErrorCode, ResponseMessage, UserRole, PaginationUtils } from '@bakong/shared'
import { Roles } from 'src/common/middleware/roles.guard'
import { BaseResponseDto } from 'src/common/base-response.dto'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { GetUserResponseDto } from './dto/get-user-response.dto'
import { GetUsersQueryDto } from './dto/get-users-query.dto'
import { GetUsersResponseDto } from './dto/get-users-response.dto'
import { UserService } from './user.service'

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(UserRole.ADMINISTRATOR)
  @Post()
  async create(@Body() dto: CreateUserDto) {
    // Create user with password provided by administrator
    // User is created as ACTIVE with mustChangePassword = true
    const user = await this.userService.create(dto)

    // Return success without exposing password
    return BaseResponseDto.success({
      data: {
        id: user.id,
        email: user.email || user.username,
        username: user.username,
        role: user.role,
        status: user.status,
      },
      message: 'User created successfully. User must change password on first login.',
    })
  }

  @Roles(UserRole.ADMINISTRATOR, UserRole.EDITOR)
  @Get()
  async findAll(@Query() query: GetUsersQueryDto): Promise<BaseResponseDto<GetUsersResponseDto>> {
    const { page = 1, size = 10 } = query

    const { users, totalCount } = await this.userService.findAllPaginated(query)

    const paginationMeta = PaginationUtils.calculatePaginationMeta(
      page,
      size,
      totalCount,
      users.length,
    )

    const response: GetUsersResponseDto = {
      users,
      pagination: paginationMeta,
    }

    return BaseResponseDto.success({
      data: response,
      message: 'Users retrieved successfully',
    })
  }

  @Roles(UserRole.ADMINISTRATOR, UserRole.EDITOR)
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BaseResponseDto<GetUserResponseDto>> {
    const user = await this.userService.findById(id)

    if (!user) {
      return BaseResponseDto.error({
        errorCode: ErrorCode.USER_NOT_FOUND,
        message: ResponseMessage.USER_NOT_FOUND,
      })
    }

    // Map User entity to GetUserResponseDto
    const userResponse: GetUserResponseDto = {
      id: user.id,
      role: user.role,
      name: user.username,
      email: user.email || user.username,
      phoneNumber: user.phoneNumber,
      status: user.status,
      imageId: user.imageId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }

    return BaseResponseDto.success({
      data: userResponse,
      message: 'User retrieved successfully',
    })
  }

  @Roles(UserRole.ADMINISTRATOR, UserRole.EDITOR)
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ): Promise<BaseResponseDto<GetUserResponseDto>> {
    try {
      const user = await this.userService.update(id, dto)

      // Map User entity to GetUserResponseDto
      const userResponse: GetUserResponseDto = {
        id: user.id,
        role: user.role,
        name: user.displayName,
        email: user.email || user.username,
        phoneNumber: user.phoneNumber,
        status: user.status,
        imageId: user.imageId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }

      return BaseResponseDto.success({
        data: userResponse,
        message: 'User updated successfully',
      })
    } catch (error: any) {
      // If it's already a BaseResponseDto, return it
      if (error instanceof BaseResponseDto) {
        return error as BaseResponseDto<GetUserResponseDto>
      }

      // Otherwise, return generic error
      return BaseResponseDto.error({
        errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to update user',
      })
    }
  }

  @Roles(UserRole.ADMINISTRATOR, UserRole.EDITOR)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<BaseResponseDto<void>> {
    try {
      await this.userService.remove(id)
      return BaseResponseDto.success({
        message: 'User deleted successfully',
      })
    } catch (error: any) {
      if (error instanceof BaseResponseDto) {
        return error as BaseResponseDto<void>
      }
      return BaseResponseDto.error({
        errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to delete user',
      })
    }
  }
}
