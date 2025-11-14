import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { ManagementController } from './management.controller'
import { ConfigService } from '../../common/services/config.service'

@Module({
  imports: [TerminusModule],
  controllers: [ManagementController],
  providers: [ConfigService],
})
export class ManagementModule {}
