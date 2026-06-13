import { Module } from '@nestjs/common';
import { ProfessorEmailsService } from './professor-emails.service';
import { ProfessorEmailsController, ProfessorEmailsAdminController } from './professor-emails.controller';
import { JwtModule } from '@nestjs/jwt'; import { ConfigService } from '@nestjs/config';
@Module({
  imports: [JwtModule.registerAsync({ inject:[ConfigService], useFactory:(c:ConfigService)=>({secret:c.get('JWT_SECRET','dev-secret')}) })],
  controllers: [ProfessorEmailsController, ProfessorEmailsAdminController],
  providers: [ProfessorEmailsService],
  exports: [ProfessorEmailsService],
})
export class ProfessorEmailsModule {}
