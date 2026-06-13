import { Controller, Get, Post, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProfessorEmailsService } from './professor-emails.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, Roles } from '../../common/decorators';

@ApiTags('Professor Emails')
@Controller('professors/:professorId/emails')
export class ProfessorEmailsController {
  constructor(private readonly s: ProfessorEmailsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  async findAll(@Param('professorId') pid: string) {
    return this.s.findByProfessor(pid);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  async create(@Param('professorId') pid: string, @Body() body: any) {
    return this.s.create(pid, body);
  }
}

@Controller('professor-emails')
export class ProfessorEmailsAdminController {
  constructor(private readonly s: ProfessorEmailsService) {}

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  async getPending() { return this.s.getPendingVerifications(); }

  @Post(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async verify(@Param('id') id: string, @CurrentUser('id') adminId: string, @Body() body: any) {
    return this.s.adminVerify(id, adminId, body.approve, body.rejectReason);
  }
}
