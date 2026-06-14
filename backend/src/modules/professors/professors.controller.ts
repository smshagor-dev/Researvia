import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, UseGuards, DefaultValuePipe, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProfessorsService } from './professors.service';
import { JwtAuthGuard, OptionalJwtGuard, RolesGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, Roles } from '../../common/decorators';

@ApiTags('Professors')
@Controller('professors')
export class ProfessorsController {
  constructor(private readonly professorsService: ProfessorsService) {}

  @Get()
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Search and filter professors' })
  async findAll(
    @Query() filters: any,
    @CurrentUser() user: any,
  ) {
    return this.professorsService.findAll(filters, user?.id);
  }

  @Get('stats')
  @UseGuards(OptionalJwtGuard)
  async getStats() {
    return this.professorsService.getStats();
  }

  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Get professor detail' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.professorsService.findOne(id, user?.id);
  }

  @Get(':id/similar')
  @UseGuards(OptionalJwtGuard)
  async getSimilar(@Param('id') id: string) {
    return this.professorsService.getSimilarProfessors(id);
  }

  @Post(':id/reveal-email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reveal professor email (costs 5 credits)' })
  async revealEmail(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.professorsService.revealEmail(id, userId);
  }

  // Admin routes
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  async create(@Body() body: any) {
    return this.professorsService.create(body);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  async update(@Param('id') id: string, @Body() body: any) {
    return this.professorsService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  async delete(@Param('id') id: string) {
    return this.professorsService.delete(id);
  }
}
