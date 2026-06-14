import { Body, Controller, Get, Patch, Post, Query, UseGuards, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateApplicationDto, UpdateApplicationDto } from './dto/opportunity.dto';
import { OpportunitiesService } from './opportunities.service';

@ApiTags('Applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly opportunities: OpportunitiesService) {}

  @Get()
  findAll(@CurrentUser('id') userId: string, @Query() filters: any) {
    return this.opportunities.listApplications(userId, filters);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateApplicationDto) {
    return this.opportunities.createApplication(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.opportunities.updateApplication(userId, id, dto);
  }
}
