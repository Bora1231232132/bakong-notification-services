import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtAuthGuard } from 'src/common/middleware/jwt-auth.guard'
import { RolesGuard } from 'src/common/middleware/roles.guard'
import { ApiKeyGuard } from 'src/common/middleware/api-key.guard'
import { options } from 'src/ormconfig'
import { AuthModule } from './auth/auth.module'
import { ManagementModule } from './management/management.module'
import { NotificationModule } from './notification/notification.module'
import { TemplateModule } from './template/template.module'
import { UserModule } from './user/user.module'
import { ImageModule } from './image/image.module'
import { ScheduleModule } from '@nestjs/schedule'
import { ConfigService } from '../common/services/config.service'

@Module({
  imports: [
    TypeOrmModule.forRoot({ ...options, autoLoadEntities: true }),
    ScheduleModule.forRoot(),
    ManagementModule,
    NotificationModule,
    AuthModule,
    UserModule,
    TemplateModule,
    ImageModule,
  ],
  providers: [
    ConfigService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
  exports: [ConfigService],
})
export class AppModule {}
