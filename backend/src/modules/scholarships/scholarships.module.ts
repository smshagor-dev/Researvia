import { Module } from '@nestjs/common';
import { ScholarshipsController } from './scholarships.controller';
import { ScholarshipsService } from './scholarships.service';
import { PaginationService } from '../../shared/pagination/pagination.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({ secret: c.get('JWT_SECRET', 'dev-secret') }),
    }),
  ],
  controllers: [ScholarshipsController],
  providers: [ScholarshipsService, PaginationService],
  exports: [ScholarshipsService],
})
export class ScholarshipsModule {}
