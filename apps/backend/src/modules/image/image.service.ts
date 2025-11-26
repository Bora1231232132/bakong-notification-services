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
import { createHash } from 'crypto'

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
    const fileBuffer = dto.file as Buffer

    // Step 1: Compute MD5 hash in memory (fast) - BEFORE compression
    const fileHash = createHash('md5').update(fileBuffer).digest('hex')

    // Step 2: Check if hash exists using indexed column (fast lookup)
    try {
      const existingImage = await this.repo.findOne({
        where: { fileHash },
        select: ['fileId'],
      })

      if (existingImage) {
        this.logger.log(
          `✅ Image with same file content already exists (fileId: ${existingImage.fileId}), reusing existing record`,
        )
        return { fileId: existingImage.fileId }
      }
    } catch (error) {
      this.logger.warn(
        `⚠️ Error checking for duplicate image: ${error?.message || String(error)}. Creating new record.`,
      )
    }

    // Step 3: Only compress if image doesn't exist (save processing time)
    if (dto.file) {
      const compressed = await this.compressImage(dto.file, dto.mimeType || 'image/jpeg')
      dto.file = compressed.buffer
      dto.mimeType = compressed.mimeType
    }

    // Step 4: Create new image record with hash
    // Handle race condition: if two requests upload same image simultaneously,
    // one will succeed and the other will get unique constraint violation
    try {
      let image = this.repo.create({ ...dto, fileHash })
      image = await this.repo.save(image)
      this.logger.log(`Created new image record (fileId: ${image.fileId})`)
      return { fileId: image.fileId }
    } catch (error: any) {
      // Handle race condition: if unique constraint violation on fileHash,
      // another request already inserted this image, so fetch and return it
      if (error?.code === '23505' || error?.code === 23505) {
        // Check if it's the fileHash constraint
        const constraintName = error?.constraint || error?.detail || ''
        if (constraintName.includes('fileHash') || constraintName.includes('UQ_image_fileHash')) {
          this.logger.log(
            `⚠️ Race condition detected: Another request already inserted this image. Fetching existing record...`,
          )
          // Fetch the existing image that was just inserted by the other request
          const existingImage = await this.repo.findOne({
            where: { fileHash },
            select: ['fileId'],
          })
          if (existingImage) {
            this.logger.log(
              `✅ Found existing image from race condition (fileId: ${existingImage.fileId}), reusing existing record`,
            )
            return { fileId: existingImage.fileId }
          }
        }
      }
      // Re-throw if it's not a fileHash unique constraint violation
      throw error
    }
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

    let finalBaseUrl = baseUrl || this.baseFunctionHelper.getBaseUrl(req)

    // Ensure HTTPS for production domains
    if (finalBaseUrl.includes('nbc.gov.kh') || finalBaseUrl.includes('bakong-notification')) {
      finalBaseUrl = finalBaseUrl.replace(/^http:/, 'https:')
    }

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
