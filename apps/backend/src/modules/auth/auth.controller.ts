import { Body, Controller, Get, Post, Req, UseGuards, Query, Param } from '@nestjs/common'
import { UserRole } from '@bakong/shared'
import { Public } from 'src/common/middleware/jwt-auth.guard'
import { Roles } from 'src/common/middleware/roles.guard'
import { LocalAuthGuard } from '../../common/middleware/local-auth.guard'
import { CreateUserDto } from '../user/dto/create-user.dto'
import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req) {
    return this.authService.login(req.user)
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
}
