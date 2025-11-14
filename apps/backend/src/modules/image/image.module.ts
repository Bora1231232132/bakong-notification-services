import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ImageController } from './image.controller'
import { ImageService } from './image.service'
import { Image } from 'src/entities/image.entity'
import { BaseFunctionHelper } from 'src/common/util/base-function.helper'
import { BakongUser } from 'src/entities/bakong-user.entity'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Logger } from '@nestjs/common'

@Module({
  imports: [TypeOrmModule.forFeature([Image, BakongUser])],
  providers: [
    ImageService,
    {
      provide: BaseFunctionHelper,
      useFactory: (bkUserRepo) => {
        const logger = new Logger(BaseFunctionHelper.name)
        return new BaseFunctionHelper(bkUserRepo, logger)
      },
      inject: [getRepositoryToken(BakongUser)],
    },
  ],
  controllers: [ImageController],
  exports: [ImageService],
})
export class ImageModule {}
