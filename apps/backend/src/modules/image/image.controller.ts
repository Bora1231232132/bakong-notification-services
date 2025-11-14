import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common'
import { AnyFilesInterceptor } from '@nestjs/platform-express'
import { Body } from '@nestjs/common'
import { Response } from 'express'
import { UserRole } from '@bakong/shared'
import { Public } from '../../common/middleware/jwt-auth.guard'
import { Roles } from '../../common/middleware/roles.guard'
import { ImageService } from './image.service'
import { BaseResponseDto } from '../../common/base-response.dto'
import { ErrorCode, ResponseMessage } from '@bakong/shared'

@Controller('image')
@UseInterceptors(ClassSerializerInterceptor)
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @Post('upload')
  @Roles(UserRole.ADMIN_USER)
  @UseInterceptors(AnyFilesInterceptor())
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('languages') languagesRaw?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.VALIDATION_FAILED,
        responseMessage: ResponseMessage.VALIDATION_FAILED,
        data: { validations: ['No files were provided.'] },
      }) as any
    }
    const maxBytes = 10 * 1024 * 1024
    const validationErrors: string[] = []
    files.forEach((f, idx) => {
      if (!f?.mimetype?.startsWith('image/')) {
        validationErrors.push(`files[${idx}] is not an image (type: ${f?.mimetype || 'unknown'})`)
      }
      if ((f?.size || 0) > maxBytes) {
        validationErrors.push(`files[${idx}] exceeds 10MB (size: ${f.size})`)
      }
    })
    if (validationErrors.length) {
      throw new BaseResponseDto({
        responseCode: 1,
        errorCode: ErrorCode.VALIDATION_FAILED,
        responseMessage: ResponseMessage.VALIDATION_FAILED,
        data: { validations: validationErrors },
      }) as any
    }

    const uploadPromises = files.map((file) =>
      this.imageService.create({
        file: file.buffer,
        mimeType: file.mimetype ? file.mimetype.substring(0, 100) : 'image/jpeg',
        originalFileName: file.originalname ? file.originalname.substring(0, 100) : null,
      }),
    )

    const results = await Promise.all(uploadPromises)
    let languages: string[] = []
    try {
      if (languagesRaw) {
        const parsed = JSON.parse(languagesRaw)
        if (Array.isArray(parsed)) languages = parsed
      }
    } catch {}

    const filesPayload = results.map((result, index) => ({
      language: languages[index] || undefined,
      fileId: result.fileId,
      mimeType: files[index].mimetype ? files[index].mimetype.substring(0, 100) : 'image/jpeg',
      originalFileName: files[index].originalname
        ? files[index].originalname.substring(0, 100)
        : null,
    }))
    return { files: filesPayload } as any
  }

  @Public()
  @Get(':fileId')
  async findByFileId(
    @Res({ passthrough: false }) res: Response,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ) {
    const image = await this.imageService.findByFileId(fileId)

    res.set({
      'Content-Type': image.mimeType,
    })
    res.send(image.file)
  }
}
