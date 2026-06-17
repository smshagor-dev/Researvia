import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/jwt-auth.guard';
import { ScholarshipDiscoveryService } from './scholarship-discovery.service';
import { ScholarshipsService } from './scholarships.service';

@ApiTags('Admin Scholarships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
@Controller('admin/scholarships')
export class AdminScholarshipsController {
  constructor(
    private readonly scholarshipsService: ScholarshipsService,
    private readonly discoveryService: ScholarshipDiscoveryService,
  ) {}

  @Get()
  findAll(@Query() filters: any) {
    return this.scholarshipsService.findAdminAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.scholarshipsService.findAdminOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.scholarshipsService.update(id, body);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.discoveryService.approveScholarship(id);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string) {
    return this.discoveryService.rejectScholarship(id);
  }

  @Post(':id/resync')
  resync(@Param('id') id: string) {
    return this.discoveryService.queueDetailsSync('admin', id);
  }

  @Post('sync/discover')
  discover(@Body() body: any) {
    return this.discoveryService.queueDiscovery('admin', body?.sourceTypes);
  }

  @Post('sync/details')
  syncDetails(@Body() body: any) {
    return this.discoveryService.queueDetailsSync('admin', body?.scholarshipId);
  }

  @Post('sync/deadlines')
  syncDeadlines() {
    return this.discoveryService.queueDeadlineCheck('admin');
  }

  @Post('sync/quality')
  syncQuality(@Body() body: any) {
    return this.discoveryService.queueQualityScore('admin', body?.scholarshipId);
  }
}
