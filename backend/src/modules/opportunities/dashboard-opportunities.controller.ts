import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OpportunitiesService } from './opportunities.service';

@ApiTags('Opportunity Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard/opportunities')
export class DashboardOpportunitiesController {
  constructor(private readonly opportunities: OpportunitiesService) {}

  @Get()
  getDashboard(@CurrentUser('id') userId: string) {
    return this.opportunities.getDashboard(userId);
  }
}
