import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OutreachService } from './outreach.service';

@ApiTags('Admin Outreach')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard/admin/outreach')
export class AdminOutreachController {
  constructor(private readonly outreach: OutreachService) {}

  @Get()
  getAdminOutreach() {
    return this.outreach.getAdminAnalytics();
  }
}
