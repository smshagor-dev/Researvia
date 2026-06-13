import { Controller, Get, Post, Delete, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard, OptionalJwtGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly s: SubscriptionsService) {}

  @Get('plans') @UseGuards(OptionalJwtGuard)
  async getPlans() { return this.s.getPlans(); }

  @Get('my') @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  async getMy(@CurrentUser('id') uid: string) { return this.s.getUserSubscription(uid); }

  @Post('checkout') @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  async checkout(@CurrentUser('id') uid: string, @Body() body: any) {
    return this.s.createCheckoutSession(uid, body.planSlug, body.interval || 'monthly');
  }

  @Delete('cancel') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @HttpCode(HttpStatus.OK)
  async cancel(@CurrentUser('id') uid: string) { return this.s.cancelSubscription(uid); }

  @Get('billing-portal') @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  async getBillingPortal(@CurrentUser('id') uid: string) { return this.s.getBillingPortalUrl(uid); }
}
