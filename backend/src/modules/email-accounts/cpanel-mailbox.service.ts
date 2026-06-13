import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { MailSettingsService } from './mail-settings.service';

@Injectable()
export class CpanelMailboxService {
  private readonly logger = new Logger(CpanelMailboxService.name);

  constructor(private readonly mailSettings: MailSettingsService) {}

  async createMailbox(localPart: string, password: string, quotaMb = 1024) {
    this.ensureEnabled();
    const settings = await this.getCpanelSettings();
    const email = this.normalizeLocalPart(localPart);
    return this.execute(settings, 'Email', 'add_pop', {
      email,
      domain: settings.systemMailDomain,
      password,
      quota: quotaMb,
      skip_update_db: 0,
    });
  }

  async deleteMailbox(localPart: string) {
    this.ensureEnabled();
    const settings = await this.getCpanelSettings();
    return this.execute(settings, 'Email', 'delete_pop', {
      email: this.normalizeLocalPart(localPart),
      domain: settings.systemMailDomain,
    });
  }

  async changePassword(localPart: string, password: string) {
    this.ensureEnabled();
    const settings = await this.getCpanelSettings();
    return this.execute(settings, 'Email', 'passwd_pop', {
      email: this.normalizeLocalPart(localPart),
      domain: settings.systemMailDomain,
      password,
    });
  }

  async checkMailboxExists(localPart: string): Promise<boolean> {
    this.ensureEnabled();
    const settings = await this.getCpanelSettings();
    const response = await this.execute(settings, 'Email', 'list_pops', {
      domain: settings.systemMailDomain,
      regex: `^${this.normalizeLocalPart(localPart)}@${settings.systemMailDomain}$`,
    });
    return Array.isArray(response.data) && response.data.length > 0;
  }

  async suspendMailbox(localPart: string) {
    this.ensureEnabled();
    const settings = await this.getCpanelSettings();
    return this.execute(settings, 'Email', 'suspend_login', {
      email: `${this.normalizeLocalPart(localPart)}@${settings.systemMailDomain}`,
    });
  }

  private async execute(settings: any, module: string, fn: string, params: Record<string, string | number>) {
    try {
      const response = await axios.get(`${settings.cpanelBaseUrl.replace(/\/$/, '')}/execute/${module}/${fn}`, {
        params,
        timeout: 15000,
        headers: {
          Authorization: `cpanel ${settings.cpanelUsername}:${settings.cpanelApiToken}`,
        },
      });
      const body = response.data;
      if (body?.status !== 1) {
        const message = body?.errors?.join('; ') || body?.messages?.join('; ') || `${module}::${fn} failed`;
        throw new BadRequestException(message);
      }
      return body;
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`cPanel ${module}::${fn} error: ${error.message}`);
      throw new ServiceUnavailableException('cPanel mailbox API is unavailable');
    }
  }

  private ensureEnabled() {
    return true;
  }

  private async getCpanelSettings() {
    const settings = await this.mailSettings.getSettings();
    if (!settings.cpanelBaseUrl || !settings.cpanelUsername || !settings.cpanelApiToken) {
      throw new ServiceUnavailableException('cPanel mailbox API is not configured in database');
    }
    return settings;
  }

  private normalizeLocalPart(value: string) {
    const localPart = value.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (!localPart) throw new BadRequestException('Invalid mailbox username');
    return localPart;
  }
}
