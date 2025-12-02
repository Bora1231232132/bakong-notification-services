import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CategoryType } from '../../entities/category-type.entity'
import { CategoryTypeService } from './category-type.service'
import { CategoryTypeController } from './category-type.controller'

@Module({
  imports: [TypeOrmModule.forFeature([CategoryType])],
  providers: [CategoryTypeService],
  controllers: [CategoryTypeController],
  exports: [CategoryTypeService],
})
export class CategoryTypeModule {}

