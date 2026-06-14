import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, Roles } from '../../common/decorators';
import { AdminProfessorsService } from './admin-professors.service';
import { AdminProfessorFilterDto, AdminProfessorUpdateDto } from './dto/admin-professor.dto';

@ApiTags('Admin Professors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
@Controller('admin/professors')
export class AdminProfessorsController {
  constructor(private readonly adminProfessorsService: AdminProfessorsService) {}

  @Get()
  @ApiOperation({ summary: 'List professors for admin management' })
  async list(@Query() filters: AdminProfessorFilterDto) {
    return this.adminProfessorsService.list(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get professor detail for admin management' })
  async get(@Param('id') id: string) {
    return this.adminProfessorsService.get(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update professor from admin management' })
  async update(
    @Param('id') id: string,
    @Body() body: AdminProfessorUpdateDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminProfessorsService.update(id, body, adminId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete professor from admin management' })
  async remove(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.adminProfessorsService.remove(id, adminId);
  }

  @Post(':id/resync')
  @ApiOperation({ summary: 'Resync professor metadata from admin management' })
  async resync(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.adminProfessorsService.resync(id, adminId);
  }
}
