import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, Roles } from '../../common/decorators';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly s: AnalyticsService) {}

  @Get('email-stats')
  async getEmailStats(@CurrentUser('id') uid: string) { return this.s.getEmailStats(uid); }

  @Get('platform')
  @UseGuards(RolesGuard) @Roles('admin', 'super_admin')
  async getPlatform() { return this.s.getPlatformStats(); }

  @Get('user-growth')
  @UseGuards(RolesGuard) @Roles('admin', 'super_admin')
  async getUserGrowth(@Query('days') days: number) { return this.s.getUserGrowth(days || 30); }

  @Get('top-universities')
  @UseGuards(RolesGuard) @Roles('admin', 'super_admin')
  async getTopUniversities() { return this.s.getTopUniversities(); }
}
