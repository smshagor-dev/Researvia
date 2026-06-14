import { Module } from '@nestjs/common';
import { ProfessorEmailsService } from './professor-emails.service';
import { ProfessorEmailsAdminController, ProfessorEmailsProfessorController } from './professor-emails.controller';
import { JwtModule } from '@nestjs/jwt'; import { ConfigService } from '@nestjs/config';
import { FacultyScraperModule } from '../faculty-scraper/faculty-scraper.module';
import { SyncLogsModule } from '../sync-logs/sync-logs.module';
import { QueuesModule } from '../../queues/queues.module';
@Module({
  imports: [
    FacultyScraperModule,
    SyncLogsModule,
    QueuesModule,
    JwtModule.registerAsync({ inject:[ConfigService], useFactory:(c:ConfigService)=>({secret:c.get('JWT_SECRET','dev-secret')}) }),
  ],
  controllers: [ProfessorEmailsAdminController, ProfessorEmailsProfessorController],
  providers: [ProfessorEmailsService],
  exports: [ProfessorEmailsService],
})
export class ProfessorEmailsModule {}
