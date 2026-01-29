import { Controller, Get } from '@nestjs/common'
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus'

@Controller('/management')
export class ManagementController {
  constructor(private health: HealthCheckService, private db: TypeOrmHealthIndicator) {}
  @Get('/healthcheck')
  @HealthCheck()
  check() {
    return this.health.check([() => this.db.pingCheck('database')])
  }
}
