import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ApplicationStatus,
  Prisma,
  ScholarshipStatus,
  ScholarshipVerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PaginationService } from '../../shared/pagination/pagination.service';
import { CreditsService } from '../credits/credits.service';
import { UsageMeteringService } from '../billing/usage-metering.service';
import { ACTION_CREDIT_COSTS } from '../billing/billing.constants';

@Injectable()
export class ScholarshipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagination: PaginationService,
    private readonly credits: CreditsService,
    private readonly usage: UsageMeteringService,
  ) {}

  async findAll(filters: any, userId?: string) {
    const page = this.pagination.clampPage(Number(filters.page || 1));
    const perPage = this.pagination.clampPerPage(Number(filters.perPage || 20), 100);
    const skip = this.pagination.getSkip(page, perPage);
    const where = this.buildScholarshipWhere(filters, false);
    const orderBy = this.buildOrderBy(filters.sortBy);

    const [scholarships, total] = await Promise.all([
      this.prisma.scholarship.findMany({
        where,
        skip,
        take: perPage,
        orderBy,
        include: {
          country: { select: { id: true, name: true, isoAlpha2: true, flagEmoji: true } },
          university: { select: { id: true, name: true, logoUrl: true } },
        },
      }),
      this.prisma.scholarship.count({ where }),
    ]);

    const data = userId ? await this.attachScholarshipMatches(userId, scholarships) : scholarships;
    return this.pagination.paginate(data, total, page, perPage);
  }

  async findAdminAll(filters: any) {
    const page = this.pagination.clampPage(Number(filters.page || 1));
    const perPage = this.pagination.clampPerPage(Number(filters.perPage || 25), 100);
    const skip = this.pagination.getSkip(page, perPage);
    const where = this.buildScholarshipWhere(filters, true);
    const orderBy = this.buildOrderBy(filters.sortBy || 'createdAt');

    const [rows, total] = await Promise.all([
      this.prisma.scholarship.findMany({
        where,
        skip,
        take: perPage,
        orderBy,
        include: {
          country: { select: { id: true, name: true, flagEmoji: true } },
          university: { select: { id: true, name: true } },
        },
      }),
      this.prisma.scholarship.count({ where }),
    ]);

    return this.pagination.paginate(rows, total, page, perPage);
  }

  async findOne(id: string, userId?: string) {
    const scholarship = await this.prisma.scholarship.findUnique({
      where: { id },
      include: {
        country: true,
        university: { include: { country: true } },
        sources: {
          orderBy: { scrapedAt: 'desc' },
        },
      },
    });
    if (!scholarship) {
      throw new NotFoundException('Scholarship not found');
    }

    await this.prisma.scholarship.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    if (!userId) {
      return this.toLockedScholarshipResponse(scholarship, false);
    }

    const unlock = await this.prisma.scholarshipUnlock.findUnique({
      where: { userId_scholarshipId: { userId, scholarshipId: scholarship.id } },
      select: { id: true, unlockedAt: true },
    });

    const match = await this.prisma.matchScore.findUnique({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: 'scholarship',
          targetId: id,
        },
      },
    });

    const response = {
      ...scholarship,
      access: {
        requiresUnlock: !unlock,
        isUnlocked: Boolean(unlock),
        unlockCost: ACTION_CREDIT_COSTS.scholarship_unlock,
        unlockedAt: unlock?.unlockedAt || null,
      },
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

    return unlock ? response : this.toLockedScholarshipResponse(response, true);
  }

  async unlock(userId: string, scholarshipId: string) {
    const scholarship = await this.prisma.scholarship.findUnique({
      where: { id: scholarshipId },
      select: { id: true, title: true, status: true, verificationStatus: true, isActive: true, isExpired: true },
    });
    if (!scholarship || !scholarship.isActive || scholarship.isExpired) {
      throw new NotFoundException('Scholarship not found');
    }

    const existing = await this.prisma.scholarshipUnlock.findUnique({
      where: { userId_scholarshipId: { userId, scholarshipId } },
      select: { id: true, unlockedAt: true },
    });
    if (existing) {
      return {
        unlocked: true,
        alreadyUnlocked: true,
        unlockedAt: existing.unlockedAt,
      };
    }

    await this.usage.assertWithinLimit(userId, 'scholarship_unlock');
    await this.prisma.$transaction(async (tx) => {
      await this.credits.adjustWithTransaction(tx, userId, -ACTION_CREDIT_COSTS.scholarship_unlock, {
        type: 'scholarship_unlock',
        reason: 'scholarship_unlock',
        description: `Scholarship unlock: ${scholarship.title}`,
        referenceId: scholarshipId,
        referenceType: 'scholarships',
        allowNegative: false,
        createIfMissing: false,
      });
      await tx.scholarshipUnlock.create({
        data: { userId, scholarshipId },
      });
    });
    await this.usage.recordUsage(userId, 'scholarship_unlock');

    return {
      unlocked: true,
      alreadyUnlocked: false,
      creditsCharged: ACTION_CREDIT_COSTS.scholarship_unlock,
    };
  }

  async findAdminOne(id: string) {
    const scholarship = await this.prisma.scholarship.findUnique({
      where: { id },
      include: {
        country: true,
        university: true,
        sources: { orderBy: { scrapedAt: 'desc' } },
        savedScholarships: {
          select: {
            id: true,
            userId: true,
            applicationStatus: true,
            savedAt: true,
          },
          take: 20,
          orderBy: { savedAt: 'desc' },
        },
      },
    });

    if (!scholarship) {
      throw new NotFoundException('Scholarship not found');
    }

    return scholarship;
  }

  async create(data: any) {
    const slug = await this.generateSlug(data.title);
    return this.prisma.scholarship.create({
      data: {
        ...data,
        slug,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.scholarship.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    await this.prisma.scholarship.update({
      where: { id },
      data: {
        isActive: false,
        status: ScholarshipStatus.closed,
      },
    });
    return { success: true };
  }

  async save(userId: string, scholarshipId: string, data: any = {}) {
    const saved = await this.prisma.savedScholarship.upsert({
      where: { userId_scholarshipId: { userId, scholarshipId } },
      update: data,
      create: { userId, scholarshipId, ...data },
    });

    await this.prisma.scholarship.update({
      where: { id: scholarshipId },
      data: { saveCount: { increment: 1 } },
    });

    return saved;
  }

  async unsave(userId: string, scholarshipId: string) {
    await this.prisma.savedScholarship.deleteMany({ where: { userId, scholarshipId } });
    return { success: true };
  }

  async getSaved(userId: string, page = 1, perPage = 20) {
    const currentPage = this.pagination.clampPage(Number(page || 1));
    const pageSize = this.pagination.clampPerPage(Number(perPage || 20), 100);
    const skip = this.pagination.getSkip(currentPage, pageSize);

    const [items, total] = await Promise.all([
      this.prisma.savedScholarship.findMany({
        where: { userId },
        skip,
        take: pageSize,
        include: {
          scholarship: {
            include: {
              country: { select: { name: true, flagEmoji: true } },
              university: { select: { name: true } },
            },
          },
        },
        orderBy: { savedAt: 'desc' },
      }),
      this.prisma.savedScholarship.count({ where: { userId } }),
    ]);

    const scholarshipIds = items.map((item) => item.scholarshipId);
    const matches = await this.prisma.matchScore.findMany({
      where: {
        userId,
        targetType: 'scholarship',
        targetId: { in: scholarshipIds },
      },
    });
    const matchMap = new Map(matches.map((item) => [item.targetId, item]));

    const enriched = items.map((item) => ({
      ...item,
      scholarship: {
        ...item.scholarship,
        matchScore: matchMap.get(item.scholarshipId)
          ? {
              score: matchMap.get(item.scholarshipId)?.score,
              scoreBand: matchMap.get(item.scholarshipId)?.scoreBand,
              explanation: matchMap.get(item.scholarshipId)?.explanation,
              aiSummary: matchMap.get(item.scholarshipId)?.aiSummary,
              calculatedAt: matchMap.get(item.scholarshipId)?.calculatedAt,
            }
          : null,
      },
    }));

    return this.pagination.paginate(enriched, total, currentPage, pageSize);
  }

  async updateSavedStatus(userId: string, scholarshipId: string, data: { applicationStatus?: ApplicationStatus; notes?: string }) {
    const result = await this.prisma.savedScholarship.updateMany({
      where: { userId, scholarshipId },
      data,
    });

    if (data.applicationStatus === ApplicationStatus.applied) {
      await this.prisma.scholarship.update({
        where: { id: scholarshipId },
        data: { applicationCount: { increment: 1 } },
      }).catch(() => undefined);
    }

    return result;
  }

  async markExpired() {
    const result = await this.prisma.scholarship.updateMany({
      where: { deadline: { lt: new Date() }, isExpired: false },
      data: {
        isExpired: true,
        isActive: false,
        status: ScholarshipStatus.expired,
      },
    });
    return result.count;
  }

  private buildScholarshipWhere(filters: any, includeInactive: boolean): Prisma.ScholarshipWhereInput {
    const where: Prisma.ScholarshipWhereInput = {};

    if (!includeInactive) {
      where.status = ScholarshipStatus.active;
      where.verificationStatus = ScholarshipVerificationStatus.verified;
      where.isExpired = false;
      where.isActive = true;
    } else {
      if (filters.status) where.status = filters.status;
      if (filters.verificationStatus) where.verificationStatus = filters.verificationStatus;
    }

    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q } },
        { providerName: { contains: filters.q } },
      ];
    }

    if (filters.countryId) where.countryId = filters.countryId;
    if (filters.universityId) where.universityId = filters.universityId;
    if (filters.fundingType) where.fundingType = filters.fundingType;
    if (filters.degreeLevel) where.degreeLevel = filters.degreeLevel;
    if (filters.fullyFunded === 'true') where.isFullyFunded = true;
    if (filters.fullyFunded === 'false') where.isFullyFunded = false;
    if (filters.researchArea) where.researchAreas = { path: '$', array_contains: filters.researchArea };

    if (filters.deadlineFrom || filters.deadlineTo) {
      where.deadline = {};
      if (filters.deadlineFrom) where.deadline.gte = new Date(filters.deadlineFrom);
      if (filters.deadlineTo) where.deadline.lte = new Date(filters.deadlineTo);
    }

    return where;
  }

  private buildOrderBy(sortBy?: string): Prisma.ScholarshipOrderByWithRelationInput {
    switch (sortBy) {
      case 'deadline':
        return { deadline: 'asc' };
      case 'fundingAmount':
        return { fundingAmount: 'desc' };
      case 'qualityScore':
        return { qualityScore: 'desc' };
      case 'newest':
      case 'createdAt':
      default:
        return { createdAt: 'desc' };
    }
  }

  private async generateSlug(title: string): Promise<string> {
    let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const existing = await this.prisma.scholarship.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }
    return slug;
  }

  private async attachScholarshipMatches(userId: string, scholarships: any[]) {
    if (!scholarships.length) {
      return scholarships;
    }

    const matches = await this.prisma.matchScore.findMany({
      where: {
        userId,
        targetType: 'scholarship',
        targetId: { in: scholarships.map((item) => item.id) },
      },
    });

    const matchMap = new Map(matches.map((item) => [item.targetId, item]));
    return scholarships.map((scholarship) => {
      const match = matchMap.get(scholarship.id);
      return {
        ...scholarship,
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

  private toLockedScholarshipResponse(scholarship: any, authenticated: boolean) {
    return {
      ...scholarship,
      description: null,
      eligibilityCriteria: null,
      eligibility: null,
      requiredDocuments: null,
      applicationUrl: null,
      officialSourceUrl: null,
      officialUrl: null,
      sources: [],
      access: {
        requiresUnlock: true,
        isUnlocked: false,
        unlockCost: ACTION_CREDIT_COSTS.scholarship_unlock,
        authenticated,
      },
    };
  }
}
