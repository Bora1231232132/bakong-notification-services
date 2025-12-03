import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, QueryFailedError } from 'typeorm'
import { CategoryType } from '../../entities/category-type.entity'
import { CreateCategoryTypeDto } from './dto/create-category-type.dto'
import { UpdateCategoryTypeDto } from './dto/update-category-type.dto'
import { BaseResponseDto } from '../../common/base-response.dto'
import { ErrorCode, ResponseMessage } from '@bakong/shared'
import * as fs from 'fs'
import * as path from 'path'

interface CacheEntry<T> {
  data: T
  timestamp: number
}

@Injectable()
export class CategoryTypeService implements OnModuleInit {
  private readonly logger = new Logger(CategoryTypeService.name)
  // In-memory cache for category types
  // Cache TTL: 5 minutes (300000 ms)
  private readonly CACHE_TTL = 5 * 60 * 1000
  private categoryTypesCache: CacheEntry<CategoryType[]> | null = null
  private categoryTypeCache: Map<number, CacheEntry<CategoryType>> = new Map()

  constructor(
    @InjectRepository(CategoryType)
    private readonly repo: Repository<CategoryType>,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultCategoryTypes()
  }

  /**
   * Ensures that the default category types always exist:
   * - NEWS
   * - PRODUCT_AND_FEATURE
   * - OTHER
   * - EVENT
   */
  private async ensureDefaultCategoryTypes(): Promise<void> {
    // Try multiple possible paths to handle different execution contexts
    // Priority: Backend assets (most reliable in Docker) > Frontend assets (dev) > Compiled dist
    const possiblePaths = [
      // Backend assets directory (most reliable for Docker/production)
      path.join(process.cwd(), 'assets/images'), // From workspace root
      path.join(process.cwd(), 'apps/backend/assets/images'), // From workspace root (monorepo)
      path.join(__dirname, '../../../assets/images'), // From compiled dist
      // Frontend assets directory (for local development)
      path.join(process.cwd(), 'apps/frontend/src/assets/image'), // From workspace root
      path.join(process.cwd(), '../frontend/src/assets/image'), // From apps/backend
      path.join(__dirname, '../../../../frontend/src/assets/image'), // From compiled dist
    ]

    let assetsPath: string | null = null
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        assetsPath = testPath
        this.logger.log(`📁 Found category type images directory: ${assetsPath}`)
        break
      }
    }

    // Log warning if no valid path found
    if (!assetsPath || !fs.existsSync(assetsPath)) {
      this.logger.warn(
        `⚠️ Category type images directory not found. Tried paths: ${possiblePaths.join(', ')}`,
      )
      this.logger.warn(
        `⚠️ Will use default icons for all category types. Current working directory: ${process.cwd()}`,
      )
      // Set a fallback path to prevent errors, but icons won't be found
      assetsPath = possiblePaths[0]
    }

    // Helper function to load icon file or return default
    const loadIconBuffer = (iconFileName: string): Buffer => {
      const iconPath = path.join(assetsPath, iconFileName)
      this.logger.debug(`Attempting to load icon from: ${iconPath}`)
      try {
        if (fs.existsSync(iconPath)) {
          const iconBuffer = fs.readFileSync(iconPath)
          this.logger.log(
            `✅ Successfully loaded icon ${iconFileName} (${iconBuffer.length} bytes)`,
          )
          return iconBuffer
        } else {
          this.logger.warn(`⚠️ Icon file not found: ${iconPath}, using default icon`)
          // Return default minimal PNG buffer
          return Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64',
          )
        }
      } catch (error) {
        this.logger.error(`❌ Failed to load icon ${iconFileName}: ${error.message}`)
        // Return default minimal PNG buffer on error
        return Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          'base64',
        )
      }
    }

    const defaultCategoryTypes = [
      {
        name: 'News',
        mimeType: 'image/png',
        originalFileName: 'News.png',
        iconFileName: 'News.png', // You can add this file later
      },
      {
        name: 'Product & Feature',
        mimeType: 'image/png',
        originalFileName: 'ProductAndFeature.png',
        iconFileName: 'ProductAndFeature.png', // Use actual PNG file
      },
      {
        name: 'Other',
        mimeType: 'image/png',
        originalFileName: 'Other.png',
        iconFileName: 'Other.png', // You can add this file later
      },
      {
        name: 'Event',
        mimeType: 'image/png',
        originalFileName: 'Event.png',
        iconFileName: 'Event.png', // You can add this file later
      },
    ]

    for (const categoryType of defaultCategoryTypes) {
      try {
        const existing = await this.repo.findOne({
          where: { name: categoryType.name },
        })

        if (!existing) {
          const iconBuffer = loadIconBuffer(categoryType.iconFileName)
          const newCategoryType = this.repo.create({
            name: categoryType.name,
            icon: iconBuffer,
            mimeType: categoryType.mimeType,
            originalFileName: categoryType.originalFileName,
          })
          await this.repo.save(newCategoryType)
          this.logger.log(`✅ Created default category type: ${categoryType.name}`)
        } else {
          this.logger.debug(
            `Category type ${categoryType.name} already exists (ID: ${existing.id})`,
          )
        }
      } catch (error) {
        this.logger.error(
          `Failed to ensure category type ${categoryType.name}: ${error.message}`,
          error.stack,
        )
        // Continue with other category types even if one fails
      }
    }
  }

  /**
   * Clear all caches - called after delete operations
   */
  clearCache(): void {
    this.categoryTypesCache = null
    this.categoryTypeCache.clear()
    this.logger.debug('Category types cache cleared')
  }

  /**
   * Update cache after creating a new category type
   */
  private updateCacheAfterCreate(newCategoryType: CategoryType): void {
    if (this.categoryTypesCache) {
      // Add new category type to cached list and sort by name
      const updatedList = [...this.categoryTypesCache.data, newCategoryType].sort((a, b) =>
        a.name.localeCompare(b.name),
      )
      this.categoryTypesCache = {
        data: updatedList,
        timestamp: Date.now(),
      }
      this.logger.debug(`Cache updated with new category type: ${newCategoryType.name}`)
    } else {
      // If cache doesn't exist, clear it so next fetch will populate it
      this.clearCache()
    }
  }

  /**
   * Update cache after updating a category type
   */
  private updateCacheAfterUpdate(updatedCategoryType: CategoryType): void {
    if (this.categoryTypesCache) {
      // Update the category type in cached list
      const updatedList = this.categoryTypesCache.data.map((ct) =>
        ct.id === updatedCategoryType.id ? updatedCategoryType : ct,
      )
      // Sort by name to maintain order
      updatedList.sort((a, b) => a.name.localeCompare(b.name))
      this.categoryTypesCache = {
        data: updatedList,
        timestamp: Date.now(),
      }
      this.logger.debug(`Cache updated with modified category type: ${updatedCategoryType.name}`)
    } else {
      // If cache doesn't exist, clear it so next fetch will populate it
      this.clearCache()
    }

    // Also update individual cache
    this.categoryTypeCache.set(updatedCategoryType.id, {
      data: updatedCategoryType,
      timestamp: Date.now(),
    })
  }

  /**
   * Update cache after deleting a category type
   */
  private updateCacheAfterDelete(deletedId: number): void {
    if (this.categoryTypesCache) {
      // Remove deleted category type from cached list
      const updatedList = this.categoryTypesCache.data.filter((ct) => ct.id !== deletedId)
      this.categoryTypesCache = {
        data: updatedList,
        timestamp: Date.now(),
      }
      this.logger.debug(`Cache updated after deleting category type ID: ${deletedId}`)
    }

    // Remove from individual cache
    this.categoryTypeCache.delete(deletedId)
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid<T>(entry: CacheEntry<T> | null): boolean {
    if (!entry) return false
    const now = Date.now()
    return now - entry.timestamp < this.CACHE_TTL
  }

  /**
   * Convert icon Buffer to base64 string
   */
  private iconToBase64(icon: Buffer, mimeType?: string): string {
    if (!icon) return ''
    const base64 = icon.toString('base64')
    const mime = mimeType || 'image/png'
    return `data:${mime};base64,${base64}`
  }

  /**
   * Transform CategoryType entity to plain object with base64 icon
   */
  private toResponseObject(categoryType: CategoryType): any {
    return {
      id: categoryType.id,
      name: categoryType.name,
      icon: categoryType.icon
        ? this.iconToBase64(categoryType.icon, categoryType.mimeType)
        : undefined,
      mimeType: categoryType.mimeType,
      originalFileName: categoryType.originalFileName,
      createdAt: categoryType.createdAt,
      updatedAt: categoryType.updatedAt,
      deletedAt: categoryType.deletedAt,
    }
  }

  async findAll(): Promise<any[]> {
    // Check cache first
    if (this.isCacheValid(this.categoryTypesCache)) {
      this.logger.debug('Returning category types from cache')
      return this.categoryTypesCache!.data.map((ct) => this.toResponseObject(ct))
    }

    // Cache miss or expired - fetch from database
    const categoryTypes = await this.repo.find({
      order: { name: 'ASC' },
    })

    // Update cache
    this.categoryTypesCache = {
      data: categoryTypes,
      timestamp: Date.now(),
    }
    this.logger.debug(`Cached ${categoryTypes.length} category types`)

    // Return plain objects with base64 icons
    return categoryTypes.map((ct) => this.toResponseObject(ct))
  }

  async findOne(id: number): Promise<CategoryType> {
    // Check cache first
    const cached = this.categoryTypeCache.get(id)
    if (this.isCacheValid(cached)) {
      this.logger.debug(`Returning category type ${id} from cache`)
      return cached!.data
    }

    // Cache miss or expired - fetch from database
    const categoryType = await this.repo.findOne({ where: { id } })
    if (!categoryType) {
      throw new NotFoundException(
        new BaseResponseDto({
          responseCode: 1,
          errorCode: ErrorCode.RECORD_NOT_FOUND,
          responseMessage: ResponseMessage.RECORD_NOT_FOUND + id,
        }),
      )
    }

    // Update cache
    this.categoryTypeCache.set(id, {
      data: categoryType,
      timestamp: Date.now(),
    })
    this.logger.debug(`Cached category type ${id}`)

    return categoryType
  }

  async create(dto: CreateCategoryTypeDto): Promise<CategoryType> {
    const categoryType = this.repo.create(dto)
    const saved = await this.repo.save(categoryType)

    // Update cache with new category type instead of clearing
    this.updateCacheAfterCreate(saved)
    this.logger.log(`Category type created and cache updated: ${saved.name} (ID: ${saved.id})`)

    return saved
  }

  async update(id: number, dto: UpdateCategoryTypeDto): Promise<CategoryType> {
    const categoryType = await this.findOne(id)

    // Preserve existing icon if not provided in update DTO
    const existingIcon = categoryType.icon
    const existingMimeType = categoryType.mimeType
    const existingOriginalFileName = categoryType.originalFileName

    // Apply updates
    Object.assign(categoryType, dto)

    // Restore icon-related fields if not provided in update
    if (!dto.icon && existingIcon) {
      categoryType.icon = existingIcon
      categoryType.mimeType = existingMimeType || categoryType.mimeType
      categoryType.originalFileName = existingOriginalFileName || categoryType.originalFileName
    }

    const updated = await this.repo.save(categoryType)

    // Update cache with updated category type instead of clearing
    this.updateCacheAfterUpdate(updated)
    this.logger.log(`Category type updated and cache updated: ${updated.name} (ID: ${updated.id})`)

    return updated
  }

  async remove(id: number): Promise<void> {
    // Verify record exists (will throw NotFoundException if not found)
    await this.findOne(id)

    try {
      // Hard delete - permanently removes the record from database
      // If foreign key constraint has ON DELETE SET NULL, templates.categoryTypeId will be set to NULL automatically
      const result = await this.repo.delete(id)
      if (result.affected === 0) {
        // This shouldn't happen if findOne succeeded, but handle edge case
        throw new NotFoundException(
          new BaseResponseDto({
            responseCode: 1,
            errorCode: ErrorCode.RECORD_NOT_FOUND,
            responseMessage: ResponseMessage.RECORD_NOT_FOUND + id,
          }),
        )
      }
      // Update cache after deletion
      this.updateCacheAfterDelete(id)
      this.logger.log(
        `Category type ${id} deleted successfully. Related templates' categoryTypeId set to NULL. Cache updated.`,
      )
    } catch (error) {
      // Handle foreign key constraint violations
      if (error instanceof QueryFailedError) {
        const errorMessage = error.message || String(error)
        // Check if it's a foreign key constraint violation
        if (
          errorMessage.includes('foreign key') ||
          errorMessage.includes('violates foreign key constraint')
        ) {
          this.logger.error(`Cannot delete category type ${id}: ${errorMessage}`)
          throw new BadRequestException(
            new BaseResponseDto({
              responseCode: 1,
              errorCode: ErrorCode.VALIDATION_FAILED,
              responseMessage: `Cannot delete category type. The database foreign key constraint may not be configured with ON DELETE SET NULL. Please check the database constraint: fk_template_category_type should have ON DELETE SET NULL. Error: ${errorMessage}`,
            }),
          )
        }
      }
      // Re-throw other errors
      throw error
    }
  }
}
