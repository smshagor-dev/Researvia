import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { EncryptionService } from '../../shared/encryption/encryption.service';
import { CpanelMailboxService } from './cpanel-mailbox.service';
import { MailSettingsService } from './mail-settings.service';

const imaps = require('imap-simple');

@Injectable()
export class EmailAccountsService {
  private readonly logger = new Logger(EmailAccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly config: ConfigService,
    private readonly cpanel: CpanelMailboxService,
    private readonly mailSettings: MailSettingsService,
  ) {}

  async provisionSystemMailboxForUser(user: { id: string; fullName: string; email: string }) {
    const existing = await this.prisma.emailAccount.findFirst({
      where: { userId: user.id, type: 'SYSTEM' },
    });
    if (existing) return this.sanitizeAccount(existing);

    const settings = await this.mailSettings.getSettings();
    const domain = settings.systemMailDomain;
    const localPart = await this.generateAvailableMailboxLocalPart(user.fullName || user.email);
    const mailboxEmail = `${localPart}@${domain}`;
    const password = this.generateMailboxPassword();

    const account = await this.prisma.emailAccount.create({
      data: {
        userId: user.id,
        type: 'SYSTEM',
        provider: 'SYSTEM',
        label: 'System Mailbox',
        email: mailboxEmail,
        smtpHost: settings.systemSmtpHost,
        smtpPort: settings.systemSmtpPort,
        smtpSecure: true,
        smtpUsername: mailboxEmail,
        encryptedSmtpPassword: this.encryption.encrypt(password),
        imapHost: settings.systemImapHost,
        imapPort: settings.systemImapPort,
        imapSecure: true,
        imapUsername: mailboxEmail,
        encryptedImapPassword: this.encryption.encrypt(password),
        isSystemManaged: true,
        isEditable: false,
        mailboxStatus: 'pending',
        isDefault: true,
        isActive: false,
      },
    });

    try {
      await this.cpanel.createMailbox(localPart, password, settings.systemMailboxQuotaMb);
      const activated = await this.prisma.emailAccount.update({
        where: { id: account.id },
        data: { mailboxStatus: 'active', isActive: true },
      });
      return this.sanitizeAccount(activated);
    } catch (error: any) {
      this.logger.error(`System mailbox provisioning failed for ${this.maskEmail(mailboxEmail)}: ${error.message}`);
      const failed = await this.prisma.emailAccount.update({
        where: { id: account.id },
        data: { mailboxStatus: 'failed', isActive: false },
      });

      if (settings.mailboxProvisionRequired) {
        throw error;
      }

      return this.sanitizeAccount(failed);
    }
  }

  async getEmailAccounts(userId: string) {
    const accounts = await this.prisma.emailAccount.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return accounts.map((account) => this.sanitizeAccount(account));
  }

  async createCustomAccount(userId: string, data: any) {
    const provider = this.resolveManagedProvider(data.provider);
    this.validateManagedAccountPayload(data, provider);

    const created = await this.prisma.emailAccount.create({
      data: {
        userId,
        type: 'CUSTOM',
        provider,
        label: data.label?.trim() || data.email,
        email: data.email.trim(),
        smtpHost: data.smtpHost.trim(),
        smtpPort: Number(data.smtpPort),
        smtpSecure: this.toBoolean(data.smtpSecure, true),
        smtpUsername: data.smtpUsername.trim(),
        encryptedSmtpPassword: this.encryption.encrypt(data.smtpPassword),
        imapHost: data.imapHost?.trim() || null,
        imapPort: data.imapPort ? Number(data.imapPort) : null,
        imapSecure: this.toBoolean(data.imapSecure, true),
        imapUsername: data.imapUsername?.trim() || data.smtpUsername.trim(),
        encryptedImapPassword: this.encryption.encrypt(data.imapPassword || data.smtpPassword),
        isSystemManaged: false,
        isEditable: true,
        mailboxStatus: 'active',
        isActive: this.toBoolean(data.isActive, true),
        isDefault: false,
      },
    });

    if (data.isDefault) {
      await this.setDefaultEmailAccount(userId, created.id);
      return this.getOwnedEmailAccountOrThrow(userId, created.id);
    }

    return this.sanitizeAccount(created);
  }

  async createGmailAccount(userId: string, data: any) {
    return this.createCustomAccount(userId, {
      ...data,
      provider: 'GMAIL',
      smtpHost: 'smtp.gmail.com',
      smtpPort: 465,
      smtpSecure: true,
      imapHost: 'imap.gmail.com',
      imapPort: 993,
      imapSecure: true,
      smtpUsername: data.smtpUsername || data.email,
      imapUsername: data.imapUsername || data.email,
      imapPassword: data.imapPassword || data.smtpPassword,
    });
  }

