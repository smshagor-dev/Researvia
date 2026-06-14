import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/jwt-auth.guard';
import { MatchEngineService } from './match-engine.service';
import {
  AdminRecalculateMatchesDto,
  MatchListQueryDto,
  ParseCvDto,
  RefreshMatchesDto,
  UpdateAcademicProfileDto,
} from './dto/match.dto';

@ApiTags('Matches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class MatchesController {
  constructor(private readonly matches: MatchEngineService) {}

  @Get('profile/academic')
  async getAcademicProfile(@CurrentUser('id') userId: string) {
    return this.matches.getAcademicProfile(userId);
  }

  @Patch('profile/academic')
  async updateAcademicProfile(@CurrentUser('id') userId: string, @Body() body: UpdateAcademicProfileDto) {
    return this.matches.updateAcademicProfile(userId, body);
  }

  @Post('profile/cv/parse')
  async parseCv(@CurrentUser('id') userId: string, @Body() body: ParseCvDto) {
    return this.matches.parseCv(userId, body);
  }

  @Post('matches/refresh')
  async refreshMatches(@CurrentUser('id') userId: string, @Body() body: RefreshMatchesDto) {
    return this.matches.requestRefresh(userId, body);
  }

  @Get('matches/professors')
  async getProfessorMatches(@CurrentUser('id') userId: string, @Query() query: MatchListQueryDto) {
    return this.matches.getProfessorMatches(userId, query);
  }

  @Get('matches/professors/:professorId')
  async getProfessorMatch(@CurrentUser('id') userId: string, @Param('professorId') professorId: string) {
    return this.matches.getProfessorMatch(userId, professorId);
  }

  @Get('matches/scholarships')
  async getScholarshipMatches(@CurrentUser('id') userId: string, @Query() query: MatchListQueryDto) {
    return this.matches.getScholarshipMatches(userId, query);
  }

  @Get('matches/scholarships/:scholarshipId')
  async getScholarshipMatch(@CurrentUser('id') userId: string, @Param('scholarshipId') scholarshipId: string) {
    return this.matches.getScholarshipMatch(userId, scholarshipId);
  }
}

@ApiTags('Admin Matches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
@Controller('admin/matches')
export class AdminMatchesController {
  constructor(private readonly matches: MatchEngineService) {}

  @Get('stats')
  async getStats() {
    return this.matches.getAdminStats();
  }

  @Get('jobs')
  async getJobs() {
    return this.matches.getAdminJobs();
  }

  @Post('recalculate')
  async recalculate(@Body() body: AdminRecalculateMatchesDto) {
    return this.matches.adminRecalculate(body);
  }
}
