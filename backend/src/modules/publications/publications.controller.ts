import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicationsService } from './publications.service';
import { OptionalJwtGuard } from '../../common/guards/jwt-auth.guard';
@ApiTags('Publications')
@Controller('professors/:professorId/publications')
export class PublicationsController {
  constructor(private readonly s: PublicationsService) {}
  @Get() @UseGuards(OptionalJwtGuard)
  async findAll(@Param('professorId') pid: string, @Query('page') p: number, @Query('perPage') pp: number) {
    return this.s.findByProfessor(pid, p, pp);
  }
}