  async updateEmailAccount(userId: string, accountId: string, data: any) {
    const account = await this.requireManagedOwnedAccount(userId, accountId);
    const provider = this.resolveManagedProvider(data.provider ?? account.provider);
    this.validateManagedAccountPayload({ ...account, ...data }, provider, true);

    const updateData: any = {
      provider,
      label: data.label !== undefined ? data.label?.trim() || null : undefined,
      email: data.email !== undefined ? data.email.trim() : undefined,
      smtpHost: data.smtpHost !== undefined ? data.smtpHost.trim() : undefined,
      smtpPort: data.smtpPort !== undefined ? Number(data.smtpPort) : undefined,
      smtpSecure: data.smtpSecure !== undefined ? this.toBoolean(data.smtpSecure, true) : undefined,
      smtpUsername: data.smtpUsername !== undefined ? data.smtpUsername.trim() : undefined,
      imapHost: data.imapHost !== undefined ? data.imapHost?.trim() || null : undefined,
      imapPort: data.imapPort !== undefined ? (data.imapPort ? Number(data.imapPort) : null) : undefined,
      imapSecure: data.imapSecure !== undefined ? this.toBoolean(data.imapSecure, true) : undefined,
      imapUsername: data.imapUsername !== undefined ? data.imapUsername?.trim() || null : undefined,
      isActive: data.isActive !== undefined ? this.toBoolean(data.isActive, true) : undefined,
    };

    if (data.smtpPassword) {
      updateData.encryptedSmtpPassword = this.encryption.encrypt(data.smtpPassword);
    }
    if (data.imapPassword) {
      updateData.encryptedImapPassword = this.encryption.encrypt(data.imapPassword);
    } else if (data.imapPassword === null) {
      updateData.encryptedImapPassword = null;
    }

    const updated = await this.prisma.emailAccount.update({
      where: { id: accountId },
      data: updateData,
    });

    if (data.isDefault) {
      await this.setDefaultEmailAccount(userId, accountId);
      return this.getOwnedEmailAccountOrThrow(userId, accountId);
    }

    return this.sanitizeAccount(updated);
  }

  async deleteEmailAccount(userId: string, accountId: string) {
    await this.requireManagedOwnedAccount(userId, accountId);
    await this.prisma.emailAccount.delete({ where: { id: accountId } });
    return { success: true };
  }

  async setDefaultEmailAccount(userId: string, accountId: string) {
    const account = await this.prisma.emailAccount.findFirst({ where: { id: accountId, userId } });
    if (!account) throw new NotFoundException('Email account not found');
    if (!account.isActive || account.mailboxStatus !== 'active') {
      throw new BadRequestException('Only active email accounts can be used for sending');
    }

    await this.prisma.$transaction([
      this.prisma.emailAccount.updateMany({ where: { userId }, data: { isDefault: false } }),
      this.prisma.emailAccount.update({ where: { id: accountId }, data: { isDefault: true } }),
    ]);

    return this.getOwnedEmailAccountOrThrow(userId, accountId);
  }

  async testConnection(userId: string, accountId: string) {
    const account = await this.prisma.emailAccount.findFirst({ where: { id: accountId, userId } });
    if (!account) throw new NotFoundException('Email account not found');

    try {
      const decrypted = await this.getDecryptedEmailAccount(account.id);

      const transporter = nodemailer.createTransport({
        host: decrypted.smtpHost,
        port: decrypted.smtpPort,
        secure: decrypted.smtpSecure,
        requireTLS: !decrypted.smtpSecure,
        auth: {
          user: decrypted.smtpUsername,
          pass: decrypted.smtpPassword,
        },
        connectionTimeout: 10000,
        greetingTimeout: 5000,
      });

      await transporter.verify();

      if (decrypted.imapHost && decrypted.imapPort && decrypted.imapUsername && decrypted.imapPassword) {
        const connection = await imaps.connect({
          imap: {
            user: decrypted.imapUsername,
            password: decrypted.imapPassword,
            host: decrypted.imapHost,
            port: decrypted.imapPort,
            tls: decrypted.imapSecure,
            authTimeout: 10000,
          },
        });
        await connection.end();
      }

      const updated = await this.prisma.emailAccount.update({
        where: { id: account.id },
        data: {
          lastTestedAt: new Date(),
          lastTestStatus: 'success',
          lastTestError: null,
        },
      });

      return { success: true, account: this.sanitizeAccount(updated) };
    } catch (error: any) {
      this.logger.warn(`Email account test failed for ${this.maskEmail(account.email)}: ${error.message}`);
      const updated = await this.prisma.emailAccount.update({
        where: { id: account.id },
        data: {
          lastTestedAt: new Date(),
          lastTestStatus: 'failed',
          lastTestError: String(error.message || 'Connection failed').slice(0, 1000),
        },
      });

      return {
        success: false,
        error: updated.lastTestError,
        account: this.sanitizeAccount(updated),
      };
    }
  }

