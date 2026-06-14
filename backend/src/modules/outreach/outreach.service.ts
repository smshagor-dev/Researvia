import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PaginationService } from '../../shared/pagination/pagination.service';
import { EmailMessagesService } from '../email-messages/email-messages.service';
import { EmailAccountsService } from '../email-accounts/email-accounts.service';
import { EmailQueueService } from '../../queues/email-queue.service';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_SEQUENCE = [
  { stage: 'contacted', dayOffset: 0, label: 'Initial Outreach' },
  { stage: 'followup1', dayOffset: 7, label: 'Follow-up 1' },
  { stage: 'followup2', dayOffset: 14, label: 'Follow-up 2' },
  { stage: 'followup3', dayOffset: 21, label: 'Follow-up 3' },
];

const STAGE_ORDER = ['contacted', 'followup1', 'followup2', 'followup3'];

@Injectable()
export class OutreachService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagination: PaginationService,
    private readonly messages: EmailMessagesService,
    private readonly accounts: EmailAccountsService,
    private readonly queue: EmailQueueService,
  ) {}

  async generateEmail(userId: string, data: any) {
    const professor = await this.getProfessor(data.professorId);
    const [student, match] = await Promise.all([
      this.prisma.studentProfile.findUnique({
        where: { userId },
        include: { researchInterest: true, educations: { orderBy: { sortOrder: 'asc' }, take: 1 }, skills: { take: 8 } },
      }),
      this.prisma.matchScore.findUnique({ where: { userId_targetType_targetId: { userId, targetType: 'professor', targetId: data.professorId } } }).catch(() => null),
    ]);

    const template = data.template || 'initial';
    const researchAreas = professor.researchAreas?.map((item: any) => item.researchArea?.name).filter(Boolean).slice(0, 4).join(', ');
    const studentArea = student?.researchInterest?.primaryArea || 'your research area';
    const degree = student?.educations?.[0]?.degreeLevel || 'graduate';
    const strengths = student?.skills?.map((skill: any) => skill.name).slice(0, 4).join(', ') || 'research experience';
    const scoreText = match?.score ? `Your match score is ${match.score}/100, which suggests a strong academic fit.` : '';

    const subject = template === 'initial'
      ? `Prospective research opportunity in ${studentArea}`
      : `Following up on research fit with your group`;

    const body = [
      `Dear Professor ${professor.lastName || professor.fullName},`,
      '',
      template === 'initial'
        ? `I am ${student?.fullName || 'a prospective student'} with a ${degree} background, writing to ask whether you may be accepting students or collaborators.`
        : `I wanted to follow up on my previous note about possible research alignment with your group.`,
      `My interests focus on ${studentArea}, and your work${researchAreas ? ` in ${researchAreas}` : ''} closely matches the direction I hope to pursue.`,
      `I can contribute strengths in ${strengths}. ${scoreText}`.trim(),
      'If there may be a fit, I would be grateful for the chance to share my CV and briefly discuss potential opportunities.',
      '',
      `Sincerely,`,
      student?.fullName || 'Your student',
    ].join('\n');

    return {
      subject,
      intro: body.split('\n')[2],
      researchAlignment: researchAreas || studentArea,
      whyProfessor: `Your work aligns with ${studentArea}.`,
      studentStrengths: strengths,
      cta: 'Share CV and discuss opportunities',
      body,
    };
  }

  async sendApprovedEmail(userId: string, data: any) {
    if (!data.professorId) throw new BadRequestException('professorId is required');
    if (!data.subject || !data.body) throw new BadRequestException('subject and body are required');

    const professor = await this.getProfessor(data.professorId);
    const recipient = data.toEmail || professor.emails?.find((email: any) => email.isPrimary)?.email || professor.emails?.[0]?.email;
    if (!recipient) throw new BadRequestException('Professor has no verified email address');

    await this.assertCanSend(userId, data.professorId);
    const account = data.accountId
      ? await this.accounts.getDecryptedEmailAccount(data.accountId)
      : await this.accounts.getDefaultSendAccount(userId);
    if (account.userId !== userId) throw new ForbiddenException('Email account does not belong to user');

    const sequence = await this.ensureDefaultSequence(userId);
    const thread = await this.prisma.emailThread.upsert({
      where: { userId_professorId: { userId, professorId: data.professorId } },
      create: {
        userId,
        professorId: data.professorId,
        subject: data.subject,
        accountType: account.type === 'SYSTEM' ? 'system' : 'custom',
        accountId: account.id,
        status: 'active',
        currentStage: 'contacted',
        followupSequenceId: sequence.id,
      },
      update: {
        subject: data.subject,
        accountId: account.id,
        accountType: account.type === 'SYSTEM' ? 'system' : 'custom',
        status: 'active',
        currentStage: 'contacted',
        pausedAt: null,
        followupSequenceId: sequence.id,
      },
    });

    const message = await this.messages.createMessage(thread.id, userId, {
      toEmails: [recipient],
      subject: data.subject,
      body: data.body,
      bodyText: data.body,
      bodyHtml: this.toHtml(data.body),
      trackingToken: uuidv4(),
    });

    await this.prisma.$transaction([
      this.prisma.outreachDailyCounter.upsert({
        where: { userId_sendDate: { userId, sendDate: this.today() } },
        create: { userId, professorId: data.professorId, sendDate: this.today(), sentCount: 1 },
        update: { sentCount: { increment: 1 } },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: userId,
          actorType: 'user',
          action: 'outreach.send_approved',
          entityType: 'email_thread',
          entityId: thread.id,
          newValues: { professorId: data.professorId, messageId: message.id },
        },
      }),
    ]);

    await this.scheduleFollowups(thread.id, sequence.id);
    return { threadId: thread.id, messageId: message.id, queued: message.status === 'queued' };
  }

  async processFollowup(threadId: string, stage: string) {
    const thread = await this.prisma.emailThread.findUnique({ where: { id: threadId }, include: { professor: { include: { emails: true } } } });
    if (!thread || thread.replyReceived || thread.pausedAt || thread.status === 'archived') return { skipped: true };
    if (!STAGE_ORDER.includes(stage)) return { skipped: true };

    const recipient = thread.professor?.emails?.find((email: any) => email.isPrimary)?.email || thread.professor?.emails?.[0]?.email;
    if (!recipient) return { skipped: true };
    await this.assertCanSend(thread.userId, thread.professorId || undefined);

    const generated = await this.generateEmail(thread.userId, { professorId: thread.professorId, template: stage });
    const message = await this.messages.createMessage(thread.id, thread.userId, {
      toEmails: [recipient],
      subject: generated.subject,
      body: generated.body,
      bodyText: generated.body,
      bodyHtml: this.toHtml(generated.body),
      trackingToken: uuidv4(),
    });

    await this.prisma.emailThread.update({
      where: { id: thread.id },
      data: { currentStage: stage as any, lastFollowupAt: new Date(), sentCount: { increment: 1 } },
    });

    return { skipped: false, messageId: message.id };
  }

  async pauseThread(userId: string, threadId: string) {
    await this.requireThread(userId, threadId);
    return this.prisma.emailThread.update({ where: { id: threadId }, data: { pausedAt: new Date(), status: 'archived' } });
  }

  async resumeThread(userId: string, threadId: string) {
    const thread = await this.requireThread(userId, threadId);
    const sequence = thread.followupSequenceId ? { id: thread.followupSequenceId } : await this.ensureDefaultSequence(userId);
    const updated = await this.prisma.emailThread.update({ where: { id: threadId }, data: { pausedAt: null, status: 'active', followupSequenceId: sequence.id } });
    await this.scheduleFollowups(threadId, sequence.id);
    return updated;
  }

  async updateStage(userId: string, threadId: string, stage: string) {
    await this.requireThread(userId, threadId);
    return this.prisma.emailThread.update({ where: { id: threadId }, data: { currentStage: stage as any } });
  }

  async getThreads(userId: string, filters: any) {
    const page = this.pagination.clampPage(filters.page || 1);
    const perPage = this.pagination.clampPerPage(filters.perPage || 50);
    const where: any = { userId };
    if (filters.status) where.status = filters.status;
    if (filters.stage) where.currentStage = filters.stage;
    const [threads, total] = await Promise.all([
      this.prisma.emailThread.findMany({
        where,
        skip: this.pagination.getSkip(page, perPage),
        take: perPage,
        orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
        include: {
          professor: { include: { university: { include: { country: true } } } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.emailThread.count({ where }),
    ]);
    return this.pagination.paginate(threads, total, page, perPage);
  }

  async getThread(userId: string, threadId: string) {
    const thread = await this.prisma.emailThread.findFirst({
      where: { id: threadId, userId },
      include: {
        professor: { include: { university: { include: { country: true } }, researchAreas: { include: { researchArea: true } } } },
        messages: { orderBy: { createdAt: 'asc' }, include: { tracking: true } },
      },
    });
    if (!thread) throw new NotFoundException('Thread not found');
    return thread;
  }

  async getAnalytics(userId: string) {
    return this.buildAnalytics({ userId });
  }

  async getAdminAnalytics() {
    return this.buildAnalytics({});
  }

  private async buildAnalytics(where: any) {
    const [sent, opened, replied, accepted, failed, threads] = await Promise.all([
      this.prisma.emailMessage.count({ where: { ...where, direction: 'outbound', status: { in: ['sent', 'delivered', 'opened', 'clicked', 'replied'] } } }),
      this.prisma.emailMessage.count({ where: { ...where, openCount: { gt: 0 } } }),
      this.prisma.emailThread.count({ where: { ...where, replyReceived: true } }),
      this.prisma.emailThread.count({ where: { ...where, status: 'accepted' } }),
      this.prisma.emailMessage.count({ where: { ...where, status: 'failed' } }),
      this.prisma.emailThread.count({ where }),
    ]);
    const openRate = sent ? Math.round((opened / sent) * 1000) / 10 : 0;
    const replyRate = threads ? Math.round((replied / threads) * 1000) / 10 : 0;
    const acceptanceRate = threads ? Math.round((accepted / threads) * 1000) / 10 : 0;
    return { emailsSent: sent, openRate, replyRate, acceptanceRate, failedSends: failed, followupPerformance: await this.getFollowupPerformance(where) };
  }

  private async getFollowupPerformance(where: any) {
    const stages = ['contacted', 'followup1', 'followup2', 'followup3'];
    return Promise.all(stages.map(async (stage) => ({
      stage,
      threads: await this.prisma.emailThread.count({ where: { ...where, currentStage: stage } }),
      replies: await this.prisma.emailThread.count({ where: { ...where, currentStage: stage, replyReceived: true } }),
    })));
  }

  private async assertCanSend(userId: string, professorId?: string) {
    if (professorId) {
      const duplicate = await this.prisma.emailThread.findFirst({
        where: { userId, professorId, status: { notIn: ['draft', 'archived'] } },
      });
      if (duplicate) throw new BadRequestException('Outreach to this professor already exists');
    }

    const limit = await this.getDailyLimit(userId);
    const counter = await this.prisma.outreachDailyCounter.findUnique({ where: { userId_sendDate: { userId, sendDate: this.today() } } });
    if ((counter?.sentCount || 0) >= limit) throw new ForbiddenException(`Daily sending limit reached (${limit})`);
  }

  private async getDailyLimit(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['trialing', 'active'] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    return subscription?.plan?.emailSendsPerDay || 5;
  }

  private async ensureDefaultSequence(userId: string) {
    const existing = await this.prisma.followupSequence.findUnique({ where: { userId_name: { userId, name: 'Default Academic Outreach' } } });
    if (existing) return existing;
    return this.prisma.followupSequence.create({
      data: {
        userId,
        name: 'Default Academic Outreach',
        enabled: true,
        steps: {
          create: DEFAULT_SEQUENCE.map((step, index) => ({
            stage: step.stage as any,
            dayOffset: step.dayOffset,
            sortOrder: index,
            template: step.label,
          })),
        },
      },
    });
  }

  private async scheduleFollowups(threadId: string, sequenceId: string) {
    const steps = await this.prisma.followupStep.findMany({ where: { sequenceId, dayOffset: { gt: 0 } }, orderBy: { dayOffset: 'asc' } });
    const now = Date.now();
    await Promise.all(steps.map((step: any) => this.queue.enqueueFollowup(threadId, new Date(now + step.dayOffset * 24 * 60 * 60 * 1000), step.stage).catch(() => null)));
  }

  private async requireThread(userId: string, threadId: string) {
    const thread = await this.prisma.emailThread.findFirst({ where: { id: threadId, userId } });
    if (!thread) throw new NotFoundException('Thread not found');
    return thread;
  }

  private async getProfessor(professorId: string) {
    const professor = await this.prisma.professor.findUnique({
      where: { id: professorId },
      include: { emails: { where: { isVerified: true } }, university: true, researchAreas: { include: { researchArea: true } } },
    });
    if (!professor) throw new NotFoundException('Professor not found');
    return professor;
  }

  private toHtml(body: string) {
    return body.split('\n').map((line) => line.trim() ? `<p>${this.escapeHtml(line)}</p>` : '<br />').join('');
  }

  private escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char] || char));
  }

  private today() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
}
