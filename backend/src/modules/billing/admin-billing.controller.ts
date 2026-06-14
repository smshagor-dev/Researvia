import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/jwt-auth.guard';
import { BillingService } from './billing.service';
import { CreateCouponDto } from './dto/billing.dto';

@ApiTags('Admin Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
@Controller('admin/billing')
export class AdminBillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('stats')
  stats() {
    return this.billing.getAdminStats();
  }

  @Get('subscriptions')
  subscriptions(@Query() filters: any) {
    return this.billing.getAdminSubscriptions(filters);
  }

  @Get('revenue')
  revenue() {
    return this.billing.getRevenueSeries();
  }

  @Get('coupons')
  coupons() {
    return this.billing.listCoupons();
  }

  @Post('coupons')
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.billing.createCoupon(dto);
  }
}
