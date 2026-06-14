import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/jwt-auth.guard';
import { UpdateOpportunityDto } from './dto/opportunity.dto';
import { OpportunityDiscoveryService } from './opportunity-discovery.service';
import { OpportunitiesService } from './opportunities.service';

@ApiTags('Admin Opportunities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
@Controller('admin/opportunities')
export class AdminOpportunitiesController {
  constructor(
    private readonly opportunities: OpportunitiesService,
    private readonly discovery: OpportunityDiscoveryService,
  ) {}

  @Get()
  findAll(@Query() filters: any) {
    return this.opportunities.findAdminAll(filters);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOpportunityDto) {
    return this.opportunities.updateOpportunity(id, dto);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.opportunities.approveOpportunity(id);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string) {
    return this.opportunities.rejectOpportunity(id);
  }

  @Post(':id/sync')
  syncOne(@Param('id') id: string) {
    return this.discovery.queueSync('admin', id);
  }

  @Post('sync/discover')
  discover() {
    return this.discovery.queueDiscovery('admin');
  }

  @Post('sync')
  syncAll() {
    return this.discovery.queueSync('admin');
  }

  @Post('quality-score')
  qualityScore() {
    return this.discovery.queueQualityScore('admin');
  }
}
