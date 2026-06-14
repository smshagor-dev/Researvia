import { Module } from '@nestjs/common';
import { AdminProfessorsController } from './admin-professors.controller';
import { AdminProfessorSyncController } from './admin-professor-sync.controller';
import { AdminProfessorsService } from './admin-professors.service';
import { PaginationService } from '../../shared/pagination/pagination.service';
import { AdminModule } from '../admin/admin.module';
import { ProfessorSyncModule } from '../professor-sync/professor-sync.module';

@Module({
  imports: [AdminModule, ProfessorSyncModule],
  controllers: [AdminProfessorsController, AdminProfessorSyncController],
  providers: [AdminProfessorsService, PaginationService],
})
export class AdminProfessorsModule {}
