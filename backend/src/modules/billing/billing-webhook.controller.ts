import { Controller, Headers, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { BillingService } from './billing.service';

@ApiTags('Billing')
@Controller('webhooks/stripe')
export class BillingWebhookController {
  constructor(private readonly billing: BillingService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  handleStripeWebhook(@Req() req: any, @Headers('stripe-signature') signature: string) {
    return this.billing.handleStripeWebhook(req.rawBody || req.body, signature);
  }
}
