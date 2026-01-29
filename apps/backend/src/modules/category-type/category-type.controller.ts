import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Request, Response } from 'express'
import { UserRole } from '@bakong/shared'
import { Public } from '../../common/middleware/jwt-auth.guard'
import { Roles } from '../../common/middleware/roles.guard'
import { CategoryTypeService } from './category-type.service'
import { CreateCategoryTypeDto } from './dto/create-category-type.dto'
import { UpdateCategoryTypeDto } from './dto/update-category-type.dto'
import { BaseResponseDto } from '../../common/base-response.dto'
import { ErrorCode, ResponseMessage } from '@bakong/shared'

@Controller({ path: 'category-type', version: ['1', '2'] })
@UseInterceptors(ClassSerializerInterceptor)
export class CategoryTypeController {
  constructor(private readonly categoryTypeService: CategoryTypeService) {}

  @Public()
  @Get()
  async findAll() {
    const categoryTypes = await this.categoryTypeService.findAll()
    return new BaseResponseDto({
      responseCode: 0,
      responseMessage: 'Success',
      errorCode: 0,
      data: categoryTypes,
    })
  }

  @Public()
  @Get(':id/icon')
  async getIcon(@Param('id', ParseIntPipe) id: number, @Res({ passthrough: false }) res: Response) {
    const categoryType = await this.categoryTypeService.findOne(id)
    if (!categoryType.icon) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.RECORD_NOT_FOUND,
        responseMessage:
          ResponseMessage.RECORD_NOT_FOUND + ` - Icon not found for category type ${id}`,
      }) as any
    }
    res.set({
      'Content-Type': categoryType.mimeType || 'image/png',
    })
    res.send(categoryType.icon)
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const categoryType = await this.categoryTypeService.findOne(id)
    return new BaseResponseDto({
      responseCode: 0,
      responseMessage: 'Success',
      errorCode: 0,
      data: categoryType,
    })
  }

  @Roles(UserRole.ADMINISTRATOR)
  @Post()
  @UseInterceptors(FileInterceptor('icon'))
  async create(
    @Body('name') name: string,
    @Body('namekh') namekh?: string,
    @Body('namejp') namejp?: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!name) {
      throw new BaseResponseDto({ 
        responseCode: 1,
        errorCode: ErrorCode.VALIDATION_FAILED,
        responseMessage: ResponseMessage.VALIDATION_FAILED,
        data: { validations: ['Name is required'] },
      }) as any
    }

    if (!file || !file.buffer) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.VALIDATION_FAILED,
        responseMessage: ResponseMessage.VALIDATION_FAILED,
        data: { validations: ['Icon file is required'] },
      }) as any
    }

    const dto: CreateCategoryTypeDto = {
      name: name.trim(),
      namekh: namekh && namekh.trim() ? namekh.trim() : undefined,
      namejp: namejp && namejp.trim() ? namejp.trim() : undefined,
      icon: file.buffer,
      mimeType: file.mimetype,
      originalFileName: file.originalname,
    }

    const categoryType = await this.categoryTypeService.create(dto)
    return new BaseResponseDto({
      responseCode: 0,
      responseMessage: 'Category type created successfully',
      errorCode: 0,
      data: categoryType,
    })
  }

  @Roles(UserRole.ADMINISTRATOR)
  @Put(':id')
  @UseInterceptors(FileInterceptor('icon'))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
    @Req() req?: Request,
  ) {
    const dto: UpdateCategoryTypeDto = {}

    // Extract name from body
    // With FileInterceptor + multipart/form-data: fields are in req.body
    // With JSON: body is the parsed JSON object
    const name = req?.body?.name || body?.name || (typeof body === 'string' ? body : null)
    const namekh = req?.body?.namekh || body?.namekh || (typeof body === 'string' ? body : null)
    const namejp = req?.body?.namejp || body?.namejp || (typeof body === 'string' ? body : null)
    if (name && typeof name === 'string' && name.trim()) {
      dto.name = name.trim()
    }
    if (namekh && typeof namekh === 'string' && namekh.trim()) {
      dto.namekh = namekh.trim()
    }
    if (namejp && typeof namejp === 'string' && namejp.trim()) {
      dto.namejp = namejp.trim()
    }
    if (file?.buffer) {
      dto.icon = file.buffer
      dto.mimeType = file.mimetype
      dto.originalFileName = file.originalname
    }

    // If DTO is empty, throw validation error
    if (Object.keys(dto).length === 0) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.VALIDATION_FAILED,
        responseMessage: ResponseMessage.VALIDATION_FAILED,
        data: { validations: ['At least one field (name, namekh, namejp or icon) must be provided'] },
      }) as any
    }

    const categoryType = await this.categoryTypeService.update(id, dto)
    return new BaseResponseDto({
      responseCode: 0,
      responseMessage: 'Category type updated successfully',
      errorCode: 0,
      data: categoryType,
    })
  }

  @Roles(UserRole.ADMINISTRATOR)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.categoryTypeService.remove(id)
    this.categoryTypeService.clearCache()
    return new BaseResponseDto({
      responseCode: 0,
      responseMessage: 'Category type deleted successfully',
      errorCode: 0,
    })
  }
}
