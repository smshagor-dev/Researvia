import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { EncryptionService } from '../../shared/encryption/encryption.service';

@Injectable()
export class MailSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async getSettings() {
    const settings = await this.prisma.mailSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: {
        id: 'default',
        systemMailDomain: 'researvia.com',
        systemSmtpHost: 'mail.researvia.com',
        systemSmtpPort: 465,
        systemImapHost: 'mail.researvia.com',
        systemImapPort: 993,
        systemMailboxQuotaMb: 1024,
        trackingBaseUrl: 'http://localhost:3001',
      },
    });

    return {
      ...settings,
      cpanelApiToken: settings.encryptedCpanelApiToken
        ? this.encryption.decrypt(settings.encryptedCpanelApiToken)
        : null,
    };
  }

  async getPublicSettings() {
    const settings = await this.getSettings();
    const { encryptedCpanelApiToken, cpanelApiToken, ...safe } = settings;
    return {
      ...safe,
      hasCpanelApiToken: Boolean(cpanelApiToken),
    };
  }

  async updateSettings(data: any) {
    const updateData: any = { ...data };
    if (typeof data.cpanelApiToken === 'string') {
      updateData.encryptedCpanelApiToken = data.cpanelApiToken
        ? this.encryption.encrypt(data.cpanelApiToken)
        : null;
      delete updateData.cpanelApiToken;
    }
    for (const key of ['systemSmtpPort', 'systemImapPort', 'systemMailboxQuotaMb', 'emailSendConcurrency', 'mailboxSyncConcurrency']) {
      if (updateData[key] !== undefined && updateData[key] !== '') {
        updateData[key] = Number(updateData[key]);
      }
    }
    for (const key of ['mailboxProvisionRequired', 'emailQueuesEnabled', 'emailSendAsync']) {
      if (typeof updateData[key] === 'string') {
        updateData[key] = updateData[key] === 'true';
      }
    }

    return this.prisma.mailSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        systemMailDomain: updateData.systemMailDomain || 'researvia.com',
        systemSmtpHost: updateData.systemSmtpHost || 'mail.researvia.com',
        systemSmtpPort: Number(updateData.systemSmtpPort || 465),
        systemImapHost: updateData.systemImapHost || 'mail.researvia.com',
        systemImapPort: Number(updateData.systemImapPort || 993),
        systemMailboxQuotaMb: Number(updateData.systemMailboxQuotaMb || 1024),
        trackingBaseUrl: updateData.trackingBaseUrl || 'http://localhost:3001',
        ...updateData,
      },
      update: updateData,
    });
  }
}
