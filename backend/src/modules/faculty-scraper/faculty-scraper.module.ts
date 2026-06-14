import { Module } from '@nestjs/common';
import { FacultyScraperService } from './faculty-scraper.service';
import { QueuesModule } from '../../queues/queues.module';
import { SyncLogsModule } from '../sync-logs/sync-logs.module';

@Module({
  imports: [QueuesModule, SyncLogsModule],
  providers: [FacultyScraperService],
  exports: [FacultyScraperService],
})
export class FacultyScraperModule {}

