import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';
import { EmailAccountsModule } from '../email-accounts/email-accounts.module';
import { StudentProfileModule } from '../student-profile/student-profile.module';
import { PaginationService } from '../../shared/pagination/pagination.service';
import { JwtModule } from '@nestjs/jwt'; import { ConfigService } from '@nestjs/config';
@Module({
  imports: [UsersModule, EmailAccountsModule, StudentProfileModule, JwtModule.registerAsync({ inject:[ConfigService], useFactory:(c:ConfigService)=>({secret:c.get('JWT_SECRET','dev-secret')}) })],
  controllers: [AdminController], providers: [AdminService, PaginationService], exports: [AdminService],
})
export class AdminModule {}
