import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, Roles } from '../../common/decorators';
import { ProfessorSyncAdminService } from '../professor-sync/professor-sync-admin.service';
import { RunDiscoverySyncDto } from '../professor-sync/dto/run-professor-sync.dto';
import { SyncLogsQueryDto } from '../sync-logs/dto/sync-log.dto';

@ApiTags('Admin Professor Sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
@Controller('admin/professors/sync')
export class AdminProfessorSyncController {
  constructor(private readonly professorSyncAdmin: ProfessorSyncAdminService) {}

  @Post('discover')
  @ApiOperation({ summary: 'Enqueue professor discovery sync' })
  runDiscoverySync(@CurrentUser('id') adminId: string, @Body() body: RunDiscoverySyncDto) {
    return this.professorSyncAdmin.runDiscoverySync(adminId, body);
  }

  @Post('profiles')
  @ApiOperation({ summary: 'Enqueue professor profile sync' })
  runProfileSync(@CurrentUser('id') adminId: string) {
    return this.professorSyncAdmin.runProfileSync(adminId);
  }

  @Post('publications')
  @ApiOperation({ summary: 'Enqueue professor publication sync' })
  runPublicationSync(@CurrentUser('id') adminId: string) {
    return this.professorSyncAdmin.runPublicationSync(adminId);
  }

  @Post('deduplicate')
  @ApiOperation({ summary: 'Enqueue professor deduplication detection' })
  runDeduplication(@CurrentUser('id') adminId: string) {
    return this.professorSyncAdmin.runDeduplication(adminId);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List professor sync queue jobs' })
  getJobs() {
    return this.professorSyncAdmin.getJobs();
  }

  @Get('logs')
  @ApiOperation({ summary: 'List professor sync logs' })
  getLogs(@Query() query: SyncLogsQueryDto) {
    return this.professorSyncAdmin.getLogs(query);
  }
}

