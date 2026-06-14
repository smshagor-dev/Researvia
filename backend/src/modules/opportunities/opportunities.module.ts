import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsModule } from '../notifications/notifications.module';
import { QueuesModule } from '../../queues/queues.module';
import { SyncLogsModule } from '../sync-logs/sync-logs.module';
import { PaginationService } from '../../shared/pagination/pagination.service';
import { AdminOpportunitiesController } from './admin-opportunities.controller';
import { ApplicationsController } from './applications.controller';
import { DashboardOpportunitiesController } from './dashboard-opportunities.controller';
import { InterviewsController } from './interviews.controller';
import { OpportunityCronService } from './opportunity-cron.service';
import { OpportunityDiscoveryService } from './opportunity-discovery.service';
import { OpportunitiesController } from './opportunities.controller';
import { OpportunitiesService } from './opportunities.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'dev-secret'),
      }),
    }),
    NotificationsModule,
    QueuesModule,
    SyncLogsModule,
  ],
  controllers: [
    OpportunitiesController,
    ApplicationsController,
    InterviewsController,
    DashboardOpportunitiesController,
    AdminOpportunitiesController,
  ],
  providers: [
    OpportunitiesService,
    OpportunityDiscoveryService,
    OpportunityCronService,
    PaginationService,
  ],
  exports: [OpportunitiesService, OpportunityDiscoveryService],
})
export class OpportunitiesModule {}
