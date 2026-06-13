import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { CreditsModule } from '../credits/credits.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    CreditsModule,
    JwtModule.registerAsync({ inject: [ConfigService], useFactory: (c: ConfigService) => ({ secret: c.get('JWT_SECRET', 'dev-secret') }) }),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
