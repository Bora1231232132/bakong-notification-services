import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, QueryFailedError } from 'typeorm'
import { CategoryType } from '../../entities/category-type.entity'
import { CreateCategoryTypeDto } from './dto/create-category-type.dto'
import { UpdateCategoryTypeDto } from './dto/update-category-type.dto'
import { BaseResponseDto } from '../../common/base-response.dto'
import { ErrorCode, ResponseMessage } from '@bakong/shared'

@Injectable()
export class CategoryTypeService {
  private readonly logger = new Logger(CategoryTypeService.name)

  constructor(
    @InjectRepository(CategoryType)
    private readonly repo: Repository<CategoryType>,
  ) {}

  async findAll(): Promise<CategoryType[]> {
    return this.repo.find({
      order: { name: 'ASC' },
    })
  }

  async findOne(id: number): Promise<CategoryType> {
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
    return categoryType
  }

  async create(dto: CreateCategoryTypeDto): Promise<CategoryType> {
    const categoryType = this.repo.create(dto)
    return this.repo.save(categoryType)
  }

  async update(id: number, dto: UpdateCategoryTypeDto): Promise<CategoryType> {
    const categoryType = await this.findOne(id)
    Object.assign(categoryType, dto)
    return this.repo.save(categoryType)
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
      this.logger.log(
        `Category type ${id} deleted successfully. Related templates' categoryTypeId set to NULL.`,
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
