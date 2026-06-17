import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, Roles } from '../../common/decorators';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService, private readonly usersService: UsersService) {}

  @Get('dashboard') async getDashboard() { return this.adminService.getDashboardStats(); }

  @Get('users')
  async getUsers(@Query() filters: any) {
    return this.usersService.findAll(filters, Number(filters.page || 1), Number(filters.perPage || 20));
  }

  @Get('users/:id')
  async getUserDetail(@Param('id') id: string) {
    return this.usersService.getAdminUserDetail(id);
  }

  @Patch('users/:id')
  async updateUserDetail(@Param('id') id: string, @Body() body: any) {
    return this.usersService.adminUpdateUserDetail(id, body);
  }

  @Post('users/:id/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadUserAvatar(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.adminUploadAvatar(id, file);
  }

  @Post('users/:id/role')
  async updateRole(@Param('id') id: string, @Body() body: any) {
    return this.usersService.adminUpdateUser(id, { role: body.role });
  }

  @Post('users/:id/status')
  async updateStatus(@Param('id') id: string, @Body() body: any) {
    return this.usersService.adminUpdateUser(id, { status: body.status });
  }

  @Post('users/:id/credits')
  async adjustCredits(@Param('id') id: string, @Body() body: any) {
    return this.usersService.adjustCredits(id, body.amount, body.description);
  }

  @Get('audit-logs') async getAuditLogs(@Query('page') p: number, @Query('perPage') pp: number) {
    return this.adminService.getAuditLogs(p, pp);
  }

  @Get('imports') async getImports(@Query('page') p: number, @Query('perPage') pp: number) {
    return this.adminService.getImports(p, pp);
  }

  @Get('mailboxes')
  async getMailboxes(@Query() filters: any) {
    return this.adminService.getMailboxes(Number(filters.page || 1), Number(filters.perPage || 50), filters);
  }

  @Get('mailboxes/stats')
  async getMailboxStats() {
    return this.adminService.getMailboxStats();
  }

  @Get('students')
  async getStudents(@Query() filters: any) {
    return this.adminService.getStudents(Number(filters.page || 1), Number(filters.perPage || 20), filters.search);
  }

  @Get('students/:id')
  async getStudent(@Param('id') id: string) {
    return this.adminService.getStudent(id);
  }

  @Patch('students/:id/status')
  async updateStudentStatus(@Param('id') id: string, @Body() body: any) {
    return this.usersService.adminUpdateUser(id, { status: body.status });
  }

  @Patch('mailboxes/:id/suspend')
  async suspendMailbox(@Param('id') id: string) {
    return this.adminService.adminSuspendMailbox(id);
  }

  @Patch('mailboxes/:id/reset-password')
  async resetMailboxPassword(@Param('id') id: string) {
    return this.adminService.adminResetMailboxPassword(id);
  }

  @Get('mail-settings')
  async getMailSettings() {
    return this.adminService.getMailSettings();
  }

  @Post('mail-settings')
  async updateMailSettings(@Body() body: any) {
    return this.adminService.updateMailSettings(body);
  }

  @Get('system-settings')
  async getSystemSettings(@Query('prefix') prefix?: string) {
    return this.adminService.getSystemSettings(prefix);
  }

  @Post('system-settings')
  async updateSystemSettings(@Body() body: any) {
    return this.adminService.updateSystemSettings(body);
  }

  @Patch('system-settings/:key/delete')
  async deleteSystemSetting(@Param('key') key: string) {
    return this.adminService.deleteSystemSetting(key);
  }

  @Post('imports')
  @UseInterceptors(FileInterceptor('file'))
  async createImport(@CurrentUser('id') uid: string, @Body() body: any, @UploadedFile() file?: Express.Multer.File) {
    return this.adminService.createImport(uid, { type: body.type, source: body.source || 'csv' });
  }
}
