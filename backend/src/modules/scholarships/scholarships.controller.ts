import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ScholarshipsService } from './scholarships.service';
import { JwtAuthGuard, OptionalJwtGuard, RolesGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, Roles } from '../../common/decorators';

@ApiTags('Scholarships')
@Controller('scholarships')
export class ScholarshipsController {
  constructor(private readonly scholarshipsService: ScholarshipsService) {}

  @Get()
  @UseGuards(OptionalJwtGuard)
  async findAll(@Query() filters: any) {
    return this.scholarshipsService.findAll(filters);
  }

  @Get('saved')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getSaved(
    @CurrentUser('id') userId: string,
    @Query('page') page: number,
    @Query('perPage') perPage: number,
  ) {
    return this.scholarshipsService.getSaved(userId, page, perPage);
  }

  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  async findOne(@Param('id') id: string) {
    return this.scholarshipsService.findOne(id);
  }

  @Post(':id/save')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async save(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    return this.scholarshipsService.save(userId, id, body);
  }

  @Delete(':id/save')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async unsave(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.scholarshipsService.unsave(userId, id);
  }

  @Patch(':id/saved-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateSavedStatus(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    return this.scholarshipsService.updateSavedStatus(userId, id, body);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  async create(@Body() body: any) {
    return this.scholarshipsService.create(body);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  async update(@Param('id') id: string, @Body() body: any) {
    return this.scholarshipsService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  async delete(@Param('id') id: string) {
    return this.scholarshipsService.delete(id);
  }
}
