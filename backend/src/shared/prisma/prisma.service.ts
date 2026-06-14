import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { dbLatency } from '../../modules/observability/metrics.registry';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const queryLoggingEnabled = process.env.PRISMA_QUERY_LOGGING === 'true';

    super({
      log: queryLoggingEnabled
        ? [{ emit: 'stdout', level: 'query' }, { emit: 'stdout', level: 'error' }]
        : [{ emit: 'stdout', level: 'error' }],
    });

    // Soft delete middleware
    this.$use(async (params, next) => {
      const startedAt = Date.now();
      if (params.model === 'User') {
        if (params.action === 'delete') {
          params.action = 'update';
          params.args.data = { deletedAt: new Date() };
        }
        if (params.action === 'deleteMany') {
          params.action = 'updateMany';
          params.args.data = { deletedAt: new Date() };
        }
        if (params.action === 'findUnique' || params.action === 'findFirst') {
          params.action = params.action === 'findUnique' ? 'findFirst' : 'findFirst';
          params.args.where = { ...params.args.where, deletedAt: null };
        }
        if (params.action === 'findMany') {
          if (!params.args) params.args = {};
          if (!params.args.where) params.args.where = {};
          if (params.args.where.deletedAt === undefined) {
            params.args.where.deletedAt = null;
          }
        }
      }
      const result = await next(params);
      dbLatency.observe(
        {
          model: params.model || 'raw',
          action: params.action,
        },
        Date.now() - startedAt,
      );
      return result;
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('cleanDatabase not allowed in production');
    }
    const tablenames = await this.$queryRaw<Array<{ tablename: string }>>`
      SELECT TABLE_NAME as tablename FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
    `;
    for (const { tablename } of tablenames) {
      if (tablename !== '_prisma_migrations') {
        await this.$executeRawUnsafe(`TRUNCATE \`${tablename}\`;`);
      }
    }
  }
}
