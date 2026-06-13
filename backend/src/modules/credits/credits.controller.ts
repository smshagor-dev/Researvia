import { Controller, Get, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { CreditsService } from './credits.service';

@ApiTags('Credits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('credits')
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get('balance')
  async getBalance(@CurrentUser('id') userId: string) {
    return this.creditsService.getBalance(userId);
  }

  @Get('transactions')
  async getTransactions(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('perPage', new DefaultValuePipe(20), ParseIntPipe) perPage: number,
  ) {
    return this.creditsService.getTransactions(userId, page, perPage);
  }
}
