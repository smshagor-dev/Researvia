import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AcceptingStudents,
  ApplicationStatus,
  InterviewStatus,
  OpportunityStatus,
  OpportunityType,
  OpportunityVerificationStatus,
  Prisma,
  StudentDocumentType,
  StudentInterestedDegree,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PaginationService } from '../../shared/pagination/pagination.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreditsService } from '../credits/credits.service';
import { UsageMeteringService } from '../billing/usage-metering.service';
import { ACTION_CREDIT_COSTS } from '../billing/billing.constants';
import {
  CreateApplicationDto,
  CreateInterviewDto,
  UpdateApplicationDto,
  UpdateInterviewDto,
  UpdateOpportunityDto,
} from './dto/opportunity.dto';

const DEFAULT_REQUIRED_DOCUMENTS: StudentDocumentType[] = [
  StudentDocumentType.CV,
  StudentDocumentType.TRANSCRIPT,
];

const DOCUMENT_REQUIREMENTS_BY_TYPE: Partial<Record<OpportunityType, StudentDocumentType[]>> = {
  phd_position: [
    StudentDocumentType.CV,
    StudentDocumentType.TRANSCRIPT,
    StudentDocumentType.SOP,
    StudentDocumentType.RECOMMENDATION_LETTER,
  ],
  research_grant: [
    StudentDocumentType.CV,
    StudentDocumentType.RESEARCH_PROPOSAL,
  ],
  fellowship: [
    StudentDocumentType.CV,
    StudentDocumentType.SOP,
    StudentDocumentType.RECOMMENDATION_LETTER,
  ],
  postdoc: [
    StudentDocumentType.CV,
    StudentDocumentType.RESEARCH_PROPOSAL,
    StudentDocumentType.RECOMMENDATION_LETTER,
  ],
};

const STATUS_COLUMNS: ApplicationStatus[] = [
  ApplicationStatus.saved,
  ApplicationStatus.planning,
  ApplicationStatus.applied,
  ApplicationStatus.under_review,
  ApplicationStatus.interview,
  ApplicationStatus.offer_received,
  ApplicationStatus.accepted,
  ApplicationStatus.rejected,
];

