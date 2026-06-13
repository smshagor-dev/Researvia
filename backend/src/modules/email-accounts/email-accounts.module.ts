import { Module } from '@nestjs/common';
import { EmailAccountsController } from './email-accounts.controller';
import { EmailAccountsService } from './email-accounts.service';
import { CpanelMailboxService } from './cpanel-mailbox.service';
import { MailSettingsService } from './mail-settings.service';
import { EncryptionModule } from '../../shared/encryption/encryption.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    EncryptionModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({ secret: c.get('JWT_SECRET', 'dev-secret') }),
    }),
  ],
  controllers: [EmailAccountsController],
  providers: [EmailAccountsService, CpanelMailboxService, MailSettingsService],
  exports: [EmailAccountsService, MailSettingsService],
})
export class EmailAccountsModule {}
