import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PaginationService } from '../../shared/pagination/pagination.service';
import { EmailAccountsService } from '../email-accounts/email-accounts.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EmailThreadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagination: PaginationService,
    private readonly emailAccounts: EmailAccountsService,
  ) {}

  async findAll(userId: string, filters: any) {
    const page = this.pagination.clampPage(filters.page || 1);
    const perPage = this.pagination.clampPerPage(filters.perPage || 20);
    const skip = this.pagination.getSkip(page, perPage);

    const where: any = { userId };
    if (filters.status) where.status = filters.status;
    if (filters.professorId) where.professorId = filters.professorId;
    if (filters.accountType) where.accountType = filters.accountType;

    const [threads, total] = await Promise.all([
      this.prisma.emailThread.findMany({
        where, skip, take: perPage,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          professor: {
            select: {
              id: true, fullName: true, avatarUrl: true,
              university: { select: { name: true } },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { bodyText: true, status: true, direction: true, createdAt: true },
          },
        },
      }),
      this.prisma.emailThread.count({ where }),
    ]);

    return this.pagination.paginate(threads, total, page, perPage);
  }

  async findOne(threadId: string, userId: string) {
    const thread = await this.prisma.emailThread.findFirst({
      where: { id: threadId, userId },
      include: {
        professor: { include: { university: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { attachments: true },
        },
      },
    });
    if (!thread) throw new NotFoundException('Thread not found');
    return thread;
  }

  async create(userId: string, data: any) {
    const account = data.accountId
      ? await this.emailAccounts.getDecryptedEmailAccount(data.accountId)
      : await this.emailAccounts.getDefaultSendAccount(userId);

    if (account.userId !== userId) {
      throw new ForbiddenException('You do not have access to this email account');
    }
    if (!account.isActive || account.mailboxStatus !== 'active') {
      throw new ForbiddenException('Selected email account is not active');
    }

    const thread = await this.prisma.emailThread.create({
      data: {
        userId,
        subject: data.subject,
        professorId: data.professorId,
        accountType: account.type === 'SYSTEM' ? 'system' : 'custom',
        accountId: account.id,
        status: 'draft',
      },
      include: { professor: true },
    });
    return thread;
  }

  async update(threadId: string, userId: string, data: any) {
    const thread = await this.prisma.emailThread.findFirst({ where: { id: threadId, userId } });
    if (!thread) throw new NotFoundException('Thread not found');
    return this.prisma.emailThread.update({ where: { id: threadId }, data });
  }

  async delete(threadId: string, userId: string) {
    const thread = await this.prisma.emailThread.findFirst({ where: { id: threadId, userId } });
    if (!thread) throw new NotFoundException('Thread not found');
    await this.prisma.emailThread.delete({ where: { id: threadId } });
    return { success: true };
  }

  async getStats(userId: string) {
    const [total, sent, replied, bounced, draft] = await Promise.all([
      this.prisma.emailThread.count({ where: { userId } }),
      this.prisma.emailThread.count({ where: { userId, status: 'sent' } }),
      this.prisma.emailThread.count({ where: { userId, status: 'replied' } }),
      this.prisma.emailThread.count({ where: { userId, status: 'bounced' } }),
      this.prisma.emailThread.count({ where: { userId, status: 'draft' } }),
    ]);
    return { total, sent, replied, bounced, draft };
  }
}
