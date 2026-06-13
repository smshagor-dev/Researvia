import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
@Module({
  imports: [SubscriptionsModule],
  controllers: [BillingController],
})
export class BillingModule {}
