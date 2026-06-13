import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
  Res, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EmailMessagesService } from './email-messages.service';
import { JwtAuthGuard, OptionalJwtGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, Public } from '../../common/decorators';

@ApiTags('Email Messages')
@Controller('email-threads/:threadId/messages')
export class EmailMessagesController {
  constructor(private readonly emailMessagesService: EmailMessagesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createMessage(
    @Param('threadId') threadId: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    return this.emailMessagesService.createMessage(threadId, userId, body);
  }

  @Patch(':messageId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateDraft(
    @Param('messageId') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    return this.emailMessagesService.updateDraft(id, userId, body);
  }

  @Delete(':messageId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async deleteDraft(
    @Param('messageId') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.emailMessagesService.deleteDraft(id, userId);
  }
}

// Tracking pixel controller
@Controller('track')
export class TrackingController {
  constructor(private readonly emailMessagesService: EmailMessagesService) {}

  @Get('open/:messageId')
  @Public()
  async trackOpen(@Param('messageId') messageId: string, @Res() res: Response) {
    await this.emailMessagesService.trackOpen(messageId);
    // Return 1x1 transparent GIF
    const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' });
    res.send(gif);
  }

  @Get('click/:messageId')
  @Public()
  async trackClick(@Param('messageId') messageId: string, @Query('url') url: string, @Res() res: Response) {
    await this.emailMessagesService.trackClick(messageId, url);
    res.redirect(url || '/');
  }
}
