import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingUserController } from './billing-user.controller';
import { AdminBillingController } from './admin-billing.controller';
import { UsageMeteringService } from './usage-metering.service';
import { CreditsModule } from '../credits/credits.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SyncLogsModule } from '../sync-logs/sync-logs.module';
import { QueuesModule } from '../../queues/queues.module';
import { BillingCronService } from './billing-cron.service';
@Module({
  imports: [CreditsModule, NotificationsModule, SyncLogsModule, QueuesModule],
  controllers: [BillingController, BillingUserController, AdminBillingController],
  providers: [BillingService, UsageMeteringService, BillingCronService],
  exports: [BillingService, UsageMeteringService],
})
export class BillingModule {}
