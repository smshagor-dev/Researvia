import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MemoryHealthIndicator, HttpHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Public } from '../../common/decorators';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private readonly prismaService: PrismaService,
  ) {}

  @Get() @Public() @HealthCheck()
  async check() {
    return this.health.check([
      async () => {
        try {
          await this.prismaService.$queryRaw`SELECT 1`;
          return { database: { status: 'up' } };
        } catch {
          return { database: { status: 'down' } };
        }
      },
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
    ]);
  }
}
