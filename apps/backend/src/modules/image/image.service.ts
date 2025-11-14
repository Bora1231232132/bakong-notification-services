import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { BaseResponseDto } from '../../common/base-response.dto'
import { ErrorCode, ResponseMessage } from '@bakong/shared'
import { Image } from '../../entities/image.entity'
import { Repository } from 'typeorm'
import { UploadImageDto } from './dto/upload-image.dto'
import { TemplateTranslation } from '../../entities/template-translation.entity'
import { BaseFunctionHelper } from '../../common/util/base-function.helper'
import sharp from 'sharp'

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name)
  constructor(
    @InjectRepository(Image) private readonly repo: Repository<Image>,
    private readonly baseFunctionHelper: BaseFunctionHelper,
  ) {}

  async compressImage(
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    try {
      const maxWidth = 1920
      const maxHeight = 1080
      const quality = 85

      let sharpInstance = sharp(buffer)
      const metadata = await sharpInstance.metadata()

      if (metadata.width && metadata.height) {
        if (metadata.width > maxWidth || metadata.height > maxHeight) {
          sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          })
        }
      }

      if (mimeType === 'image/png' && metadata.hasAlpha) {
        sharpInstance = sharpInstance.png({ compressionLevel: 9 })
      } else {
        sharpInstance = sharpInstance.jpeg({ quality, mozjpeg: true })
        mimeType = 'image/jpeg'
      }

      const compressedBuffer = await sharpInstance.toBuffer()

      this.logger.log(
        `Image compressed: ${(buffer.length / 1024).toFixed(2)}KB -> ${(
          compressedBuffer.length / 1024
        ).toFixed(2)}KB ` +
          `(${((1 - compressedBuffer.length / buffer.length) * 100).toFixed(1)}% reduction)`,
      )

      return { buffer: compressedBuffer, mimeType }
    } catch (error) {
      this.logger.warn(
        `Failed to compress image, using original: ${error?.message || String(error)}`,
      )
      return { buffer, mimeType }
    }
  }

  async create(dto: UploadImageDto) {
    if (dto.file) {
      const compressed = await this.compressImage(dto.file, dto.mimeType || 'image/jpeg')
      dto.file = compressed.buffer
      dto.mimeType = compressed.mimeType
    }

    const fileBuffer = dto.file as Buffer
    try {
      const existingImageResult = await this.repo.manager.query(
        `SELECT "fileId" FROM image WHERE md5(file) = md5($1::bytea) LIMIT 1`,
        [fileBuffer],
      )

      if (existingImageResult && existingImageResult.length > 0) {
        const existingFileId = existingImageResult[0].fileId
        this.logger.log(
          `✅ Image with same file content already exists (fileId: ${existingFileId}), reusing existing record`,
        )
        return { fileId: existingFileId }
      }
    } catch (error) {
      this.logger.warn(
        `⚠️ Error checking for duplicate image: ${error?.message || String(error)}. Creating new record.`,
      )
    }

    let image = this.repo.create(dto)
    image = await this.repo.save(image)
    this.logger.log(`Created new image record (fileId: ${image.fileId})`)
    return { fileId: image.fileId }
  }

  async findByFileId(fileId: string) {
    const image = await this.repo.findOneBy({ fileId })
    if (!image) {
      throw new NotFoundException(
        new BaseResponseDto({
          responseCode: 1,
          errorCode: ErrorCode.FILE_NOT_FOUND,
          responseMessage: ResponseMessage.FILE_NOT_FOUND,
        }),
      )
    }

    return image
  }

  buildImageUrl(imageId: string, req?: any, baseUrl?: string): string {
    if (!imageId) return ''

    const finalBaseUrl = baseUrl || this.baseFunctionHelper.getBaseUrl(req)

    return `${finalBaseUrl}/api/v1/image/${imageId}`
  }

  getImageUrlFromTranslation(translation: TemplateTranslation, req?: any): string {
    if (!translation.imageId) return ''
    return this.buildImageUrl(translation.imageId, req)
  }

  async validateImageExists(imageId: string): Promise<boolean> {
    if (!imageId) return false
    const image = await this.repo.findOne({ where: { fileId: imageId } })
    return !!image
  }

  validateImageId(imageId: string): { isValid: boolean; errorMessage?: string } {
    if (!imageId || typeof imageId !== 'string') {
      return { isValid: false, errorMessage: 'Image ID is required and must be a string' }
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(imageId)) {
      return { isValid: false, errorMessage: 'Invalid image ID format' }
    }

    return { isValid: true }
  }

  validateImageUrl(baseUrl: string, fileId: string): string {
    if (!fileId) {
      if (!fileId || typeof fileId !== 'string') return ''
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      return uuidRegex.test(fileId) ? fileId : ''
    }

    try {
      const imageUrl = `${baseUrl}/api/v1/image/${fileId}`
      new URL(imageUrl)
      return imageUrl
    } catch (e) {
      return ''
    }
  }
}
