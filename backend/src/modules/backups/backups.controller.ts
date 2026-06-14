import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BackupType } from '@prisma/client';
import { CurrentUser, Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/jwt-auth.guard';
import { BackupsService } from './backups.service';

@ApiTags('Backups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
@Controller('admin/backups')
export class BackupsController {
  constructor(private readonly backups: BackupsService) {}

  @Post('run')
  run(@CurrentUser('id') userId: string, @Body() body: { type: BackupType }) {
    return this.backups.run(body.type || BackupType.database, userId);
  }

  @Get()
  list() {
    return this.backups.list();
  }

  @Post(':id/restore')
  restore(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.backups.restore(id, userId);
  }
}
