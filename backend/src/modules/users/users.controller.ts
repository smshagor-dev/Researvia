import {
  Controller, Get, Patch, Put, Post, Delete, Body, Query,
  UseGuards, UseInterceptors, UploadedFile, ParseIntPipe,
  DefaultValuePipe, Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.usersService.findMe(userId);
  }

  @Patch('me')
  async updateMe(@CurrentUser('id') userId: string, @Body() body: { fullName?: string }) {
    return this.usersService.updateMe(userId, body);
  }

  @Get('me/profile')
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Put('me/profile')
  async updateProfile(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.usersService.updateProfile(userId, body);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@CurrentUser('id') userId: string, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.uploadAvatar(userId, file);
  }

  @Post('me/files/:type')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @CurrentUser('id') userId: string,
    @Param('type') type: 'cv' | 'sop',
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadFile(userId, type, file);
  }

  @Get('me/notifications')
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('perPage', new DefaultValuePipe(20), ParseIntPipe) perPage: number,
  ) {
    return this.usersService.getNotifications(userId, page, perPage);
  }

  @Get('me/notifications/unread-count')
  async getUnreadCount(@CurrentUser('id') userId: string) {
    return this.usersService.getUnreadNotificationCount(userId);
  }

  @Patch('me/notifications/:id/read')
  async markRead(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.usersService.markNotificationRead(userId, id);
  }

  @Post('me/notifications/mark-all-read')
  async markAllRead(@CurrentUser('id') userId: string) {
    return this.usersService.markAllNotificationsRead(userId);
  }

  @Delete('me/account')
  async deleteAccount(@CurrentUser('id') userId: string) {
    return this.usersService.deleteAccount(userId);
  }
}
