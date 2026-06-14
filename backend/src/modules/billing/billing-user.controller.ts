import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApplyCouponDto, CheckoutDto } from './dto/billing.dto';
import { BillingService } from './billing.service';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingUserController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  getOverview(@CurrentUser('id') userId: string) {
    return this.billing.getBillingOverview(userId);
  }

  @Post('checkout')
  checkout(@CurrentUser('id') userId: string, @Body() dto: CheckoutDto) {
    return this.billing.createCheckoutSession(userId, {
      planSlug: dto.planSlug,
      interval: dto.interval || 'monthly',
      couponCode: dto.couponCode,
    });
  }

  @Post('portal')
  portal(@CurrentUser('id') userId: string) {
    return this.billing.createBillingPortal(userId);
  }

  @Get('invoices')
  invoices(@CurrentUser('id') userId: string) {
    return this.billing.getInvoices(userId);
  }

  @Get('usage')
  usage(@CurrentUser('id') userId: string) {
    return this.billing.getUsage(userId);
  }

  @Post('coupons/apply')
  applyCoupon(@CurrentUser('id') userId: string, @Body() dto: ApplyCouponDto) {
    return this.billing.applyCoupon(userId, dto.code);
  }
}
