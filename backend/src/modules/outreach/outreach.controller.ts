import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { OutreachService } from './outreach.service';

@ApiTags('Outreach')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('outreach')
export class OutreachController {
  constructor(private readonly outreach: OutreachService) {}

  @Post('generate')
  generate(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.outreach.generateEmail(userId, body);
  }

  @Post('send')
  send(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.outreach.sendApprovedEmail(userId, body);
  }

  @Post('threads/:id/pause')
  pause(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.outreach.pauseThread(userId, id);
  }

  @Post('threads/:id/resume')
  resume(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.outreach.resumeThread(userId, id);
  }

  @Patch('threads/:id/stage')
  updateStage(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() body: any) {
    return this.outreach.updateStage(userId, id, body.stage);
  }

  @Get('threads')
  getThreads(@CurrentUser('id') userId: string, @Query() query: any) {
    return this.outreach.getThreads(userId, query);
  }

  @Get('threads/:id')
  getThread(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.outreach.getThread(userId, id);
  }

  @Get('analytics')
  getAnalytics(@CurrentUser('id') userId: string) {
    return this.outreach.getAnalytics(userId);
  }
}
