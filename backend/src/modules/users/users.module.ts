import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { StorageModule } from '../storage/storage.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailAccountsModule } from '../email-accounts/email-accounts.module';
import { StudentProfileModule } from '../student-profile/student-profile.module';
import { CreditsModule } from '../credits/credits.module';

@Module({
  imports: [
    StorageModule,
    EmailAccountsModule,
    StudentProfileModule,
    CreditsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({ secret: c.get('JWT_SECRET', 'dev-secret') }),
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