  async suspendSystemMailbox(userId: string, accountId: string) {
    const account = await this.prisma.emailAccount.findFirst({
      where: { id: accountId, userId, type: 'SYSTEM' },
    });
    if (!account) throw new NotFoundException('System mailbox not found');

    await this.cpanel.suspendMailbox(account.email);
    const updated = await this.prisma.emailAccount.update({
      where: { id: accountId },
      data: { mailboxStatus: 'suspended', isActive: false },
    });
    return this.sanitizeAccount(updated);
  }

  async resetSystemMailboxPassword(userId: string, accountId: string) {
    const account = await this.prisma.emailAccount.findFirst({
      where: { id: accountId, userId, type: 'SYSTEM' },
    });
    if (!account) throw new NotFoundException('System mailbox not found');

    const password = this.generateMailboxPassword();
    await this.cpanel.changePassword(account.email, password);

    const updated = await this.prisma.emailAccount.update({
      where: { id: accountId },
      data: {
        encryptedSmtpPassword: this.encryption.encrypt(password),
        encryptedImapPassword: this.encryption.encrypt(password),
        mailboxStatus: 'active',
        isActive: true,
      },
    });
    return this.sanitizeAccount(updated);
  }

  async getDefaultSendAccount(userId: string) {
    const selectedDefault = await this.prisma.emailAccount.findFirst({
      where: { userId, isDefault: true, isActive: true, mailboxStatus: 'active' },
      orderBy: { createdAt: 'asc' },
    });
    if (selectedDefault) return selectedDefault;

    const systemFallback = await this.prisma.emailAccount.findFirst({
      where: { userId, type: 'SYSTEM', isActive: true, mailboxStatus: 'active' },
      orderBy: { createdAt: 'asc' },
    });
    if (systemFallback) return systemFallback;

    throw new BadRequestException('No active email account is available for sending');
  }

  async getDecryptedEmailAccount(accountId: string) {
    const account = await this.prisma.emailAccount.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Email account not found');

    return {
      ...account,
      smtpPassword: this.encryption.decrypt(account.encryptedSmtpPassword),
      imapPassword: account.encryptedImapPassword
        ? this.encryption.decrypt(account.encryptedImapPassword)
        : null,
    };
  }

  // Legacy SMTP Accounts
  async createSmtp(userId: string, data: any) {
    const encrypted = {
      ...data,
      username: this.encryption.encrypt(data.username),
      password: this.encryption.encrypt(data.password),
      imapUsername: data.imapUsername ? this.encryption.encrypt(data.imapUsername) : undefined,
      imapPassword: data.imapPassword ? this.encryption.encrypt(data.imapPassword) : undefined,
    };
    return this.prisma.smtpAccount.create({ data: { userId, ...encrypted } });
  }

