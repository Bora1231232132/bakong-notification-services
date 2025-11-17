import { Controller, Get } from '@nestjs/common'
import { AppService } from './app.service'
import { Public } from './common/middleware/jwt-auth.guard'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello()
  }

  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Bakong Notification Service API',
      version: '1.0.0',
    }
  }
}
