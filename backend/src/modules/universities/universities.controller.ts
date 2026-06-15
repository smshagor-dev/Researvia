import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UniversitiesService } from './universities.service';
import { JwtAuthGuard, OptionalJwtGuard, RolesGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators';

@ApiTags('Universities')
@Controller('universities')
export class UniversitiesController {
  constructor(private readonly universitiesService: UniversitiesService) {}

  @Get() @UseGuards(OptionalJwtGuard)
  async findAll(@Query() f: any) { return this.universitiesService.findAll(f); }

  @Get('sync/stats') @UseGuards(OptionalJwtGuard)
  async getSyncStats() { return this.universitiesService.getSyncStats(); }

  @Post('sync') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('admin','super_admin') @ApiBearerAuth()
  async syncUniversities() { return this.universitiesService.triggerSyncFromOpenAlex('manual'); }

  @Get('countries') @UseGuards(OptionalJwtGuard)
  async getCountries() { return this.universitiesService.getCountries(); }

  @Get(':id') @UseGuards(OptionalJwtGuard)
  async findOne(@Param('id') id: string) { return this.universitiesService.findOne(id); }

  @Post() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('admin','super_admin') @ApiBearerAuth()
  async create(@Body() b: any) { return this.universitiesService.create(b); }

  @Patch(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('admin','super_admin') @ApiBearerAuth()
  async update(@Param('id') id: string, @Body() b: any) { return this.universitiesService.update(id, b); }

  @Delete(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('admin','super_admin') @ApiBearerAuth()
  async delete(@Param('id') id: string) { return this.universitiesService.delete(id); }
}
