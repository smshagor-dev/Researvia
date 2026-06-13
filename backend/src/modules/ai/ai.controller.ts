import {
  Controller, Post, Get, Body, Param, UseGuards, Res, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { CreditsService } from '../credits/credits.service';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly creditsService: CreditsService,
  ) {}

  @Post('generate-outreach')
  async generateOutreach(
    @CurrentUser('id') userId: string,
    @Body() body: { professorId: string; tone?: string; highlights?: string[]; wordLimit?: number },
    @Res() res: Response,
  ) {
    await this.creditsService.deduct(userId, 10, 'ai_generation', body.professorId, 'professors', 'AI outreach email generation');
    return this.aiService.generateOutreach(userId, body.professorId, body, res);
  }

  @Post('generate-followup')
  async generateFollowup(
    @CurrentUser('id') userId: string,
    @Body() body: { threadId: string; tone?: string },
    @Res() res: Response,
  ) {
    await this.creditsService.deduct(userId, 5, 'ai_generation', body.threadId, 'email_threads', 'AI follow-up generation');
    return this.aiService.generateFollowup(userId, body.threadId, body, res);
  }

  @Get('match-score/:professorId')
  async getMatchScore(
    @CurrentUser('id') userId: string,
    @Param('professorId') professorId: string,
  ) {
    return this.aiService.getMatchScore(userId, professorId);
  }

  @Get('scholarship-recommendations')
  async getScholarshipRecommendations(@CurrentUser('id') userId: string) {
    return this.aiService.getScholarshipRecommendations(userId);
  }
}
