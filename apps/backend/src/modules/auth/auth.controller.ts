import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Query,
  Param,
  Put,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common'
import { AnyFilesInterceptor } from '@nestjs/platform-express'
import { UserRole } from '@bakong/shared'
import { Public } from 'src/common/middleware/jwt-auth.guard'
import { Roles } from 'src/common/middleware/roles.guard'
import { LocalAuthGuard } from '../../common/middleware/local-auth.guard'
import { CreateUserDto } from '../user/dto/create-user.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req) {
    return this.authService.login(req.user, req)
  }

  @Roles(UserRole.ADMIN_USER)
  @Get('jwt')
  async decodeJwt(@Req() req) {
    return req.user
  }

  @Public()
  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto)
  }

  @Roles(UserRole.ADMIN_USER)
  @Get('users')
  async getAllUsers(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    return this.authService.getAllUsers(page, pageSize, search, role)
  }

  @Roles(UserRole.ADMIN_USER)
  @Get('users/:id')
  async getUserById(@Param('id') id: number) {
    return this.authService.getUserById(id)
  }

  @Put('change-password')
  async changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    // JWT strategy returns { id: payload.sub, ... }, so use req.user.id
    return this.authService.changePassword(req.user.id, dto)
  }

  @Post('upload-avatar')
  @UseInterceptors(AnyFilesInterceptor())
  async uploadAvatar(@Req() req, @UploadedFiles() files: Express.Multer.File[]) {
    const userId = req.user.id

    if (!files || files.length === 0) {
      return {
        responseCode: 1,
        responseMessage: 'No file provided',
        errorCode: 1,
        data: null,
      }
    }

    const file = files[0] // Use first file only

    // Validate file type and size
    const maxBytes = 10 * 1024 * 1024 // 10MB
    if (!file.mimetype?.startsWith('image/')) {
      return {
        responseCode: 1,
        responseMessage: 'File must be an image',
        errorCode: 1,
        data: null,
      }
    }
    if ((file.size || 0) > maxBytes) {
      return {
        responseCode: 1,
        responseMessage: 'File exceeds 10MB',
        errorCode: 1,
        data: null,
      }
    }

    // Upload image and update avatar in one call
    const result = await this.authService.uploadAndUpdateAvatar(
      userId,
      {
        file: file.buffer,
        mimeType: file.mimetype ? file.mimetype.substring(0, 100) : 'image/jpeg',
        originalFileName: file.originalname ? file.originalname.substring(0, 100) : null,
      },
      req,
    )

    const image = result.imageId ? `/api/v1/image/${result.imageId}` : null

    return {
      responseCode: 0,
      responseMessage: 'Avatar uploaded and updated successfully',
      errorCode: 0,
      data: {
        image: image,
      },
    }
  }
}
