import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  StudentOnboardingDto,
  UpdateStudentAcademicDto,
  UpdateStudentBasicDto,
  UpdateStudentPreferencesDto,
  UpdateStudentProfileDto,
  UpdateStudentResearchDto,
  UpdateStudentSkillsDto,
  UploadStudentDocumentDto,
} from './dto/student-profile.dto';
import { StudentProfileService } from './student-profile.service';
import { StudentAccessGuard } from './student-access.guard';

@ApiTags('Student Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, StudentAccessGuard)
@Controller('student')
export class StudentProfileController {
  constructor(private readonly studentProfileService: StudentProfileService) {}

  @Get('profile')
  async getProfile(@CurrentUser('id') userId: string) {
    return this.studentProfileService.getProfile(userId);
  }

  @Post('profile/onboarding')
  async onboarding(@CurrentUser('id') userId: string, @Body() body: StudentOnboardingDto) {
    return this.studentProfileService.submitOnboarding(userId, body);
  }

  @Patch('profile')
  async updateProfile(@CurrentUser('id') userId: string, @Body() body: UpdateStudentProfileDto) {
    return this.studentProfileService.updateProfile(userId, body);
  }

  @Patch('profile/basic')
  async updateBasic(@CurrentUser('id') userId: string, @Body() body: UpdateStudentBasicDto) {
    return this.studentProfileService.updateBasic(userId, body);
  }

  @Patch('profile/academic')
  async updateAcademic(@CurrentUser('id') userId: string, @Body() body: UpdateStudentAcademicDto) {
    return this.studentProfileService.updateAcademic(userId, body);
  }

  @Patch('profile/research')
  async updateResearch(@CurrentUser('id') userId: string, @Body() body: UpdateStudentResearchDto) {
    return this.studentProfileService.updateResearch(userId, body);
  }

  @Patch('profile/skills')
  async updateSkills(@CurrentUser('id') userId: string, @Body() body: UpdateStudentSkillsDto) {
    return this.studentProfileService.updateSkills(userId, body);
  }

  @Patch('profile/preferences')
  async updatePreferences(@CurrentUser('id') userId: string, @Body() body: UpdateStudentPreferencesDto) {
    return this.studentProfileService.updatePreferences(userId, body);
  }

  @Post('documents')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @CurrentUser('id') userId: string,
    @Body() body: UploadStudentDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.studentProfileService.uploadDocument(userId, body.type, file);
  }

  @Delete('documents/:id')
  async deleteDocument(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.studentProfileService.deleteDocument(userId, id);
  }

  @Get('profile/completeness')
  async getCompleteness(@CurrentUser('id') userId: string) {
    return this.studentProfileService.getCompleteness(userId);
  }
}
