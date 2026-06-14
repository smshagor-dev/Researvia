import { Injectable, NotFoundException } from '@nestjs/common';
import { EmailVerificationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ProfessorSyncQueueService } from '../queues/professor-sync-queue.service';
import { SyncLogsService } from '../sync-logs/sync-logs.service';
import { FACULTY_DISCOVERY_JOB, FACULTY_DISCOVERY_QUEUE } from '../faculty-scraper/faculty-scraper.constants';
import { toPrismaJsonValue } from '../../shared/prisma/json.util';

@Injectable()
export class ProfessorEmailsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: ProfessorSyncQueueService,
    private readonly syncLogs: SyncLogsService,
  ) {}

  async findByProfessor(professorId: string) {
    return this.prisma.professorEmail.findMany({
      where: { professorId },
      orderBy: [{ isVerified: 'desc' }, { confidenceScore: 'desc' }, { createdAt: 'desc' }],
      include: { verificationLogs: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
  }

  async enqueueFacultyEmailCollection(professorId: string, requestedBy: string) {
    const professor = await this.prisma.professor.findUnique({ where: { id: professorId }, select: { id: true } });
    if (!professor) {
      throw new NotFoundException('Professor not found');
    }

    const job = await this.queueService.enqueueFacultyDiscovery({
      professorId,
      requestedBy,
      trigger: 'admin',
    });

    await this.syncLogs.createQueuedLog({
      jobId: String(job.id),
      queueName: FACULTY_DISCOVERY_QUEUE,
      jobName: FACULTY_DISCOVERY_JOB,
      metadataJson: toPrismaJsonValue({ professorId, requestedBy }),
    });

    return { jobId: String(job.id), queueName: FACULTY_DISCOVERY_QUEUE, status: 'queued' };
  }

  async getPendingVerifications(page = 1, perPage = 20) {
    const skip = (page - 1) * perPage;
    const where: Prisma.ProfessorEmailWhereInput = {
      verificationStatus: { in: [EmailVerificationStatus.pending, EmailVerificationStatus.manual_review] },
    };
    const [items, total] = await Promise.all([
      this.prisma.professorEmail.findMany({
        where,
        skip,
        take: perPage,
        include: {
          professor: {
            select: {
              id: true,
              fullName: true,
              facultyPageUrl: true,
              university: { select: { name: true } },
            },
          },
          verificationLogs: { take: 1, orderBy: { createdAt: 'desc' } },
        },
        orderBy: [{ confidenceScore: 'desc' }, { createdAt: 'asc' }],
      }),
      this.prisma.professorEmail.count({ where }),
    ]);

    return { data: items, meta: { page, perPage, total } };
  }

  async getEmailDetail(emailId: string) {
    const email = await this.prisma.professorEmail.findUnique({
      where: { id: emailId },
      include: {
        professor: {
          select: {
            id: true,
            fullName: true,
            facultyPageUrl: true,
            university: { select: { name: true, emailDomains: true } },
          },
        },
        verificationLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!email) {
      throw new NotFoundException('Professor email not found');
    }

    return email;
  }

  approve(emailId: string, adminId: string) {
    return this.updateVerificationStatus(emailId, adminId, EmailVerificationStatus.verified);
  }

  reject(emailId: string, adminId: string, rejectReason?: string) {
    return this.updateVerificationStatus(emailId, adminId, EmailVerificationStatus.rejected, rejectReason);
  }

  requestReview(emailId: string, adminId: string) {
    return this.updateVerificationStatus(emailId, adminId, EmailVerificationStatus.manual_review);
  }

  private async updateVerificationStatus(
    emailId: string,
    adminId: string,
    status: EmailVerificationStatus,
    rejectReason?: string,
  ) {
    const email = await this.prisma.professorEmail.findUnique({ where: { id: emailId } });
    if (!email) {
      throw new NotFoundException('Professor email not found');
    }

    const updated = await this.prisma.professorEmail.update({
      where: { id: emailId },
      data: {
        verificationStatus: status,
        isVerified: status === EmailVerificationStatus.verified,
        verifiedAt: status === EmailVerificationStatus.verified ? new Date() : null,
        verifiedByAdminId: adminId,
        rejectReason: status === EmailVerificationStatus.rejected ? rejectReason || 'Rejected by admin' : null,
      },
    });

    await this.prisma.verificationLog.create({
      data: {
        professorEmailId: emailId,
        source: 'manual_review',
        sourceUrl: updated.sourceUrl,
        result: status,
        domainMatched: updated.domainMatched,
        mxCheckResult: updated.mxValid,
        verifiedByAdmin: adminId,
        notes: rejectReason,
      },
    });

    return updated;
  }
}

