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

  async resizeImage(
    buffer: Buffer,
    width: number,
    height: number,
    fit: keyof sharp.FitEnum = 'cover',
    mimeType: string = 'image/jpeg',
    quality: number = 85,
  ): Promise<Buffer> {
    try {
      let sharpInstance = sharp(buffer)
      const metadata = await sharpInstance.metadata()

      if (metadata.width && metadata.height) {
        sharpInstance = sharpInstance.resize(width, height, {
          fit: fit,
          position: 'center',
          background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background for containment
        })
      }

      if (mimeType === 'image/png') {
        sharpInstance = sharpInstance.png({ compressionLevel: 9 })
      } else {
        sharpInstance = sharpInstance.jpeg({ quality, mozjpeg: true })
      }

      return await sharpInstance.toBuffer()
    } catch (error) {
      this.logger.warn(`Failed to resize image: ${error?.message || String(error)}`)
      return buffer
    }
  }

  async compressImage(
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    try {
      // Notification frame dimensions (2x for retina displays)
      const targetWidth = 654
      const targetHeight = 330

      // Use the new resizeImage method
      const compressedBuffer = await this.resizeImage(
        buffer,
        targetWidth,
        targetHeight,
        'cover',
        mimeType,
      )

      let resultMimeType = mimeType
      if (mimeType !== 'image/png') {
        resultMimeType = 'image/jpeg'
      }

      this.logger.log(
        `Image processed: ${(buffer.length / 1024).toFixed(2)}KB -> ${(
          compressedBuffer.length / 1024
        ).toFixed(2)}KB`,
      )

      return { buffer: compressedBuffer, mimeType: resultMimeType }
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
        `⚠️ Error checking for duplicate image: ${
          error?.message || String(error)
        }. Creating new record.`,
      )
    }

    let image = this.repo.create(dto)
    image = await this.repo.save(image)
    this.logger.log(`Created new image record (fileId: ${image.fileId})`)
    return { fileId: image.fileId }
  }

  async findByFileId(
    fileId: string,
    resizeOptions?: { width?: number; height?: number; fit?: any },
  ) {
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

    if (resizeOptions?.width && resizeOptions?.height) {
      const resizedBuffer = await this.resizeImage(
        image.file,
        Number(resizeOptions.width),
        Number(resizeOptions.height),
        resizeOptions.fit || 'cover',
        image.mimeType,
      )
      image.file = resizedBuffer
    }

    return image
  }

  buildImageUrl(
    imageId: string,
    req?: any,
    baseUrl?: string,
    resizeOptions?: { width?: number; height?: number; fit?: string },
  ): string {
    if (!imageId) return ''

    let finalBaseUrl = baseUrl || this.baseFunctionHelper.getBaseUrl(req)

    // Ensure HTTPS for production domains
    if (finalBaseUrl.includes('nbc.gov.kh') || finalBaseUrl.includes('bakong-notification')) {
      finalBaseUrl = finalBaseUrl.replace(/^http:/, 'https:')
    }

    let url = `${finalBaseUrl}/api/v1/image/${imageId}`

    if (resizeOptions) {
      const params = new URLSearchParams()
      if (resizeOptions.width) params.append('w', resizeOptions.width.toString())
      if (resizeOptions.height) params.append('h', resizeOptions.height.toString())
      if (resizeOptions.fit) params.append('fit', resizeOptions.fit)

      const queryString = params.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }

    return url
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
