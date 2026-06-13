import { Module } from '@nestjs/common';
import { UniversitiesController } from './universities.controller';
import { UniversitiesService } from './universities.service';
import { PaginationService } from '../../shared/pagination/pagination.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
@Module({
  imports: [JwtModule.registerAsync({ inject:[ConfigService], useFactory:(c:ConfigService)=>({secret:c.get('JWT_SECRET','dev-secret')}) })],
  controllers: [UniversitiesController],
  providers: [UniversitiesService, PaginationService],
  exports: [UniversitiesService],
})
export class UniversitiesModule {}
