import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScholarshipsController } from './scholarships.controller';
import { ScholarshipsService } from './scholarships.service';
import { PaginationService } from '../../shared/pagination/pagination.service';
import { AdminScholarshipsController } from './admin-scholarships.controller';
import { ScholarshipDiscoveryService } from './scholarship-discovery.service';
import { ScholarshipCronService } from './scholarship-cron.service';
import { SCHOLARSHIP_SOURCE_ADAPTERS } from './scholarship.constants';
import { DAADAdapter } from './adapters/daad.adapter';
import { ErasmusAdapter } from './adapters/erasmus.adapter';
import { FulbrightAdapter } from './adapters/fulbright.adapter';
import { CheveningAdapter } from './adapters/chevening.adapter';
import { MEXTAdapter } from './adapters/mext.adapter';
import { CommonwealthAdapter } from './adapters/commonwealth.adapter';
import { UniversityScholarshipAdapter } from './adapters/university-scholarship.adapter';
import { SyncLogsModule } from '../sync-logs/sync-logs.module';
import { QueuesModule } from '../../queues/queues.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({ secret: c.get('JWT_SECRET', 'dev-secret') }),
    }),
    SyncLogsModule,
    QueuesModule,
    NotificationsModule,
  ],
  controllers: [ScholarshipsController, AdminScholarshipsController],
  providers: [
    ScholarshipsService,
    ScholarshipDiscoveryService,
    ScholarshipCronService,
    PaginationService,
    {
      provide: SCHOLARSHIP_SOURCE_ADAPTERS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        new DAADAdapter(config),
        new ErasmusAdapter(config),
        new FulbrightAdapter(config),
        new CheveningAdapter(config),
        new MEXTAdapter(config),
        new CommonwealthAdapter(config),
        new UniversityScholarshipAdapter(config),
      ],
    },
  ],
  exports: [ScholarshipsService, ScholarshipDiscoveryService],
})
export class ScholarshipsModule {}
