import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ScholarshipsService } from './scholarships.service';
import { JwtAuthGuard, OptionalJwtGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Scholarships')
@Controller('scholarships')
export class ScholarshipsController {
  constructor(private readonly scholarshipsService: ScholarshipsService) {}

  @Get()
  @UseGuards(OptionalJwtGuard)
  async findAll(@Query() filters: any, @CurrentUser() user: any) {
    return this.scholarshipsService.findAll(filters, user?.id);
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
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.scholarshipsService.findOne(id, user?.id);
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
}
