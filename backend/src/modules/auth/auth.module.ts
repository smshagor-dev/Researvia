import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EncryptionModule } from '../../shared/encryption/encryption.module';
import { EmailAccountsModule } from '../email-accounts/email-accounts.module';
import { StudentProfileModule } from '../student-profile/student-profile.module';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-secret-change-in-production'),
        signOptions: { expiresIn: config.get<StringValue>('JWT_ACCESS_EXPIRES', '15m') },
      }),
    }),
    EncryptionModule,
    EmailAccountsModule,
    StudentProfileModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
