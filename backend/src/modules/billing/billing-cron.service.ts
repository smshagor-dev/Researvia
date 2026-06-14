import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BillingService } from './billing.service';

@Injectable()
export class BillingCronService {
  private readonly logger = new Logger(BillingCronService.name);

  constructor(private readonly billing: BillingService) {}

  @Cron(process.env.BILLING_SYNC_CRON || '0 2 * * *')
  async billingSync() {
    const result = await this.billing.runBillingSync({ triggeredBy: 'system-cron' });
    this.logger.log(`Billing sync completed: ${JSON.stringify(result)}`);
  }

  @Cron(process.env.INVOICE_SYNC_CRON || '0 3 * * *')
  async invoiceSync() {
    const result = await this.billing.runInvoiceSync({ triggeredBy: 'system-cron' });
    this.logger.log(`Invoice sync completed: ${JSON.stringify(result)}`);
  }

  @Cron(process.env.USAGE_RESET_CRON || '0 0 1 * *')
  async usageReset() {
    const result = await this.billing.runUsageReset({ triggeredBy: 'system-cron' });
    this.logger.log(`Usage reset completed: ${JSON.stringify(result)}`);
  }
}
