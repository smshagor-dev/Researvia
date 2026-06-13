import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import * as dns from 'dns/promises';

@Injectable()
export class ProfessorEmailsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProfessor(professorId: string) {
    return this.prisma.professorEmail.findMany({
      where: { professorId },
      include: { verificationLogs: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
  }

  async create(professorId: string, data: any) {
    const professor = await this.prisma.professor.findUnique({
      where: { id: professorId },
      include: { university: { select: { emailDomains: true } } },
    });
    if (!professor) throw new NotFoundException('Professor not found');

    const emailDomain = data.email.split('@')[1];
    const universityDomains = (professor.university.emailDomains as string[]) || [];
    const domainMatch = universityDomains.some(d => emailDomain === d || emailDomain.endsWith(`.${d}`));

    const email = await this.prisma.professorEmail.create({
      data: { professorId, ...data, domainMatch, verificationStatus: 'pending' },
    });

    // Trigger async verification
    this.runVerification(email.id, emailDomain, universityDomains).catch(console.error);
    return email;
  }

  async adminVerify(emailId: string, adminId: string, approve: boolean, rejectReason?: string) {
    const email = await this.prisma.professorEmail.update({
      where: { id: emailId },
      data: {
        verificationStatus: approve ? 'verified' : 'failed',
        isVerified: approve,
        verificationSource: 'manual_review',
        verifiedAt: approve ? new Date() : undefined,
        verifiedBy: adminId,
        rejectReason: !approve ? rejectReason : undefined,
      },
    });

    await this.prisma.verificationLog.create({
      data: {
        professorEmailId: emailId,
        source: 'manual_review',
        result: approve ? 'found' : 'not_found',
        domainMatched: email.domainMatch,
        verifiedByAdmin: adminId,
        notes: rejectReason,
      },
    });

    return email;
  }

  async getPendingVerifications(page = 1, perPage = 20) {
    const skip = (page - 1) * perPage;
    const [items, total] = await Promise.all([
      this.prisma.professorEmail.findMany({
        where: { verificationStatus: { in: ['pending', 'manual_review'] } },
        skip, take: perPage,
        include: {
          professor: { include: { university: { select: { name: true, emailDomains: true } } } },
          verificationLogs: { take: 1, orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.professorEmail.count({
        where: { verificationStatus: { in: ['pending', 'manual_review'] } },
      }),
    ]);
    return { data: items, meta: { page, perPage, total } };
  }

  private async runVerification(emailId: string, emailDomain: string, universityDomains: string[]) {
    const domainMatched = universityDomains.some(d => emailDomain === d || emailDomain.endsWith(`.${d}`));
    let mxValid = false;

    try {
      const mx = await dns.resolveMx(emailDomain);
      mxValid = mx && mx.length > 0;
    } catch { mxValid = false; }

    const newStatus = domainMatched && mxValid ? 'manual_review' : 'failed';

    await this.prisma.professorEmail.update({
      where: { id: emailId },
      data: { domainMatch: domainMatched, mxValid, verificationStatus: newStatus },
    });

    await this.prisma.verificationLog.create({
      data: {
        professorEmailId: emailId,
        source: 'manual_review',
        result: domainMatched ? 'found' : 'domain_mismatch',
        domainMatched,
        mxCheckResult: mxValid,
      },
    });
  }
}
