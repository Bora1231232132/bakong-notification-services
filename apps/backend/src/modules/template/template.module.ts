import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ScheduleModule } from '@nestjs/schedule'
import { Template } from 'src/entities/template.entity'
import { TemplateTranslation } from 'src/entities/template-translation.entity'
import { TemplateService } from './template.service'
import { TemplateController } from './template.controller'
import { NotificationModule } from '../notification/notification.module'
import { ImageModule } from '../image/image.module'
import { Image } from 'src/entities/image.entity'
import { BakongUser } from 'src/entities/bakong-user.entity'
import { ImageService } from '../image/image.service'
import { PaginationUtils } from '@bakong/shared'
import { BaseFunctionHelper } from 'src/common/util/base-function.helper'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Logger } from '@nestjs/common'

@Module({
  imports: [
    TypeOrmModule.forFeature([Template, TemplateTranslation, Image, BakongUser]),
    forwardRef(() => NotificationModule),
    forwardRef(() => ImageModule),
    ScheduleModule,
  ],
  providers: [
    TemplateService,
    ImageService,
    PaginationUtils,
    {
      provide: BaseFunctionHelper,
      useFactory: (bkUserRepo) => {
        const logger = new Logger(BaseFunctionHelper.name)
        return new BaseFunctionHelper(bkUserRepo, logger)
      },
      inject: [getRepositoryToken(BakongUser)],
    },
  ],
  exports: [TemplateService],
  controllers: [TemplateController],
})
export class TemplateModule {}
