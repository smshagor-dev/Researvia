import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ResearchAreasService } from './research-areas.service';
import { OptionalJwtGuard, JwtAuthGuard, RolesGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators';
@ApiTags('Research Areas')
@Controller('research-areas')
export class ResearchAreasController {
  constructor(private readonly s: ResearchAreasService) {}
  @Get() @UseGuards(OptionalJwtGuard) async findAll() { return this.s.findAll(); }
  @Get(':id') @UseGuards(OptionalJwtGuard) async findOne(@Param('id') id: string) { return this.s.findOne(id); }
  @Post() @UseGuards(JwtAuthGuard,RolesGuard) @Roles('admin','super_admin') async create(@Body() b: any) { return this.s.create(b); }
  @Patch(':id') @UseGuards(JwtAuthGuard,RolesGuard) @Roles('admin','super_admin') async update(@Param('id') id: string, @Body() b: any) { return this.s.update(id,b); }
}
