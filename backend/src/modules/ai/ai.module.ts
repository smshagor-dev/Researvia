import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { CreditsModule } from '../credits/credits.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MatchesController, AdminMatchesController } from './matches.controller';
import { MatchEngineService } from './match-engine.service';
import { QueuesModule } from '../../queues/queues.module';
import { ProfessorsModule } from '../professors/professors.module';
import { StudentProfileModule } from '../student-profile/student-profile.module';
import { ScholarshipsModule } from '../scholarships/scholarships.module';
import { PaginationService } from '../../shared/pagination/pagination.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    CreditsModule,
    QueuesModule,
    ProfessorsModule,
    StudentProfileModule,
    ScholarshipsModule,
    BillingModule,
    JwtModule.registerAsync({ inject: [ConfigService], useFactory: (c: ConfigService) => ({ secret: c.get('JWT_SECRET', 'dev-secret') }) }),
  ],
  controllers: [AiController, MatchesController, AdminMatchesController],
  providers: [AiService, MatchEngineService, PaginationService],
  exports: [AiService, MatchEngineService],
})
export class AiModule {}
