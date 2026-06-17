import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { JwtAuthGuard, OptionalJwtGuard } from '../../common/guards/jwt-auth.guard';
import { OpportunitiesService } from './opportunities.service';

@ApiTags('Opportunities')
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunities: OpportunitiesService) {}

  @Get()
  @UseGuards(OptionalJwtGuard)
  findAll(@Query() filters: any, @CurrentUser() user?: any) {
    return this.opportunities.findAll(filters, user?.id);
  }

  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  findOne(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.opportunities.findOne(id, user?.id);
  }

  @Post(':id/unlock')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  unlock(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.opportunities.unlock(userId, id);
  }
}
