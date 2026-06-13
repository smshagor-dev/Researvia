import { Module } from '@nestjs/common';
import { StudentProfileController } from './student-profile.controller';
import { StudentProfileService } from './student-profile.service';
import { StorageModule } from '../storage/storage.module';
import { EmailAccountsModule } from '../email-accounts/email-accounts.module';

@Module({
  imports: [StorageModule, EmailAccountsModule],
  controllers: [StudentProfileController],
  providers: [StudentProfileService],
  exports: [StudentProfileService],
})
export class StudentProfileModule {}
