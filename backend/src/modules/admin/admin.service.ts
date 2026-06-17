import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PaginationService } from '../../shared/pagination/pagination.service';
import { EmailAccountsService } from '../email-accounts/email-accounts.service';
import { MailSettingsService } from '../email-accounts/mail-settings.service';
import { StudentProfileService } from '../student-profile/student-profile.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagination: PaginationService,
    private readonly emailAccounts: EmailAccountsService,
    private readonly mailSettings: MailSettingsService,
    private readonly studentProfiles: StudentProfileService,
    private readonly systemSettings: SystemSettingsService,
  ) {}

  async getDashboardStats() {
    const today = new Date(); today.setHours(0,0,0,0);
    const [users, professors, scholarships, activeSubs, emailsSentToday, pendingVerifications] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.professor.count({ where: { status: 'active' } }),
      this.prisma.scholarship.count({ where: { isActive: true } }),
      this.prisma.subscription.count({ where: { status: 'active' } }),
      this.prisma.emailMessage.count({ where: { direction: 'outbound', sentAt: { gte: today } } }),
      this.prisma.professorEmail.count({ where: { verificationStatus: { in: ['pending','manual_review'] } } }),
    ]);
    return { users, professors, scholarships, activeSubs, emailsSentToday, pendingVerifications };
  }

  async getAuditLogs(page = 1, perPage = 50) {
    const skip = (page-1)*perPage;
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, skip, take: perPage }),
      this.prisma.auditLog.count(),
    ]);
    return { data: logs, meta: { page, perPage, total } };
  }

  async createImport(userId: string, data: any) {
    return this.prisma.import.create({ data: { userId, ...data, status: 'pending' } });
  }

  async getImports(page = 1, perPage = 20) {
    const skip = (page-1)*perPage;
    const [imports, total] = await Promise.all([
      this.prisma.import.findMany({ orderBy: { createdAt: 'desc' }, skip, take: perPage }),
      this.prisma.import.count(),
    ]);
    return { data: imports, meta: { page, perPage, total } };
  }

  async getMailboxes(page = 1, perPage = 50, filters: any = {}) {
    const skip = (page - 1) * perPage;
    const where: any = {};
    if (filters.type) where.type = filters.type;
    if (filters.status) where.mailboxStatus = filters.status;
    if (filters.userId) where.userId = filters.userId;

    const [data, total] = await Promise.all([
      this.prisma.emailAccount.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          type: true,
          provider: true,
          label: true,
          email: true,
          smtpHost: true,
          smtpPort: true,
          smtpSecure: true,
          imapHost: true,
          imapPort: true,
          imapSecure: true,
          isSystemManaged: true,
          isEditable: true,
          mailboxStatus: true,
          isDefault: true,
          isActive: true,
          lastSyncAt: true,
          lastTestedAt: true,
          lastTestStatus: true,
          createdAt: true,
          user: { select: { id: true, email: true, fullName: true, status: true } },
        },
      }),
      this.prisma.emailAccount.count({ where }),
    ]);
    return { data, meta: { page, perPage, total } };
  }

  async getMailboxStats() {
    const [total, active, failed, suspended, sentToday, repliesToday] = await Promise.all([
      this.prisma.emailAccount.count(),
      this.prisma.emailAccount.count({ where: { isActive: true, mailboxStatus: 'active' } }),
      this.prisma.emailAccount.count({ where: { mailboxStatus: 'failed' } }),
      this.prisma.emailAccount.count({ where: { mailboxStatus: 'suspended' } }),
      this.prisma.emailMessage.count({ where: { direction: 'outbound', sentAt: { gte: this.startOfToday() } } }),
      this.prisma.emailMessage.count({ where: { direction: 'inbound', createdAt: { gte: this.startOfToday() } } }),
    ]);
    return { total, active, failed, suspended, sentToday, repliesToday };
  }

  async adminSuspendMailbox(accountId: string) {
    const account = await this.prisma.emailAccount.findUnique({ where: { id: accountId } });
    if (!account) return null;
    if (account.type === 'SYSTEM') return this.emailAccounts.suspendSystemMailbox(account.userId, account.id);
    return this.prisma.emailAccount.update({
      where: { id: accountId },
      data: { isActive: false, mailboxStatus: 'suspended' },
    });
  }

  async adminResetMailboxPassword(accountId: string) {
    const account = await this.prisma.emailAccount.findUnique({ where: { id: accountId } });
    if (!account) return null;
    if (account.type !== 'SYSTEM') {
      throw new BadRequestException('Only system mailboxes can be reset by admin');
    }
    return this.emailAccounts.resetSystemMailboxPassword(account.userId, account.id);
  }

  async getMailSettings() {
    return this.mailSettings.getPublicSettings();
  }

  async updateMailSettings(data: any) {
    await this.mailSettings.updateSettings(data);
    return this.mailSettings.getPublicSettings();
  }

  async getSystemSettings(prefix?: string) {
    return this.systemSettings.getAllResolved(prefix);
  }

  async updateSystemSettings(data: { items?: Array<{ key: string; value: unknown; description?: string | null }> }) {
    return this.systemSettings.setMany(data.items || []);
  }

  async deleteSystemSetting(key: string) {
    return this.systemSettings.remove(key);
  }

  async getStudents(page = 1, perPage = 20, search?: string) {
    return this.studentProfiles.getStudents(page, perPage, search);
  }

  async getStudent(userId: string) {
    return this.studentProfiles.getStudentByUserId(userId);
  }

  async writeAuditLog(actorId: string, actorType: any, action: string, entityType?: string, entityId?: string, oldValues?: any, newValues?: any, ip?: string) {
    return this.prisma.auditLog.create({ data: { actorId, actorType, action, entityType, entityId, oldValues, newValues, ipAddress: ip } });
  }

  private startOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }
}
