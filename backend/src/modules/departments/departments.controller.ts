import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { OptionalJwtGuard, JwtAuthGuard, RolesGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators';
@ApiTags('Departments')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly d: DepartmentsService) {}
  @Get() @UseGuards(OptionalJwtGuard) async findAll(@Query('universityId') uid: string) { return this.d.findByUniversity(uid); }
  @Post() @UseGuards(JwtAuthGuard,RolesGuard) @Roles('admin','super_admin') async create(@Body() b: any) { return this.d.create(b); }
  @Patch(':id') @UseGuards(JwtAuthGuard,RolesGuard) @Roles('admin','super_admin') async update(@Param('id') id: string, @Body() b: any) { return this.d.update(id,b); }
  @Delete(':id') @UseGuards(JwtAuthGuard,RolesGuard) @Roles('admin','super_admin') async delete(@Param('id') id: string) { return this.d.delete(id); }
}
