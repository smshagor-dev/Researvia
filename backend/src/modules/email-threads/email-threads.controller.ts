import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EmailThreadsService } from './email-threads.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Email Threads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('email-threads')
export class EmailThreadsController {
  constructor(private readonly emailThreadsService: EmailThreadsService) {}

  @Get()
  async findAll(@CurrentUser('id') userId: string, @Query() filters: any) {
    return this.emailThreadsService.findAll(userId, filters);
  }

  @Get('stats')
  async getStats(@CurrentUser('id') userId: string) {
    return this.emailThreadsService.getStats(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.emailThreadsService.findOne(id, userId);
  }

  @Post()
  async create(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.emailThreadsService.create(userId, body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() body: any) {
    return this.emailThreadsService.update(id, userId, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.emailThreadsService.delete(id, userId);
  }
}
