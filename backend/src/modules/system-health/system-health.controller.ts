import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/jwt-auth.guard';
import { SystemHealthService } from './system-health.service';

@ApiTags('System Health')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
@Controller('admin/system')
export class SystemHealthController {
  constructor(private readonly systemHealth: SystemHealthService) {}

  @Get('health')
  getHealth() {
    return this.systemHealth.getHealth();
  }

  @Get('queues')
  getQueues() {
    return this.systemHealth.getQueues();
  }

  @Get('workers')
  getWorkers() {
    return this.systemHealth.getWorkers();
  }

  @Get('alerts')
  async getAlerts() {
    const health = await this.systemHealth.getHealth();
    return health.alerts;
  }

  @Get('metrics')
  async getMetricsSummary() {
    const health = await this.systemHealth.getHealth();
    return health.metrics;
  }

  @Post('queues/:queueName/retry-failed')
  retryFailed(@Param('queueName') queueName: string) {
    return this.systemHealth.retryFailed(queueName);
  }

  @Post('queues/:queueName/clean-completed')
  cleanCompleted(@Param('queueName') queueName: string) {
    return this.systemHealth.cleanCompleted(queueName);
  }

  @Post('queues/:queueName/clean-failed')
  cleanFailed(@Param('queueName') queueName: string) {
    return this.systemHealth.cleanFailed(queueName);
  }
}
