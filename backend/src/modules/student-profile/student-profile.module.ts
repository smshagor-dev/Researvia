import { Module } from '@nestjs/common';
import { StudentProfileController } from './student-profile.controller';
import { StudentProfileService } from './student-profile.service';
import { StorageModule } from '../storage/storage.module';
import { EmailAccountsModule } from '../email-accounts/email-accounts.module';
import { StudentAccessGuard } from './student-access.guard';
import { QueuesModule } from '../../queues/queues.module';

@Module({
  imports: [StorageModule, EmailAccountsModule, QueuesModule],
  controllers: [StudentProfileController],
  providers: [StudentProfileService, StudentAccessGuard],
  exports: [StudentProfileService],
})
export class StudentProfileModule {}