@Injectable()
export class OpportunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagination: PaginationService,
    private readonly notifications: NotificationsService,
    private readonly credits: CreditsService,
    private readonly usage: UsageMeteringService,
  ) {}

  async findAll(filters: any, userId?: string) {
    const page = this.pagination.clampPage(Number(filters.page || 1));
    const perPage = this.pagination.clampPerPage(Number(filters.perPage || 20), 100);
    const skip = this.pagination.getSkip(page, perPage);
    const where = this.buildOpportunityWhere(filters, false);
    const orderBy = this.buildOpportunityOrderBy(filters.sortBy);

    const [rows, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        where,
        skip,
        take: perPage,
        orderBy,
        include: this.opportunityInclude(),
      }),
      this.prisma.opportunity.count({ where }),
    ]);

    const data = userId ? await this.attachUserOpportunityData(userId, rows) : rows;
    return this.pagination.paginate(data, total, page, perPage);
  }

  async findOne(id: string, userId?: string) {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        ...this.opportunityInclude(),
        professor: {
          include: {
            university: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
            publications: {
              orderBy: [{ citationCount: 'desc' }, { publicationYear: 'desc' }],
              take: 5,
              select: {
                id: true,
                title: true,
                publicationYear: true,
                venue: true,
                citationCount: true,
              },
            },
            researchAreas: {
              take: 6,
              include: {
                researchArea: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    if (!userId) {
      return this.toLockedOpportunityResponse(opportunity, false);
    }

    const unlock = await this.prisma.opportunityUnlock.findUnique({
      where: { userId_opportunityId: { userId, opportunityId: opportunity.id } },
      select: { id: true, unlockedAt: true },
    });

    const [application, readiness, fit] = await Promise.all([
      this.prisma.application.findUnique({
        where: {
          userId_opportunityId: {
            userId,
            opportunityId: opportunity.id,
          },
        },
        include: {
          interviews: {
            orderBy: { scheduledAt: 'asc' },
          },
        },
      }),
      this.computeApplicationReadiness(userId, opportunity),
      this.computeOpportunityFit(userId, opportunity),
    ]);

    const response = {
      ...opportunity,
      access: {
        requiresUnlock: !unlock,
        isUnlocked: Boolean(unlock),
        unlockCost: ACTION_CREDIT_COSTS.opportunity_unlock,
        unlockedAt: unlock?.unlockedAt || null,
      },
      currentApplication: application,
      readiness,
      fit,
      interviewPreparation: this.buildInterviewPreparation(opportunity),
    };

    return unlock ? response : this.toLockedOpportunityResponse(response, true);
  }

  async unlock(userId: string, opportunityId: string) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id: opportunityId },
      select: { id: true, title: true, status: true, verificationStatus: true },
    });
    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    const existing = await this.prisma.opportunityUnlock.findUnique({
      where: { userId_opportunityId: { userId, opportunityId } },
      select: { id: true, unlockedAt: true },
    });
    if (existing) {
      return {
        unlocked: true,
        alreadyUnlocked: true,
        unlockedAt: existing.unlockedAt,
      };
    }

    await this.usage.assertWithinLimit(userId, 'opportunity_unlock');
    await this.prisma.$transaction(async (tx) => {
      await this.credits.adjustWithTransaction(tx, userId, -ACTION_CREDIT_COSTS.opportunity_unlock, {
        type: 'opportunity_unlock',
        reason: 'opportunity_unlock',
        description: `Opportunity unlock: ${opportunity.title}`,
        referenceId: opportunityId,
        referenceType: 'opportunities',
        allowNegative: false,
        createIfMissing: false,
      });
      await tx.opportunityUnlock.create({
        data: { userId, opportunityId },
      });
    });
    await this.usage.recordUsage(userId, 'opportunity_unlock');

    return {
      unlocked: true,
      alreadyUnlocked: false,
      creditsCharged: ACTION_CREDIT_COSTS.opportunity_unlock,
    };
  }

  async findAdminAll(filters: any) {
    const page = this.pagination.clampPage(Number(filters.page || 1));
    const perPage = this.pagination.clampPerPage(Number(filters.perPage || 25), 100);
    const skip = this.pagination.getSkip(page, perPage);
    const where = this.buildOpportunityWhere(filters, true);
    const orderBy = this.buildOpportunityOrderBy(filters.sortBy || 'createdAt');

    const [rows, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        where,
        skip,
        take: perPage,
        orderBy,
        include: {
          ...this.opportunityInclude(),
          _count: {
            select: { applications: true },
          },
        },
      }),
      this.prisma.opportunity.count({ where }),
    ]);

    return this.pagination.paginate(rows, total, page, perPage);
  }

  async updateOpportunity(id: string, dto: UpdateOpportunityDto) {
    const existing = await this.prisma.opportunity.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Opportunity not found');
    }

    return this.prisma.opportunity.update({
      where: { id },
      data: {
        ...dto,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      },
    });
  }

  async approveOpportunity(id: string) {
    return this.prisma.opportunity.update({
      where: { id },
      data: {
        verificationStatus: OpportunityVerificationStatus.verified,
        status: OpportunityStatus.active,
      },
    });
  }

  async rejectOpportunity(id: string) {
    return this.prisma.opportunity.update({
      where: { id },
      data: {
        verificationStatus: OpportunityVerificationStatus.rejected,
        status: OpportunityStatus.closed,
      },
    });
  }

  async listApplications(userId: string, filters: any) {
    const page = this.pagination.clampPage(Number(filters.page || 1));
    const perPage = this.pagination.clampPerPage(Number(filters.perPage || 50), 100);
    const skip = this.pagination.getSkip(page, perPage);
    const where: Prisma.ApplicationWhereInput = { userId };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.q) {
      where.opportunity = {
        OR: [
          { title: { contains: filters.q } },
          { description: { contains: filters.q } },
        ],
      };
    }

    const [applications, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        skip,
        take: perPage,
        orderBy: [{ lastUpdatedAt: 'desc' }],
        include: {
          opportunity: {
            include: this.opportunityInclude(),
          },
          interviews: {
            orderBy: { scheduledAt: 'asc' },
          },
        },
      }),
      this.prisma.application.count({ where }),
    ]);

    const enriched = await Promise.all(
      applications.map(async (application) => ({
        ...application,
        readiness: await this.computeApplicationReadiness(userId, application.opportunity),
        fit: await this.computeOpportunityFit(userId, application.opportunity),
        interviewPreparation: this.buildInterviewPreparation(application.opportunity),
      })),
    );

    const board = STATUS_COLUMNS.map((status) => ({
      status,
      items: enriched.filter((item) => item.status === status),
    }));

    return {
      ...this.pagination.paginate(enriched, total, page, perPage),
      board,
      stats: await this.getApplicationStats(userId),
    };
  }

  async createApplication(userId: string, dto: CreateApplicationDto) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id: dto.opportunityId },
      include: this.opportunityInclude(),
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    const status = dto.status || ApplicationStatus.saved;
    const application = await this.prisma.application.upsert({
      where: {
        userId_opportunityId: {
          userId,
          opportunityId: dto.opportunityId,
        },
      },
      update: {
        status,
        notes: dto.notes,
        submittedAt: this.shouldSetSubmittedAt(status) ? new Date() : undefined,
      },
      create: {
        userId,
        opportunityId: dto.opportunityId,
        status,
        notes: dto.notes,
        submittedAt: this.shouldSetSubmittedAt(status) ? new Date() : null,
      },
      include: {
        opportunity: {
          include: this.opportunityInclude(),
        },
        interviews: true,
      },
    });

    await this.notifyApplicationStatus(userId, application, status, true);
    return {
      ...application,
      readiness: await this.computeApplicationReadiness(userId, opportunity),
      fit: await this.computeOpportunityFit(userId, opportunity),
    };
  }

  async updateApplication(userId: string, applicationId: string, dto: UpdateApplicationDto) {
    const existing = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
      include: {
        opportunity: {
          include: this.opportunityInclude(),
        },
        interviews: true,
      },
    });
    if (!existing) {
      throw new NotFoundException('Application not found');
    }

    const nextStatus = dto.status || existing.status;
    const application = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: dto.status,
        notes: dto.notes,
        submittedAt:
          dto.status && this.shouldSetSubmittedAt(dto.status) && !existing.submittedAt
            ? new Date()
            : undefined,
      },
      include: {
        opportunity: {
          include: this.opportunityInclude(),
        },
        interviews: {
          orderBy: { scheduledAt: 'asc' },
        },
      },
    });

    if (dto.status && dto.status !== existing.status) {
      await this.notifyApplicationStatus(userId, application, dto.status, false);
    }

    return {
      ...application,
      readiness: await this.computeApplicationReadiness(userId, application.opportunity),
      fit: await this.computeOpportunityFit(userId, application.opportunity),
      interviewPreparation: this.buildInterviewPreparation(application.opportunity),
    };
  }

  async createInterview(userId: string, dto: CreateInterviewDto) {
    const application = await this.prisma.application.findFirst({
      where: { id: dto.applicationId, userId },
      include: {
        opportunity: {
          include: this.opportunityInclude(),
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const interview = await this.prisma.interview.create({
      data: {
        applicationId: application.id,
        scheduledAt: new Date(dto.scheduledAt),
        timezone: dto.timezone,
        meetingLink: dto.meetingLink,
        notes: dto.notes,
        status: dto.status || InterviewStatus.scheduled,
      },
    });

    if (application.status !== ApplicationStatus.interview) {
      await this.prisma.application.update({
        where: { id: application.id },
        data: { status: ApplicationStatus.interview },
      });
    }

    await this.notifications.create(userId, {
      type: 'interview_upcoming',
      title: `Interview scheduled for ${application.opportunity.title}`,
      body: `Your interview is scheduled for ${new Date(dto.scheduledAt).toLocaleString()}.`,
      actionUrl: '/applications',
      data: {
        interviewId: interview.id,
        applicationId: application.id,
        opportunityId: application.opportunityId,
      },
    });

    return {
      ...interview,
      preparation: this.buildInterviewPreparation(application.opportunity),
    };
  }

  async updateInterview(userId: string, interviewId: string, dto: UpdateInterviewDto) {
    const interview = await this.prisma.interview.findFirst({
      where: {
        id: interviewId,
        application: { userId },
      },
      include: {
        application: {
          include: {
            opportunity: {
              include: this.opportunityInclude(),
            },
          },
        },
      },
    });
    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    const updated = await this.prisma.interview.update({
      where: { id: interviewId },
      data: {
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        timezone: dto.timezone,
        meetingLink: dto.meetingLink,
        notes: dto.notes,
        status: dto.status,
      },
    });

    if (dto.status || dto.scheduledAt) {
      const title =
        dto.status === InterviewStatus.cancelled
          ? 'Interview cancelled'
          : dto.status === InterviewStatus.rescheduled || dto.scheduledAt
            ? 'Interview updated'
            : 'Interview status changed';

      await this.notifications.create(userId, {
        type: 'interview_upcoming',
        title: `${title}: ${interview.application.opportunity.title}`,
        body: dto.scheduledAt
          ? `Interview time is now ${new Date(dto.scheduledAt).toLocaleString()}.`
          : `Interview status is now ${dto.status}.`,
        actionUrl: '/applications',
        data: {
          interviewId: interviewId,
          applicationId: interview.applicationId,
          opportunityId: interview.application.opportunityId,
        },
      });
    }

    return {
      ...updated,
      preparation: this.buildInterviewPreparation(interview.application.opportunity),
    };
  }

  async getDashboard(userId: string) {
    const [applications, upcomingInterviews, offers, savedCount, stats] = await Promise.all([
      this.prisma.application.findMany({
        where: { userId },
        orderBy: { lastUpdatedAt: 'desc' },
        take: 8,
        include: {
          opportunity: {
            include: this.opportunityInclude(),
          },
          interviews: {
            orderBy: { scheduledAt: 'asc' },
            take: 1,
          },
        },
      }),
      this.prisma.interview.findMany({
        where: {
          application: { userId },
          scheduledAt: { gte: new Date() },
          status: { in: [InterviewStatus.scheduled, InterviewStatus.rescheduled] },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        include: {
          application: {
            include: {
              opportunity: {
                include: this.opportunityInclude(),
              },
            },
          },
        },
      }),
      this.prisma.application.findMany({
        where: {
          userId,
          status: { in: [ApplicationStatus.offer_received, ApplicationStatus.accepted] },
        },
        orderBy: { lastUpdatedAt: 'desc' },
        take: 5,
        include: {
          opportunity: {
            include: this.opportunityInclude(),
          },
        },
      }),
      this.prisma.application.count({
        where: { userId, status: ApplicationStatus.saved },
      }),
      this.getApplicationStats(userId),
    ]);

    return {
      ...stats,
      applications,
      upcomingInterviews,
      offers,
      savedOpportunities: savedCount,
    };
  }

  async queueSafeStatusRefresh(opportunityId?: string) {
    if (!opportunityId) {
      return 0;
    }
    const opportunity = await this.prisma.opportunity.findUnique({ where: { id: opportunityId } });
    if (!opportunity) {
      return 0;
    }
    const nextStatus = this.resolveOpportunityStatus(opportunity.deadline, opportunity.verificationStatus);
    if (nextStatus !== opportunity.status) {
      await this.prisma.opportunity.update({
        where: { id: opportunity.id },
        data: { status: nextStatus },
      });
      return 1;
    }
    return 0;
  }

  async getApplicationStats(userId: string) {
    const grouped = await this.prisma.application.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
    });

    const statusMap = new Map(grouped.map((row) => [row.status, row._count._all]));
    const accepted = statusMap.get(ApplicationStatus.accepted) || 0;
    const rejected = statusMap.get(ApplicationStatus.rejected) || 0;
    const offerReceived = statusMap.get(ApplicationStatus.offer_received) || 0;
    const decisions = accepted + rejected;

    return {
      totalApplications: grouped.reduce((sum, row) => sum + row._count._all, 0),
      offersCount: offerReceived + accepted,
      acceptanceRate: decisions > 0 ? Math.round((accepted / decisions) * 100) : 0,
      statusCounts: Object.fromEntries(STATUS_COLUMNS.map((status) => [status, statusMap.get(status) || 0])),
    };
  }

  private async attachUserOpportunityData(userId: string, rows: any[]) {
    if (!rows.length) {
      return rows;
    }

    const applications = await this.prisma.application.findMany({
      where: {
        userId,
        opportunityId: { in: rows.map((row) => row.id) },
      },
      include: {
        interviews: {
          orderBy: { scheduledAt: 'asc' },
        },
      },
    });

    const applicationsByOpportunity = new Map(applications.map((item) => [item.opportunityId, item]));

    return Promise.all(
      rows.map(async (row) => ({
        ...row,
        currentApplication: applicationsByOpportunity.get(row.id) || null,
        readiness: await this.computeApplicationReadiness(userId, row),
        fit: await this.computeOpportunityFit(userId, row),
      })),
    );
  }

  private buildOpportunityWhere(filters: any, includeInactive: boolean): Prisma.OpportunityWhereInput {
    const where: Prisma.OpportunityWhereInput = {};

    if (!includeInactive) {
      where.status = OpportunityStatus.active;
      where.verificationStatus = OpportunityVerificationStatus.verified;
    } else {
      if (filters.status) where.status = filters.status;
      if (filters.verificationStatus) where.verificationStatus = filters.verificationStatus;
    }

    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q } },
        { description: { contains: filters.q } },
        { requirements: { contains: filters.q } },
      ];
    }

    if (filters.type) where.type = filters.type;
    if (filters.countryId) where.countryId = filters.countryId;
    if (filters.universityId) where.universityId = filters.universityId;
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.professorId) where.professorId = filters.professorId;
    if (filters.fullyFunded === 'true') where.isFullyFunded = true;
    if (filters.fullyFunded === 'false') where.isFullyFunded = false;

    if (filters.deadlineTo || filters.deadlineFrom) {
      where.deadline = {};
      if (filters.deadlineFrom) where.deadline.gte = new Date(filters.deadlineFrom);
      if (filters.deadlineTo) where.deadline.lte = new Date(filters.deadlineTo);
    }

    return where;
  }

  private buildOpportunityOrderBy(sortBy?: string): Prisma.OpportunityOrderByWithRelationInput {
    switch (sortBy) {
      case 'deadline':
        return { deadline: 'asc' };
      case 'qualityScore':
        return { qualityScore: 'desc' };
      case 'fundingAmount':
        return { fundingAmount: 'desc' };
      case 'createdAt':
      case 'newest':
      default:
        return { createdAt: 'desc' };
    }
  }

  private opportunityInclude() {
    return {
      country: { select: { id: true, name: true, flagEmoji: true, isoAlpha2: true } },
      university: { select: { id: true, name: true, logoUrl: true, websiteUrl: true } },
      department: { select: { id: true, name: true } },
      professor: {
        select: {
          id: true,
          fullName: true,
          title: true,
          position: true,
          facultyPageUrl: true,
          labUrl: true,
          personalWebsite: true,
          acceptingStudents: true,
          fundingStatus: true,
        },
      },
    } satisfies Prisma.OpportunityInclude;
  }

  private async computeApplicationReadiness(userId: string, opportunity: any) {
    const [studentProfile, academicProfile, researchInterest, documents] = await Promise.all([
      this.prisma.studentProfile.findUnique({
        where: { userId },
      }),
      this.prisma.studentAcademicProfile.findUnique({
        where: { userId },
      }),
      this.prisma.studentResearchInterest.findFirst({
        where: { studentProfile: { userId } },
      }),
      this.prisma.studentDocument.findMany({
        where: {
          studentProfile: { userId },
          status: { not: 'rejected' },
        },
      }),
    ]);

    const requiredDocs = DOCUMENT_REQUIREMENTS_BY_TYPE[opportunity.type] || DEFAULT_REQUIRED_DOCUMENTS;
    const uploadedTypes = new Set(documents.map((doc) => doc.type));
    const missingDocuments = requiredDocs.filter((type) => !uploadedTypes.has(type));
    const missingProfileFields: string[] = [];

    if (!studentProfile?.fullName) missingProfileFields.push('fullName');
    if (!studentProfile?.nationality) missingProfileFields.push('nationality');
    if (!academicProfile?.currentDegreeLevel) missingProfileFields.push('currentDegreeLevel');
    if (!academicProfile?.currentUniversity) missingProfileFields.push('currentUniversity');
    if (!researchInterest?.primaryArea && !academicProfile?.researchSummary) missingProfileFields.push('researchFocus');

    let score = 100;
    score -= missingDocuments.length * 15;
    score -= missingProfileFields.length * 10;
    if (!studentProfile?.onboardingCompleted) score -= 10;
    if (!academicProfile?.cvText) score -= 10;

    return {
      score: Math.max(0, Math.min(100, score)),
      missingDocuments,
      missingProfileFields,
      requiredDocuments: requiredDocs,
    };
  }

  private async computeOpportunityFit(userId: string, opportunity: any) {
    const [academicProfile, studentProfile, researchInterest, preferences] = await Promise.all([
      this.prisma.studentAcademicProfile.findUnique({ where: { userId } }),
      this.prisma.studentProfile.findUnique({ where: { userId } }),
      this.prisma.studentResearchInterest.findFirst({
        where: { studentProfile: { userId } },
      }),
      this.prisma.studentPreference.findFirst({
        where: { studentProfile: { userId } },
      }),
    ]);

    let score = 20;
    const reasons: string[] = [];

    const targetDegree = academicProfile?.targetDegree || researchInterest?.interestedDegree;
    if (targetDegree && this.matchesTargetDegree(targetDegree, opportunity.type)) {
      score += 20;
      reasons.push('Opportunity type matches your target degree');
    }

    const preferredCountries = this.extractArray(
      academicProfile?.preferredCountriesJson || researchInterest?.preferredCountries,
    );
    if (opportunity.country?.name && preferredCountries.includes(opportunity.country.name)) {
      score += 15;
      reasons.push('Country matches your saved preferences');
    }

    const preferredUniversities = this.extractArray(
      academicProfile?.preferredUniversitiesJson || researchInterest?.preferredUniversities,
    );
    if (opportunity.university?.name && preferredUniversities.includes(opportunity.university.name)) {
      score += 10;
      reasons.push('University matches your saved preferences');
    }

    const fundingNeed = this.resolveFundingNeed(
      academicProfile?.preferredFundingTypesJson || researchInterest?.fundingNeed,
    );
    if (fundingNeed === 'FULLY_FUNDED' && opportunity.isFullyFunded) {
      score += 20;
      reasons.push('Funding coverage aligns with your requirement');
    }

    const researchKeywords = [
      ...this.extractArray(academicProfile?.preferredResearchAreasJson),
      ...(researchInterest?.primaryArea ? [researchInterest.primaryArea] : []),
      ...this.extractArray(researchInterest?.secondaryAreas),
      ...this.extractArray(researchInterest?.keywords),
    ].map((item) => String(item).toLowerCase());

    const searchableText = [
      opportunity.title,
      opportunity.description,
      opportunity.requirements,
      opportunity.department?.name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const overlaps = researchKeywords.filter((keyword) => keyword && searchableText.includes(keyword));
    if (overlaps.length) {
      score += Math.min(25, overlaps.length * 8);
      reasons.push(`Research alignment found for: ${overlaps.slice(0, 3).join(', ')}`);
    }

    if (studentProfile?.currentCountry && opportunity.country?.name && studentProfile.currentCountry === opportunity.country.name) {
      score += 5;
      reasons.push('Located in your current country');
    }

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      reasons,
    };
  }

  private buildInterviewPreparation(opportunity: any) {
    const researchAreas =
      opportunity.professor?.researchAreas?.map((item: any) => item.researchArea?.name).filter(Boolean) || [];
    const publications = opportunity.professor?.publications || [];

    return {
      likelyQuestions: [
        `Why are you interested in this ${this.labelize(opportunity.type)}?`,
        `How does your background align with ${opportunity.title}?`,
        opportunity.professor?.fullName
          ? `What about ${opportunity.professor.fullName}'s recent work interests you most?`
          : 'Which part of the research program excites you most?',
      ],
      preparationTopics: [
        ...(researchAreas.length ? researchAreas.slice(0, 4) : ['Core research methods', 'Recent publications']),
        'Your academic story',
        'Funding expectations and timelines',
      ],
      readingList: publications.slice(0, 4).map((publication: any) => ({
        title: publication.title,
        year: publication.publicationYear,
        venue: publication.journalName,
      })),
      labBackground: {
        professor: opportunity.professor?.fullName || null,
        researchAreas,
        opportunityType: opportunity.type,
        university: opportunity.university?.name || null,
        department: opportunity.department?.name || null,
      },
    };
  }

  private async notifyApplicationStatus(
    userId: string,
    application: any,
    status: ApplicationStatus,
    isCreate: boolean,
  ) {
    const actionUrl = '/applications';
    const titleBase = application.opportunity?.title || 'Opportunity';

    if (status === ApplicationStatus.offer_received) {
      await this.notifications.create(userId, {
        type: 'offer_received',
        title: `Offer received: ${titleBase}`,
        body: 'A new offer has been recorded in your application tracker.',
        actionUrl,
        data: { applicationId: application.id, opportunityId: application.opportunityId },
      });
      return;
    }

    await this.notifications.create(userId, {
      type: 'application_status_changed',
      title: `${isCreate ? 'Application saved' : 'Application updated'}: ${titleBase}`,
      body: `Application is now in the ${this.labelize(status)} stage.`,
      actionUrl,
      data: { applicationId: application.id, opportunityId: application.opportunityId, status },
    });
  }

  private shouldSetSubmittedAt(status: ApplicationStatus) {
    const submittedStatuses: ApplicationStatus[] = [
      ApplicationStatus.applied,
      ApplicationStatus.under_review,
      ApplicationStatus.interview,
      ApplicationStatus.offer_received,
      ApplicationStatus.accepted,
      ApplicationStatus.rejected,
    ];
    return submittedStatuses.includes(status);
  }

  private matchesTargetDegree(targetDegree: StudentInterestedDegree, type: OpportunityType) {
    if (targetDegree === StudentInterestedDegree.PHD) {
      return [OpportunityType.phd_position, OpportunityType.fellowship].includes(type as any);
    }
    if (targetDegree === StudentInterestedDegree.POSTDOC) {
      return type === OpportunityType.postdoc;
    }
    if (targetDegree === StudentInterestedDegree.RESEARCH_INTERNSHIP) {
      return [OpportunityType.research_internship, OpportunityType.lab_position].includes(type as any);
    }
    return [OpportunityType.research_assistant, OpportunityType.teaching_assistant, OpportunityType.exchange_program].includes(type as any);
  }

  private extractArray(value: any): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string') return [value];
    if (typeof value === 'object') {
      return Object.values(value).flatMap((item) => this.extractArray(item));
    }
    return [];
  }

  private resolveFundingNeed(value: any): 'FULLY_FUNDED' | 'PARTIAL_FUNDED' | 'SELF_FUNDED' | 'ANY' | null {
    const values = this.extractArray(value).map((item) => item.toUpperCase());
    if (!values.length) {
      return null;
    }

    if (values.includes('FULLY_FUNDED')) return 'FULLY_FUNDED';
    if (values.includes('PARTIAL_FUNDED')) return 'PARTIAL_FUNDED';
    if (values.includes('SELF_FUNDED')) return 'SELF_FUNDED';
    return 'ANY';
  }

  private resolveOpportunityStatus(
    deadline: Date | null,
    verificationStatus: OpportunityVerificationStatus,
  ): OpportunityStatus {
    if (deadline && deadline.getTime() < Date.now()) {
      return OpportunityStatus.expired;
    }

    if (verificationStatus === OpportunityVerificationStatus.verified) {
      return OpportunityStatus.active;
    }

    if (verificationStatus === OpportunityVerificationStatus.rejected) {
      return OpportunityStatus.closed;
    }

    return OpportunityStatus.draft;
  }

  labelize(value: string) {
    return value.replace(/_/g, ' ');
  }

  private toLockedOpportunityResponse(opportunity: any, authenticated: boolean) {
    return {
      ...opportunity,
      description: null,
      requirements: null,
      officialUrl: null,
      sourceUrl: null,
      currentApplication: null,
      readiness: null,
      fit: null,
      interviewPreparation: null,
      access: {
        requiresUnlock: true,
        isUnlocked: false,
        unlockCost: ACTION_CREDIT_COSTS.opportunity_unlock,
        authenticated,
      },
    };
  }
}
