import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EmailAccountsService } from './email-accounts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Email Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('email-accounts')
export class EmailAccountsController {
  constructor(private readonly emailAccountsService: EmailAccountsService) {}

  @Get()
  async getAccounts(@CurrentUser('id') userId: string) {
    return this.emailAccountsService.getEmailAccounts(userId);
  }

  @Post('custom')
  async createCustom(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.emailAccountsService.createCustomAccount(userId, body);
  }

  @Post('gmail')
  async createGmail(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.emailAccountsService.createGmailAccount(userId, body);
  }

  @Patch(':id')
  async updateAccount(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() body: any) {
    return this.emailAccountsService.updateEmailAccount(userId, id, body);
  }

  @Delete(':id')
  async deleteAccount(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.emailAccountsService.deleteEmailAccount(userId, id);
  }

  @Post(':id/set-default')
  @HttpCode(HttpStatus.OK)
  async setDefaultAccount(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.emailAccountsService.setDefaultEmailAccount(userId, id);
  }

  @Post(':id/test-connection')
  @HttpCode(HttpStatus.OK)
  async testConnection(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.emailAccountsService.testConnection(userId, id);
  }

  @Get('smtp')
  async getSmtp(@CurrentUser('id') userId: string) {
    return this.emailAccountsService.getSmtpAccounts(userId);
  }

  @Post('smtp')
  async createSmtp(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.emailAccountsService.createSmtp(userId, body);
  }

  @Patch('smtp/:id')
  async updateSmtp(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() body: any) {
    return this.emailAccountsService.updateSmtp(userId, id, body);
  }

  @Delete('smtp/:id')
  async deleteSmtp(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.emailAccountsService.deleteSmtp(userId, id);
  }

  @Post('smtp/:id/verify')
  @HttpCode(HttpStatus.OK)
  async verifySmtp(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.emailAccountsService.verifySmtp(userId, id);
  }

  @Post('smtp/:id/set-default')
  @HttpCode(HttpStatus.OK)
  async setDefault(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.emailAccountsService.setDefaultSmtp(userId, id);
  }

  @Get('oauth')
  async getOAuth(@CurrentUser('id') userId: string) {
    return this.emailAccountsService.getOAuthAccounts(userId);
  }

  @Patch('oauth/:id')
  async updateOAuth(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() body: any) {
    return this.emailAccountsService.updateOAuthSettings(userId, id, body);
  }

  @Delete('oauth/:id')
  async disconnectOAuth(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.emailAccountsService.disconnectOAuth(userId, id);
  }
}
