import { Module } from '@nestjs/common';
import { EmailThreadsController } from './email-threads.controller';
import { EmailThreadsService } from './email-threads.service';
import { PaginationService } from '../../shared/pagination/pagination.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailAccountsModule } from '../email-accounts/email-accounts.module';

@Module({
  imports: [
    EmailAccountsModule,
    JwtModule.registerAsync({ inject: [ConfigService], useFactory: (c: ConfigService) => ({ secret: c.get('JWT_SECRET', 'dev-secret') }) }),
  ],
  controllers: [EmailThreadsController],
  providers: [EmailThreadsService, PaginationService],
  exports: [EmailThreadsService],
})
export class EmailThreadsModule {}
