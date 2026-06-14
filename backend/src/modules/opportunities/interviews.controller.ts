import { Body, Controller, Patch, Post, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateInterviewDto, UpdateInterviewDto } from './dto/opportunity.dto';
import { OpportunitiesService } from './opportunities.service';

@ApiTags('Interviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('interviews')
export class InterviewsController {
  constructor(private readonly opportunities: OpportunitiesService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateInterviewDto) {
    return this.opportunities.createInterview(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInterviewDto,
  ) {
    return this.opportunities.updateInterview(userId, id, dto);
  }
}