  async getSmtpAccounts(userId: string) {
    return this.prisma.smtpAccount.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        fromEmail: true,
        fromName: true,
        host: true,
        port: true,
        encryption: true,
        isVerified: true,
        isDefault: true,
        createdAt: true,
      },
    });
  }

  async updateSmtp(userId: string, accountId: string, data: any) {
    const account = await this.prisma.smtpAccount.findFirst({ where: { id: accountId, userId } });
    if (!account) throw new NotFoundException('SMTP account not found');

    const updateData: any = { ...data };
    if (data.password) updateData.password = this.encryption.encrypt(data.password);
    if (data.username) updateData.username = this.encryption.encrypt(data.username);

    return this.prisma.smtpAccount.update({ where: { id: accountId }, data: updateData });
  }

  async deleteSmtp(userId: string, accountId: string) {
    await this.prisma.smtpAccount.deleteMany({ where: { id: accountId, userId } });
    return { success: true };
  }

  async verifySmtp(userId: string, accountId: string) {
    const account = await this.prisma.smtpAccount.findFirst({ where: { id: accountId, userId } });
    if (!account) throw new NotFoundException('SMTP account not found');

    try {
      const transporter = nodemailer.createTransport({
        host: account.host,
        port: account.port,
        secure: account.encryption === 'ssl',
        requireTLS: account.encryption === 'tls',
        auth: {
          user: this.encryption.decrypt(account.username),
          pass: this.encryption.decrypt(account.password),
        },
        connectionTimeout: 10000,
        greetingTimeout: 5000,
      });

      await transporter.verify();
      await this.prisma.smtpAccount.update({
        where: { id: accountId },
        data: { isVerified: true, verifiedAt: new Date() },
      });
      return { verified: true };
    } catch (err: any) {
      return { verified: false, error: `SMTP connection failed: ${err.message}` };
    }
  }

  async setDefaultSmtp(userId: string, accountId: string) {
    await this.prisma.smtpAccount.updateMany({ where: { userId }, data: { isDefault: false } });
    await this.prisma.smtpAccount.update({ where: { id: accountId }, data: { isDefault: true } });
    return { success: true };
  }

  // Legacy OAuth Accounts
  async getOAuthAccounts(userId: string) {
    return this.prisma.oauthAccount.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        email: true,
        isEmailSendingEnabled: true,
        isInboxSyncEnabled: true,
        lastSyncedAt: true,
        createdAt: true,
      },
    });
  }

  async updateOAuthSettings(userId: string, accountId: string, data: any) {
    const account = await this.prisma.oauthAccount.findFirst({ where: { id: accountId, userId } });
    if (!account) throw new NotFoundException('OAuth account not found');
    return this.prisma.oauthAccount.update({ where: { id: accountId }, data });
  }

  async disconnectOAuth(userId: string, accountId: string) {
    await this.prisma.oauthAccount.deleteMany({ where: { id: accountId, userId } });
    return { success: true };
  }

  async getDecryptedSmtp(accountId: string) {
    const account = await this.prisma.smtpAccount.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('SMTP account not found');
    return {
      ...account,
      username: this.encryption.decrypt(account.username),
      password: this.encryption.decrypt(account.password),
      imapUsername: account.imapUsername ? this.encryption.decrypt(account.imapUsername) : null,
      imapPassword: account.imapPassword ? this.encryption.decrypt(account.imapPassword) : null,
    };
  }

  async getDecryptedOAuth(accountId: string) {
    const account = await this.prisma.oauthAccount.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('OAuth account not found');
    return {
      ...account,
      accessToken: account.accessToken ? this.encryption.decrypt(account.accessToken) : null,
      refreshToken: account.refreshToken ? this.encryption.decrypt(account.refreshToken) : null,
    };
  }

  private async getOwnedEmailAccountOrThrow(userId: string, accountId: string) {
    const account = await this.prisma.emailAccount.findFirst({ where: { id: accountId, userId } });
    if (!account) throw new NotFoundException('Email account not found');
    return this.sanitizeAccount(account);
  }

  private async requireManagedOwnedAccount(userId: string, accountId: string) {
    const account = await this.prisma.emailAccount.findFirst({ where: { id: accountId, userId } });
    if (!account) throw new NotFoundException('Email account not found');
    if (account.type !== 'CUSTOM' || account.isSystemManaged || !account.isEditable) {
      throw new BadRequestException('System mailboxes cannot be modified by users');
    }
    return account;
  }

  private sanitizeAccount(account: any) {
    const {
      encryptedSmtpPassword,
      encryptedImapPassword,
      ...safe
    } = account;

    return safe;
  }

  private validateManagedAccountPayload(data: any, provider: 'CUSTOM' | 'GMAIL' | 'OUTLOOK', isUpdate = false) {
    const required = ['email', 'smtpHost', 'smtpPort', 'smtpUsername'];
    const missing = required.filter((field) => !String(data[field] ?? '').trim());
    if (!isUpdate || data.smtpPassword) {
      if (!String(data.smtpPassword ?? '').trim()) missing.push('smtpPassword');
    }

    if (!String(data.label ?? '').trim()) missing.push('label');

    if (missing.length > 0) {
      throw new BadRequestException(`${Array.from(new Set(missing)).join(', ')} are required`);
    }

  }

  private resolveManagedProvider(provider: unknown): 'CUSTOM' | 'GMAIL' | 'OUTLOOK' {
    if (provider === 'GMAIL' || provider === 'OUTLOOK') return provider;
    return 'CUSTOM';
  }

  private toBoolean(value: unknown, defaultValue: boolean) {
    if (value === undefined || value === null || value === '') return defaultValue;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return Boolean(value);
  }

  private async generateAvailableMailboxLocalPart(seed: string) {
    const base = this.slugify(seed) || `user${Date.now()}`;
    const { systemMailDomain: domain } = await this.mailSettings.getSettings();

    for (let i = 0; i < 20; i++) {
      const candidate = i === 0 ? base : `${base}${i + 1}`;
      const email = `${candidate}@${domain}`;
      const existsInDb = await this.prisma.emailAccount.findFirst({ where: { email } });
      if (existsInDb) continue;
      try {
        const existsInCpanel = await this.cpanel.checkMailboxExists(candidate);
        if (!existsInCpanel) return candidate;
      } catch {
        return candidate;
      }
    }

    return `${base}${this.encryption.randomToken(3)}`;
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, 48);
  }

  private generateMailboxPassword() {
    return `${this.encryption.randomToken(18)}Aa1!`;
  }

  private maskEmail(email: string) {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return '***';
    const visible = localPart.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(localPart.length - 2, 1))}@${domain}`;
  }
}
