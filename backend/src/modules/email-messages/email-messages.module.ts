import { Module } from '@nestjs/common';
import { EmailMessagesController, TrackingController } from './email-messages.controller';
import { EmailMessagesService } from './email-messages.service';
import { EmailAccountsModule } from '../email-accounts/email-accounts.module';
import { QueuesModule } from '../../queues/queues.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    EmailAccountsModule,
    QueuesModule,
    JwtModule.registerAsync({ inject: [ConfigService], useFactory: (c: ConfigService) => ({ secret: c.get('JWT_SECRET', 'dev-secret') }) }),
  ],
  controllers: [EmailMessagesController, TrackingController],
  providers: [EmailMessagesService],
  exports: [EmailMessagesService],
})
export class EmailMessagesModule {}
