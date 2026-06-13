import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { JwtModule } from '@nestjs/jwt'; import { ConfigService } from '@nestjs/config';
@Module({
  imports: [JwtModule.registerAsync({ inject:[ConfigService], useFactory:(c:ConfigService)=>({secret:c.get('JWT_SECRET','dev-secret')}) })],
  controllers: [AnalyticsController], providers: [AnalyticsService], exports: [AnalyticsService],
})
export class AnalyticsModule {}
