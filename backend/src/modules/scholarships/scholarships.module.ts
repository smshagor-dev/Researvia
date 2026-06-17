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
import { BootstrapScholarshipAdapter } from './adapters/bootstrap-scholarship.adapter';
import { SyncLogsModule } from '../sync-logs/sync-logs.module';
import { QueuesModule } from '../../queues/queues.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { CreditsModule } from '../credits/credits.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({ secret: c.get('JWT_SECRET', 'dev-secret') }),
    }),
    SyncLogsModule,
    QueuesModule,
    NotificationsModule,
    CreditsModule,
    BillingModule,
  ],
  controllers: [ScholarshipsController, AdminScholarshipsController],
  providers: [
    ScholarshipsService,
    ScholarshipDiscoveryService,
    ScholarshipCronService,
    PaginationService,
    {
      provide: SCHOLARSHIP_SOURCE_ADAPTERS,
      inject: [ConfigService, SystemSettingsService],
      useFactory: (config: ConfigService, systemSettings: SystemSettingsService) => [
        new BootstrapScholarshipAdapter(),
        new DAADAdapter(config, systemSettings),
        new ErasmusAdapter(config, systemSettings),
        new FulbrightAdapter(config, systemSettings),
        new CheveningAdapter(config, systemSettings),
        new MEXTAdapter(config, systemSettings),
        new CommonwealthAdapter(config, systemSettings),
        new UniversityScholarshipAdapter(config, systemSettings),
      ],
    },
  ],
  exports: [ScholarshipsService, ScholarshipDiscoveryService],
})
export class ScholarshipsModule {}
