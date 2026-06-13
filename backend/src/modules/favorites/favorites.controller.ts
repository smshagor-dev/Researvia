import { Controller, Get, Post, Delete, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async findAll(@CurrentUser('id') userId: string, @Query('page') page: number, @Query('perPage') perPage: number) {
    return this.favoritesService.findAll(userId, page, perPage);
  }

  @Post(':professorId')
  async save(@CurrentUser('id') userId: string, @Param('professorId') pid: string, @Body() body: any) {
    return this.favoritesService.save(userId, pid, body.note);
  }

  @Delete(':professorId')
  async remove(@CurrentUser('id') userId: string, @Param('professorId') pid: string) {
    return this.favoritesService.remove(userId, pid);
  }

  @Patch(':professorId/status')
  async updateStatus(@CurrentUser('id') userId: string, @Param('professorId') pid: string, @Body() body: any) {
    return this.favoritesService.updateStatus(userId, pid, body.status, body.note);
  }

  @Get(':professorId/check')
  async check(@CurrentUser('id') userId: string, @Param('professorId') pid: string) {
    return this.favoritesService.checkSaved(userId, pid);
  }
}
