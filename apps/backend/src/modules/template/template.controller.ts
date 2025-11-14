import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common'
import { UserRole } from '@bakong/shared'
import { Roles } from 'src/common/middleware/roles.guard'
import { BaseResponseDto } from 'src/common/base-response.dto'
import { CreateTemplateDto } from './dto/create-template.dto'
import { UpdateTemplateDto } from './dto/update-template.dto'
import { TemplateService } from './template.service'

@Controller('template')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Roles(UserRole.ADMIN_USER)
  @Post('create')
  async create(@Body() dto: CreateTemplateDto, @Req() req: any) {
    console.log('🎯 [CONTROLLER] /template/create endpoint called')
    console.log('🎯 [CONTROLLER] Request data:', {
      notificationType: dto.notificationType,
      sendType: dto.sendType,
      isSent: dto.isSent,
      platforms: dto.platforms,
      hasTranslations: dto.translations?.length > 0,
    })

    try {
      const currentUser = req.user
      console.log('🎯 [CONTROLLER] Current user:', currentUser?.username || 'NO USER')

      console.log('🎯 [CONTROLLER] Calling templateService.create...')
      const template = await this.templateService.create(dto, currentUser)
      console.log(
        '🎯 [CONTROLLER] Template service returned, notificationType:',
        template.notificationType,
      )

      return new BaseResponseDto({
        responseCode: 0,
        responseMessage: `Create ${template.notificationType} successfully`,
        errorCode: 0,
        data: template,
      })
    } catch (error: any) {
      console.error('🎯 [CONTROLLER] ❌ ERROR in create endpoint:', {
        message: error?.message,
        stack: error?.stack,
        error: error,
      })
      throw error
    }
  }

  @Roles(UserRole.ADMIN_USER)
  @Post(':id/update')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateTemplateDto, @Req() req: any) {
    const currentUser = req.user
    const template = await this.templateService.update(+id, updateUserDto, currentUser)
    return new BaseResponseDto({
      responseCode: 0,
      responseMessage: `Update ${template.notificationType} successfully`,
      errorCode: 0,
      data: template,
    })
  }

  @Roles(UserRole.ADMIN_USER)
  @Post(':id/remove')
  async remove(@Param('id') id: string) {
    const template = await this.templateService.remove(+id)
    return new BaseResponseDto({
      responseCode: 0,
      responseMessage: 'Template removed successfully',
      errorCode: 0,
      data: template,
    })
  }

  @Get('cron')
  getCronJobs() {
    return this.templateService.getCronJob()
  }

  @Roles(UserRole.ADMIN_USER)
  @Get('all')
  async getAll(@Query('language') language?: string) {
    return this.templateService.all(language)
  }

  @Roles(UserRole.ADMIN_USER, UserRole.NORMAL_USER, UserRole.API_USER)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const template = await this.templateService.findOne(+id)
    return new BaseResponseDto({
      responseCode: 0,
      responseMessage: 'Template retrieved successfully',
      errorCode: 0,
      data: template,
    })
  }

  @Roles(UserRole.ADMIN_USER, UserRole.NORMAL_USER, UserRole.API_USER)
  @Get()
  async findTemplates(
    @Query() query: any,
    @Query('language') language?: string,
    @Query('format') format?: string,
  ) {
    // Transform query parameters from strings to proper types
    const page = query.page ? parseInt(query.page, 10) : undefined
    const size = query.size ? parseInt(query.size, 10) : undefined
    const isAscending =
      query.isAscending !== undefined
        ? query.isAscending === 'true' || query.isAscending === true
        : undefined

    if (format === 'notification') {
      return await this.templateService.findTemplatesAsNotifications(
        page,
        size,
        isAscending,
        language,
      )
    }
    return this.templateService.findTemplates(page, size, isAscending, language)
  }
}
