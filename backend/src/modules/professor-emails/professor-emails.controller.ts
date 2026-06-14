import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/jwt-auth.guard';
import { ProfessorEmailsService } from './professor-emails.service';

@ApiTags('Professor Emails')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
@ApiBearerAuth()
@Controller('admin/professors/emails')
export class ProfessorEmailsAdminController {
  constructor(private readonly service: ProfessorEmailsService) {}

  @Get('pending')
  async getPending(@Query('page') page?: number, @Query('perPage') perPage?: number) {
    return this.service.getPendingVerifications(Number(page || 1), Number(perPage || 20));
  }

  @Get(':id')
  async getDetail(@Param('id') id: string) {
    return this.service.getEmailDetail(id);
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.service.approve(id, adminId);
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string, @CurrentUser('id') adminId: string, @Body() body: { reason?: string }) {
    return this.service.reject(id, adminId, body?.reason);
  }

  @Post(':id/request-review')
  async requestReview(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.service.requestReview(id, adminId);
  }
}

@ApiTags('Professor Emails')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
@ApiBearerAuth()
@Controller('admin/professors/:professorId/emails')
export class ProfessorEmailsProfessorController {
  constructor(private readonly service: ProfessorEmailsService) {}

  @Get()
  async list(@Param('professorId') professorId: string) {
    return this.service.findByProfessor(professorId);
  }

  @Post('discover')
  async discover(@Param('professorId') professorId: string, @CurrentUser('id') adminId: string) {
    return this.service.enqueueFacultyEmailCollection(professorId, adminId);
  }
}

