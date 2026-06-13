import { Controller, Post, Headers, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { Public } from '../../common/decorators';

@ApiTags('Billing')
@Controller('webhooks/stripe')
export class BillingController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.subscriptionsService.handleStripeWebhook(req.rawBody || req.body, signature);
  }
}
