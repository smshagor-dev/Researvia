import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { OptionalJwtGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly s: SearchService) {}

  @Get('autocomplete') @UseGuards(OptionalJwtGuard)
  async autocomplete(@Query('q') q: string, @Query('type') type: string) {
    return this.s.autocomplete(q, type);
  }

  @Get() @UseGuards(OptionalJwtGuard)
  async search(@Query('q') q: string) { return this.s.globalSearch(q); }
}
