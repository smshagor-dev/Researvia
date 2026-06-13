import { Module } from '@nestjs/common';
import { ResearchAreasService } from './research-areas.service';
import { ResearchAreasController } from './research-areas.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
@Module({
  imports: [JwtModule.registerAsync({ inject:[ConfigService], useFactory:(c:ConfigService)=>({secret:c.get('JWT_SECRET','dev-secret')}) })],
  controllers: [ResearchAreasController],
  providers: [ResearchAreasService],
  exports: [ResearchAreasService],
})
export class ResearchAreasModule {}
