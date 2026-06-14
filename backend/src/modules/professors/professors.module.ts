import { Module } from '@nestjs/common';
import { ProfessorsController } from './professors.controller';
import { ProfessorsService } from './professors.service';
import { PaginationService } from '../../shared/pagination/pagination.service';
import { CreditsModule } from '../credits/credits.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    CreditsModule,
    BillingModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({ secret: c.get('JWT_SECRET', 'dev-secret') }),
    }),
  ],
  controllers: [ProfessorsController],
  providers: [ProfessorsService, PaginationService],
  exports: [ProfessorsService],
})
export class ProfessorsModule {}
