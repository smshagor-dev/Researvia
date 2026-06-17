import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApplyCouponDto, CheckoutDto, CreateNowPaymentsDto } from './dto/billing.dto';
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

  @Get('payment-methods')
  paymentMethods() {
    return this.billing.getPaymentMethods();
  }

  @Post('checkout')
  checkout(@CurrentUser('id') userId: string, @Body() dto: CheckoutDto) {
    return this.billing.createCheckoutSession(userId, {
      planSlug: dto.planSlug,
      interval: dto.interval || 'monthly',
      couponCode: dto.couponCode,
    });
  }

  @Post('nowpayments/create')
  createNowPayments(@CurrentUser('id') userId: string, @Body() dto: CreateNowPaymentsDto) {
    return this.billing.createNowPaymentsPayment(userId, {
      planSlug: dto.planSlug,
      interval: dto.interval || 'monthly',
      couponCode: dto.couponCode,
      payCurrency: dto.payCurrency,
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
    return this.billing.applyCoupon(userId, dto.code, { planSlug: dto.planSlug });
  }

  @Get('promotions')
  promotions() {
    return this.billing.listPublicPromotions();
  }
}
