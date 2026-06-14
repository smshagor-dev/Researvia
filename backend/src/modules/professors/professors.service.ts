import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import { PaginationService } from '../../shared/pagination/pagination.service';
import { CreditsService } from '../credits/credits.service';
import { UsageMeteringService } from '../billing/usage-metering.service';
import { AuditLogService } from '../security/audit-log.service';
import { professorRevealCounter } from '../observability/metrics.registry';

export interface ProfessorFilters {
  q?: string;
  universityId?: string;
  departmentId?: string;
  countryId?: string;
  researchAreaId?: string;
  acceptingStudents?: string;
  fundingStatus?: string;
  position?: string;
  minHIndex?: number;
  maxHIndex?: number;
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: string;
}

@Injectable()
export class ProfessorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly pagination: PaginationService,
    private readonly credits: CreditsService,
    private readonly usage: UsageMeteringService,
    private readonly audit: AuditLogService,
  ) {}

  async findAll(filters: ProfessorFilters, userId?: string) {
    const page = this.pagination.clampPage(filters.page || 1);
    const perPage = this.pagination.clampPerPage(filters.perPage || 20);
    const skip = this.pagination.getSkip(page, perPage);

    const where: any = { status: 'active', isPublic: true, verificationStatus: 'verified' };

    if (filters.q) {
      where.OR = [
        { fullName: { contains: filters.q } },
        { bio: { contains: filters.q } },
      ];
    }
    if (filters.universityId) where.universityId = filters.universityId;
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.acceptingStudents) where.acceptingStudents = filters.acceptingStudents;
    if (filters.fundingStatus) where.fundingStatus = filters.fundingStatus;
    if (filters.position) where.position = filters.position;
    if (filters.minHIndex || filters.maxHIndex) {
      where.hIndex = {};
      if (filters.minHIndex) where.hIndex.gte = Number(filters.minHIndex);
      if (filters.maxHIndex) where.hIndex.lte = Number(filters.maxHIndex);
    }
    if (filters.countryId) {
      where.university = { countryId: filters.countryId };
    }
    if (filters.researchAreaId) {
      where.researchAreas = { some: { researchAreaId: filters.researchAreaId } };
    }

    const orderBy = this.buildOrderBy(filters.sortBy, filters.sortOrder);

    const [professors, total] = await Promise.all([
      this.prisma.professor.findMany({
        where,
        skip,
        take: perPage,
        orderBy,
        include: {
          university: { select: { id: true, name: true, logoUrl: true, country: { select: { name: true, isoAlpha2: true, flagEmoji: true } } } },
          department: { select: { id: true, name: true } },
          researchAreas: {
            take: 5,
            include: { researchArea: { select: { id: true, name: true, slug: true } } },
            orderBy: { score: 'desc' },
          },
          _count: { select: { emails: { where: { isVerified: true } } } },
        },
      }),
      this.prisma.professor.count({ where }),
    ]);

    const data = professors.map((p) => this.formatProfessorList(p));
    const enriched = userId ? await this.attachProfessorMatches(userId, data) : data;
    return this.pagination.paginate(enriched, total, page, perPage);
  }

  async findOne(id: string, userId?: string) {
    const professor = await this.prisma.professor.findFirst({
      where: { id, status: 'active', isPublic: true, verificationStatus: 'verified' },
      include: {
        university: { include: { country: true } },
        department: true,
        researchAreas: {
          include: { researchArea: true },
          orderBy: [{ isPrimary: 'desc' }, { score: 'desc' }],
        },
        publications: {
          orderBy: [{ citationCount: 'desc' }, { publicationYear: 'desc' }],
          take: 20,
        },
        _count: { select: { emails: { where: { isVerified: true } } } },
      },
    });
    if (!professor) throw new NotFoundException('Professor not found');
    if (!userId) {
      return professor;
    }

    const match = await this.prisma.matchScore.findUnique({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: 'professor',
          targetId: id,
        },
      },
    });

    return {
      ...professor,
      matchScore: match
        ? {
            score: match.score,
            scoreBand: match.scoreBand,
            explanation: match.explanation,
            aiSummary: match.aiSummary,
            breakdown: match.breakdownJson,
            strengths: match.strengthsJson,
            weaknesses: match.weaknessesJson,
            recommendations: match.recommendationsJson,
            calculatedAt: match.calculatedAt,
          }
        : null,
    };
  }

  async revealEmail(professorId: string, userId: string) {
    const professor = await this.prisma.professor.findFirst({
      where: { id: professorId, status: 'active', isPublic: true, verificationStatus: 'verified' },
      include: {
        emails: {
          where: { verificationStatus: 'verified', isVerified: true },
          orderBy: [{ isPrimary: 'desc' }, { confidenceScore: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!professor) {
      throw new NotFoundException('Professor not found');
    }

    const emailRecord = professor.emails[0];
    if (!emailRecord) {
      return { emails: [], message: 'No verified emails available for this professor' };
    }

    const existingReveal = await this.prisma.emailRevealLog.findUnique({
      where: {
        userId_professorId: {
          userId,
          professorId,
        },
      },
      include: { email: true },
    });

    if (existingReveal) {
      return {
        emails: [{ email: existingReveal.email.email, type: existingReveal.email.type, isPrimary: existingReveal.email.isPrimary }],
        alreadyRevealed: true,
        creditsCharged: 0,
      };
    }

    await this.usage.assertWithinLimit(userId, 'professor_reveal');
    const balance = await this.credits.getBalance(userId);
    if ((balance as any).balance < 5) {
      throw new BadRequestException({ code: 'INSUFFICIENT_CREDITS', message: `Insufficient credits. Need 5, have ${(balance as any).balance}` });
    }

    await this.prisma.$transaction(async (tx) => {
      const credits = await tx.credits.findUnique({ where: { userId } });
      if (!credits || credits.balance < 5) {
        throw new BadRequestException({ code: 'INSUFFICIENT_CREDITS', message: `Insufficient credits. Need 5, have ${credits?.balance || 0}` });
      }

      const newBalance = credits.balance - 5;
      await tx.credits.update({
        where: { userId },
        data: { balance: newBalance, lifetimeSpent: { increment: 5 } },
      });
      await tx.creditTransaction.create({
        data: {
          userId,
          walletId: credits.id,
          amount: -5,
          type: 'professor_reveal',
          referenceId: professorId,
          referenceType: 'professors',
          reason: 'Professor email reveal',
          description: 'Professor email reveal',
          metadataJson: { emailId: emailRecord.id } as any,
          balanceAfter: newBalance,
        },
      });
      await tx.emailRevealLog.create({
        data: {
          userId,
          professorId,
          emailId: emailRecord.id,
          creditsUsed: 5,
        },
      });
    });
    await this.usage.recordUsage(userId, 'professor_reveal');
    professorRevealCounter.inc({ status: 'success' });
    await this.audit.logUserAction({
      userId,
      action: 'professor.reveal',
      entityType: 'professor',
      entityId: professorId,
      metadata: { emailId: emailRecord.id, creditsCharged: 5 },
    });

    return {
      emails: [{ email: emailRecord.email, type: emailRecord.type, isPrimary: emailRecord.isPrimary }],
      alreadyRevealed: false,
      creditsCharged: 5,
    };
  }

  async getSimilarProfessors(professorId: string, limit = 3) {
    const prof = await this.prisma.professor.findFirst({
      where: { id: professorId, status: 'active', isPublic: true, verificationStatus: 'verified' },
      include: { researchAreas: { take: 3, select: { researchAreaId: true } } },
    });
    if (!prof) return [];

    const areaIds = prof.researchAreas.map((r) => r.researchAreaId);
    const similar = await this.prisma.professor.findMany({
      where: {
        id: { not: professorId },
        status: 'active',
        isPublic: true,
        verificationStatus: 'verified',
        researchAreas: { some: { researchAreaId: { in: areaIds } } },
      },
      take: limit,
      include: {
        university: { select: { name: true, logoUrl: true } },
        researchAreas: {
          take: 3,
          include: { researchArea: { select: { name: true } } },
        },
      },
    });
    return similar;
  }

  async create(data: any) {
    return this.prisma.professor.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.professor.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.prisma.professor.update({ where: { id }, data: { status: 'inactive' } });
    return { success: true };
  }

  async getStats() {
    const [total, withVerifiedEmail, accepting] = await Promise.all([
      this.prisma.professor.count({ where: { status: 'active', isPublic: true, verificationStatus: 'verified' } }),
      this.prisma.professor.count({
        where: {
          status: 'active',
          isPublic: true,
          verificationStatus: 'verified',
          emails: { some: { isVerified: true } },
        },
      }),
      this.prisma.professor.count({
        where: { status: 'active', isPublic: true, verificationStatus: 'verified', acceptingStudents: 'yes' },
      }),
    ]);
    return { total, withVerifiedEmail, accepting };
  }

  private buildOrderBy(sortBy?: string, sortOrder?: string) {
    const order = (sortOrder === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';
    switch (sortBy) {
      case 'hIndex': return { hIndex: order };
      case 'citations': return { citationsCount: order };
      case 'name': return { fullName: order };
      default: return { hIndex: 'desc' as const };
    }
  }

  private formatProfessorList(p: any) {
    return {
      id: p.id,
      fullName: p.fullName,
      title: p.title,
      position: p.position,
      avatarUrl: p.avatarUrl,
      hIndex: p.hIndex,
      citationsCount: p.citationsCount,
      publicationsCount: p.publicationsCount,
      acceptingStudents: p.acceptingStudents,
      fundingStatus: p.fundingStatus,
      university: p.university,
      department: p.department,
      researchAreas: p.researchAreas?.map((r: any) => ({
        id: r.researchArea.id,
        name: r.researchArea.name,
        slug: r.researchArea.slug,
        score: r.score,
        isPrimary: r.isPrimary,
      })),
      hasVerifiedEmail: p._count?.emails > 0,
    };
  }

  private async attachProfessorMatches(userId: string, professors: any[]) {
    if (!professors.length) {
      return professors;
    }

    const matches = await this.prisma.matchScore.findMany({
      where: {
        userId,
        targetType: 'professor',
        targetId: { in: professors.map((item) => item.id) },
      },
    });

    const matchMap = new Map(matches.map((item) => [item.targetId, item]));
    return professors.map((professor) => {
      const match = matchMap.get(professor.id);
      return {
        ...professor,
        matchScore: match
          ? {
              score: match.score,
              scoreBand: match.scoreBand,
              explanation: match.explanation,
              aiSummary: match.aiSummary,
              breakdown: match.breakdownJson,
              calculatedAt: match.calculatedAt,
            }
          : null,
      };
    });
  }
}
