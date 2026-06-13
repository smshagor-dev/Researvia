import { Module } from '@nestjs/common';
import { PublicationsService } from './publications.service';
import { PublicationsController } from './publications.controller';
import { JwtModule } from '@nestjs/jwt'; import { ConfigService } from '@nestjs/config';
@Module({
  imports: [JwtModule.registerAsync({ inject:[ConfigService], useFactory:(c:ConfigService)=>({secret:c.get('JWT_SECRET','dev-secret')}) })],
  controllers: [PublicationsController], providers: [PublicationsService], exports: [PublicationsService],
})
export class PublicationsModule {}
