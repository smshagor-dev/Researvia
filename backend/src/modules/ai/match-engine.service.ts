import { Injectable, NotFoundException } from '@nestjs/common';
import { AIModelProvider, CvParseStatus, MatchTargetType, Prisma, ScholarshipStatus, ScholarshipVerificationStatus, StudentDegreeLevel, StudentInterestedDegree } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PaginationService } from '../../shared/pagination/pagination.service';
import { ProfessorSyncQueueService } from '../queues/professor-sync-queue.service';
import type {
  AdminRecalculateMatchesDto,
  MatchListQueryDto,
  ParseCvDto,
  RefreshMatchesDto,
  UpdateAcademicProfileDto,
} from './dto/match.dto';

type AcademicProfileShape = Awaited<ReturnType<MatchEngineService['ensureAcademicProfile']>>;

type MatchComputation = {
  score: number;
  scoreBand: string;
  breakdown: Record<string, { score: number; weight: number; weighted: number }>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  explanation: string;
  aiSummary: string;
  provider: AIModelProvider;
  modelName: string;
};

@Injectable()
export class MatchEngineService {
  private readonly staleMs = 7 * 24 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pagination: PaginationService,
    private readonly queues: ProfessorSyncQueueService,
  ) {}

  async getAcademicProfile(userId: string) {
    const profile = await this.ensureAcademicProfile(userId);
    return this.serializeAcademicProfile(profile);
  }

  async updateAcademicProfile(userId: string, dto: UpdateAcademicProfileDto) {
    const existing = await this.ensureAcademicProfile(userId);
    const updated = await this.prisma.studentAcademicProfile.update({
      where: { userId },
      data: {
        currentDegreeLevel: this.toDegreeLevel(dto.currentDegreeLevel) ?? existing.currentDegreeLevel,
        currentUniversity: dto.currentUniversity ?? existing.currentUniversity,
        currentDepartment: dto.currentDepartment ?? existing.currentDepartment,
        targetDegree: this.toInterestedDegree(dto.targetDegree) ?? existing.targetDegree,
        targetIntake: dto.targetIntake ?? existing.targetIntake,
        gpa: dto.gpa ?? existing.gpa,
        gradingScale: dto.gradingScale ?? existing.gradingScale,
        researchSummary: dto.researchSummary ?? existing.researchSummary,
        publicationsCount: dto.publicationsCount ?? existing.publicationsCount,
        researchExperienceYears: dto.researchExperienceYears ?? existing.researchExperienceYears,
        preferredCountriesJson: dto.preferredCountries ? dto.preferredCountries as Prisma.InputJsonValue : undefined,
        preferredUniversitiesJson: dto.preferredUniversities ? dto.preferredUniversities as Prisma.InputJsonValue : undefined,
        preferredFundingTypesJson: dto.preferredFundingTypes ? dto.preferredFundingTypes as Prisma.InputJsonValue : undefined,
        preferredResearchAreasJson: dto.preferredResearchAreas ? dto.preferredResearchAreas as Prisma.InputJsonValue : undefined,
        lastConfirmedAt: dto.confirmParsedData ? new Date() : existing.lastConfirmedAt,
        parseStatus: dto.confirmParsedData ? CvParseStatus.confirmed : existing.parseStatus,
      },
    });

    await this.requestRefresh(userId, { force: true, targetType: 'all' });
    return this.serializeAcademicProfile(updated);
  }

  async parseCv(userId: string, dto: ParseCvDto) {
    const extracted = this.extractCvSignals(dto.rawText);
    const log = await this.prisma.cvParseLog.create({
      data: {
        userId,
        status: CvParseStatus.parsed,
        provider: AIModelProvider.deterministic,
        sourceFileName: dto.sourceFileName,
        rawText: dto.rawText,
        extractedJson: extracted as Prisma.InputJsonValue,
      },
    });

    await this.prisma.studentAcademicProfile.upsert({
      where: { userId },
      create: {
        userId,
        currentDegreeLevel: this.toDegreeLevel(extracted.currentDegreeLevel),
        currentUniversity: extracted.currentUniversity || null,
        currentDepartment: extracted.currentDepartment || null,
        targetDegree: this.toInterestedDegree(extracted.targetDegree),
        gpa: extracted.gpa ?? null,
        researchSummary: extracted.researchSummary || null,
        cvText: dto.rawText,
        publicationsCount: extracted.publicationsCount ?? 0,
        researchExperienceYears: extracted.researchExperienceYears ?? null,
        preferredCountriesJson: extracted.preferredCountries || [],
        preferredResearchAreasJson: extracted.preferredResearchAreas || [],
        lastParsedAt: new Date(),
        parseStatus: CvParseStatus.parsed,
      },
      update: {
        currentDegreeLevel: this.toDegreeLevel(extracted.currentDegreeLevel),
        currentUniversity: extracted.currentUniversity || undefined,
        currentDepartment: extracted.currentDepartment || undefined,
        targetDegree: this.toInterestedDegree(extracted.targetDegree),
        gpa: extracted.gpa ?? undefined,
        researchSummary: extracted.researchSummary || undefined,
        cvText: dto.rawText,
        publicationsCount: extracted.publicationsCount ?? undefined,
        researchExperienceYears: extracted.researchExperienceYears ?? undefined,
        preferredCountriesJson: extracted.preferredCountries?.length ? extracted.preferredCountries : undefined,
        preferredResearchAreasJson: extracted.preferredResearchAreas?.length ? extracted.preferredResearchAreas : undefined,
        lastParsedAt: new Date(),
        parseStatus: CvParseStatus.parsed,
      },
    });

    await this.requestRefresh(userId, { force: true, targetType: 'all' });

    return {
      parseLogId: log.id,
      status: log.status,
      extracted,
    };
  }

  async requestRefresh(userId: string, dto: RefreshMatchesDto) {
    const job = await this.queues.enqueueAiMatchRefresh({
      userId,
      force: dto.force ?? false,
      targetType: dto.targetType || 'all',
    });

    return {
      queued: true,
      jobId: String(job.id),
      queueName: job.queueName,
    };
  }

  async getProfessorMatches(userId: string, query: MatchListQueryDto) {
    const page = this.pagination.clampPage(Number(query.page || 1));
    const perPage = this.pagination.clampPerPage(Number(query.perPage || 20), 50);
    const where: Prisma.ProfessorWhereInput = {
      status: 'active',
      isPublic: true,
      verificationStatus: 'verified',
    };

    if (query.q) {
      where.OR = [
        { fullName: { contains: query.q } },
        { bio: { contains: query.q } },
        { university: { name: { contains: query.q } } },
      ];
    }

    const professors = await this.prisma.professor.findMany({
      where,
      include: {
        university: { include: { country: true } },
        department: true,
        researchAreas: { include: { researchArea: true }, orderBy: { score: 'desc' }, take: 5 },
      },
      take: Math.min(perPage * 3, 60),
      orderBy: [{ hIndex: 'desc' }, { updatedAt: 'desc' }],
    });

    const scored = await Promise.all(professors.map(async (professor) => ({
      professor: {
        ...professor,
        hasVerifiedEmail: false,
      },
      match: await this.ensureProfessorMatch(userId, professor.id),
    })));

    const filtered = scored.filter((item) => (query.minScore ? item.match.score >= Number(query.minScore) : true));
    filtered.sort((a, b) => {
      if (query.sortBy === 'updatedAt') {
        return new Date(b.professor.updatedAt).getTime() - new Date(a.professor.updatedAt).getTime();
      }
      return b.match.score - a.match.score;
    });

    const total = filtered.length;
    const start = (page - 1) * perPage;
    const data = filtered.slice(start, start + perPage).map((item) => ({
      ...this.formatProfessor(item.professor),
      matchScore: item.match,
    }));

    return this.pagination.paginate(data, total, page, perPage);
  }

  async getProfessorMatch(userId: string, professorId: string) {
    const professor = await this.prisma.professor.findFirst({
      where: { id: professorId, status: 'active', isPublic: true, verificationStatus: 'verified' },
      include: {
        university: { include: { country: true } },
        department: true,
        researchAreas: { include: { researchArea: true }, orderBy: { score: 'desc' } },
        publications: { orderBy: [{ citationCount: 'desc' }, { publicationYear: 'desc' }], take: 10 },
      },
    });
    if (!professor) {
      throw new NotFoundException('Professor not found');
    }

    return {
      professor: this.formatProfessor(professor),
      match: await this.ensureProfessorMatch(userId, professorId),
    };
  }

  async getScholarshipMatches(userId: string, query: MatchListQueryDto) {
    const page = this.pagination.clampPage(Number(query.page || 1));
    const perPage = this.pagination.clampPerPage(Number(query.perPage || 20), 50);
    const where: Prisma.ScholarshipWhereInput = {
      status: ScholarshipStatus.active,
      verificationStatus: ScholarshipVerificationStatus.verified,
      isActive: true,
      isExpired: false,
    };

    if (query.q) {
      where.OR = [
        { title: { contains: query.q } },
        { providerName: { contains: query.q } },
      ];
    }

    const scholarships = await this.prisma.scholarship.findMany({
      where,
      include: {
        country: true,
        university: { include: { country: true } },
      },
      take: Math.min(perPage * 3, 60),
      orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
    });

    const scored = await Promise.all(scholarships.map(async (scholarship) => ({
      scholarship,
      match: await this.ensureScholarshipMatch(userId, scholarship.id),
    })));

    const filtered = scored.filter((item) => (query.minScore ? item.match.score >= Number(query.minScore) : true));
    filtered.sort((a, b) => {
      if (query.sortBy === 'deadline') {
        return new Date(a.scholarship.deadline || 0).getTime() - new Date(b.scholarship.deadline || 0).getTime();
      }
      return b.match.score - a.match.score;
    });

    const total = filtered.length;
    const start = (page - 1) * perPage;
    const data = filtered.slice(start, start + perPage).map((item) => ({
      ...item.scholarship,
      matchScore: item.match,
    }));

    return this.pagination.paginate(data, total, page, perPage);
  }

  async getScholarshipMatch(userId: string, scholarshipId: string) {
    const scholarship = await this.prisma.scholarship.findUnique({
      where: { id: scholarshipId },
      include: {
        country: true,
        university: { include: { country: true } },
        sources: { orderBy: { scrapedAt: 'desc' } },
      },
    });

    if (!scholarship) {
      throw new NotFoundException('Scholarship not found');
    }

    return {
      scholarship,
      match: await this.ensureScholarshipMatch(userId, scholarshipId),
    };
  }

  async getAdminStats() {
    const [profiles, professorMatches, scholarshipMatches, recentParses] = await Promise.all([
      this.prisma.studentAcademicProfile.count(),
      this.prisma.matchScore.count({ where: { targetType: MatchTargetType.professor } }),
      this.prisma.matchScore.count({ where: { targetType: MatchTargetType.scholarship } }),
      this.prisma.cvParseLog.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const avg = await this.prisma.matchScore.aggregate({
      _avg: { score: true },
      _max: { calculatedAt: true },
    });

    return {
      academicProfiles: profiles,
      professorMatches,
      scholarshipMatches,
      cvParsesLast24h: recentParses,
      averageMatchScore: Number(avg._avg.score || 0).toFixed(1),
      lastCalculatedAt: avg._max.calculatedAt,
    };
  }

  async getAdminJobs() {
    const queueNames = this.queues.getAiQueueNames();
    const items = await Promise.all(queueNames.map((queueName) => this.queues.getQueueSnapshot(queueName)));
    return {
      queues: items,
    };
  }

  async adminRecalculate(dto: AdminRecalculateMatchesDto) {
    if (dto.userId) {
      return this.requestRefresh(dto.userId, {
        force: dto.force ?? true,
        targetType: dto.targetType === 'professor' || dto.targetType === 'scholarship' ? dto.targetType : 'all',
      });
    }

    const users = await this.prisma.user.findMany({
      where: { role: 'user' },
      select: { id: true },
      take: 100,
      orderBy: { updatedAt: 'desc' },
    });

    const jobs = await Promise.all(users.map((user) => this.queues.enqueueAiMatchRefresh({
      userId: user.id,
      force: dto.force ?? true,
      targetType: dto.targetType === 'professor' || dto.targetType === 'scholarship' ? dto.targetType : 'all',
    })));

    return {
      queued: jobs.length,
      jobIds: jobs.map((job) => String(job.id)),
    };
  }

  async runProfileAnalysisJob(data: { userId: string }) {
    await this.ensureAcademicProfile(data.userId);
    await this.requestRefresh(data.userId, { force: true, targetType: 'all' });
    return { success: true };
  }

  async runProfessorMatchJob(data: { userId: string; professorId: string; force?: boolean }) {
    return this.ensureProfessorMatch(data.userId, data.professorId, data.force);
  }

  async runScholarshipMatchJob(data: { userId: string; scholarshipId: string; force?: boolean }) {
    return this.ensureScholarshipMatch(data.userId, data.scholarshipId, data.force);
  }

  async runRefreshMatchesJob(data: { userId: string; force?: boolean; targetType?: 'all' | 'professor' | 'scholarship' }) {
    const [professors, scholarships] = await Promise.all([
      data.targetType === 'scholarship'
        ? Promise.resolve([])
        : this.prisma.professor.findMany({
            where: { status: 'active', isPublic: true, verificationStatus: 'verified' },
            select: { id: true },
            take: 40,
            orderBy: [{ updatedAt: 'desc' }, { hIndex: 'desc' }],
          }),
      data.targetType === 'professor'
        ? Promise.resolve([])
        : this.prisma.scholarship.findMany({
            where: {
              status: ScholarshipStatus.active,
              verificationStatus: ScholarshipVerificationStatus.verified,
              isActive: true,
              isExpired: false,
            },
            select: { id: true },
            take: 40,
            orderBy: [{ updatedAt: 'desc' }, { deadline: 'asc' }],
          }),
    ]);

    const professorResults = await Promise.all(professors.map((item) => this.ensureProfessorMatch(data.userId, item.id, data.force)));
    const scholarshipResults = await Promise.all(scholarships.map((item) => this.ensureScholarshipMatch(data.userId, item.id, data.force)));

    return {
      professorMatches: professorResults.length,
      scholarshipMatches: scholarshipResults.length,
    };
  }

  private async ensureProfessorMatch(userId: string, professorId: string, force = false) {
    const [profile, professor, existing] = await Promise.all([
      this.buildProfileContext(userId),
      this.prisma.professor.findUnique({
        where: { id: professorId },
        include: {
          university: { include: { country: true } },
          department: true,
          researchAreas: { include: { researchArea: true } },
          publications: { take: 10, orderBy: [{ citationCount: 'desc' }, { publicationYear: 'desc' }] },
        },
      }),
      this.prisma.matchScore.findUnique({
        where: {
          userId_targetType_targetId: {
            userId,
            targetType: MatchTargetType.professor,
            targetId: professorId,
          },
        },
      }),
    ]);

    if (!professor) {
      throw new NotFoundException('Professor not found');
    }

    const targetHash = this.hashObject({
      updatedAt: professor.updatedAt,
      acceptingStudents: professor.acceptingStudents,
      fundingStatus: professor.fundingStatus,
      researchAreas: professor.researchAreas.map((item) => item.researchArea.name),
      department: professor.department?.name,
      university: professor.university?.name,
      country: professor.university?.country?.name,
    });

    if (!force && this.isMatchFresh(existing, profile.snapshotHash, targetHash, professor.updatedAt, profile.updatedAt)) {
      return this.formatMatch(existing!);
    }

    const computed = this.computeProfessorMatch(profile, professor);
    const saved = await this.prisma.matchScore.upsert({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: MatchTargetType.professor,
          targetId: professorId,
        },
      },
      create: {
        userId,
        targetType: MatchTargetType.professor,
        targetId: professorId,
        score: computed.score,
        scoreBand: computed.scoreBand,
        breakdownJson: computed.breakdown as Prisma.InputJsonValue,
        strengthsJson: computed.strengths as Prisma.InputJsonValue,
        weaknessesJson: computed.weaknesses as Prisma.InputJsonValue,
        recommendationsJson: computed.recommendations as Prisma.InputJsonValue,
        explanation: computed.explanation,
        aiSummary: computed.aiSummary,
        provider: computed.provider,
        modelName: computed.modelName,
        version: 'phase-5.0',
        profileSnapshotHash: profile.snapshotHash,
        targetSnapshotHash: targetHash,
        calculatedAt: new Date(),
      },
      update: {
        score: computed.score,
        scoreBand: computed.scoreBand,
        breakdownJson: computed.breakdown as Prisma.InputJsonValue,
        strengthsJson: computed.strengths as Prisma.InputJsonValue,
        weaknessesJson: computed.weaknesses as Prisma.InputJsonValue,
        recommendationsJson: computed.recommendations as Prisma.InputJsonValue,
        explanation: computed.explanation,
        aiSummary: computed.aiSummary,
        provider: computed.provider,
        modelName: computed.modelName,
        version: 'phase-5.0',
        profileSnapshotHash: profile.snapshotHash,
        targetSnapshotHash: targetHash,
        calculatedAt: new Date(),
      },
    });

    return this.formatMatch(saved);
  }

  private async ensureScholarshipMatch(userId: string, scholarshipId: string, force = false) {
    const [profile, scholarship, existing] = await Promise.all([
      this.buildProfileContext(userId),
      this.prisma.scholarship.findUnique({
        where: { id: scholarshipId },
        include: {
          country: true,
          university: { include: { country: true } },
        },
      }),
      this.prisma.matchScore.findUnique({
        where: {
          userId_targetType_targetId: {
            userId,
            targetType: MatchTargetType.scholarship,
            targetId: scholarshipId,
          },
        },
      }),
    ]);

    if (!scholarship) {
      throw new NotFoundException('Scholarship not found');
    }

    const targetHash = this.hashObject({
      updatedAt: scholarship.updatedAt,
      degreeLevel: scholarship.degreeLevel,
      degreeLevels: scholarship.degreeLevels,
      fieldsOfStudy: scholarship.fieldsOfStudy,
      researchAreas: scholarship.researchAreas,
      eligibility: scholarship.eligibility,
      country: scholarship.country?.name,
      deadline: scholarship.deadline,
      fundingType: scholarship.fundingType,
      fullyFunded: scholarship.isFullyFunded,
    });

    if (!force && this.isMatchFresh(existing, profile.snapshotHash, targetHash, scholarship.updatedAt, profile.updatedAt)) {
      return this.formatMatch(existing!);
    }

    const computed = this.computeScholarshipMatch(profile, scholarship);
    const saved = await this.prisma.matchScore.upsert({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: MatchTargetType.scholarship,
          targetId: scholarshipId,
        },
      },
      create: {
        userId,
        targetType: MatchTargetType.scholarship,
        targetId: scholarshipId,
        score: computed.score,
        scoreBand: computed.scoreBand,
        breakdownJson: computed.breakdown as Prisma.InputJsonValue,
        strengthsJson: computed.strengths as Prisma.InputJsonValue,
        weaknessesJson: computed.weaknesses as Prisma.InputJsonValue,
        recommendationsJson: computed.recommendations as Prisma.InputJsonValue,
        explanation: computed.explanation,
        aiSummary: computed.aiSummary,
        provider: computed.provider,
        modelName: computed.modelName,
        version: 'phase-5.0',
        profileSnapshotHash: profile.snapshotHash,
        targetSnapshotHash: targetHash,
        calculatedAt: new Date(),
      },
      update: {
        score: computed.score,
        scoreBand: computed.scoreBand,
        breakdownJson: computed.breakdown as Prisma.InputJsonValue,
        strengthsJson: computed.strengths as Prisma.InputJsonValue,
        weaknessesJson: computed.weaknesses as Prisma.InputJsonValue,
        recommendationsJson: computed.recommendations as Prisma.InputJsonValue,
        explanation: computed.explanation,
        aiSummary: computed.aiSummary,
        provider: computed.provider,
        modelName: computed.modelName,
        version: 'phase-5.0',
        profileSnapshotHash: profile.snapshotHash,
        targetSnapshotHash: targetHash,
        calculatedAt: new Date(),
      },
    });

    return this.formatMatch(saved);
  }

  private computeProfessorMatch(profile: Awaited<ReturnType<MatchEngineService['buildProfileContext']>>, professor: any): MatchComputation {
    const professorAreas = professor.researchAreas.map((item: any) => item.researchArea.name);
    const professorText = [professor.bio, professor.department?.name, professor.university?.name, ...professorAreas]
      .filter(Boolean)
      .join(' ');

    const researchScore = this.scoreOverlap(this.compactStrings(profile.researchTerms), professorAreas, 35);
    const fieldScore = this.scoreTextSimilarity(
      this.compactStrings([profile.currentDepartment, profile.currentUniversity, ...profile.preferredResearchAreas]),
      [professor.department?.name, professor.university?.name, professorText].filter(Boolean),
      20,
    );
    const skillScore = Math.min(100, Math.round(
      this.scoreTextSimilarity(profile.skillTerms, [professorText], 100).score * 0.5 +
      Math.min(profile.publicationsCount * 12, 50),
    ));
    const preferenceScore = this.scorePreferenceForProfessor(profile, professor);
    const acceptingScore = professor.acceptingStudents === 'yes' ? 100 : professor.acceptingStudents === 'no' ? 0 : 55;
    const completenessScore = profile.completeness;

    const breakdown = {
      researchAlignment: { score: researchScore.score, weight: 35, weighted: researchScore.weighted },
      fieldAlignment: { score: fieldScore.score, weight: 20, weighted: fieldScore.weighted },
      skillsAndPublications: { score: skillScore, weight: 15, weighted: this.applyWeight(skillScore, 15) },
      countryAndUniversityPreference: { score: preferenceScore, weight: 10, weighted: this.applyWeight(preferenceScore, 10) },
      acceptingStudents: { score: acceptingScore, weight: 10, weighted: this.applyWeight(acceptingScore, 10) },
      profileCompleteness: { score: completenessScore, weight: 10, weighted: this.applyWeight(completenessScore, 10) },
    };

    const score = this.sumWeighted(breakdown);
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    if (researchScore.score >= 70) strengths.push('Strong overlap between your research interests and the professor research areas.');
    else weaknesses.push('Research overlap is moderate or narrow for this professor.');

    if (acceptingScore >= 100) strengths.push('Professor is currently marked as accepting students.');
    if (acceptingScore === 0) weaknesses.push('Professor is currently marked as not accepting students.');

    if (preferenceScore >= 70) strengths.push('University or country preferences align well with this professor.');
    else recommendations.push('Consider broadening country or university preferences to unlock more professor matches.');

    if (profile.completeness < 70) recommendations.push('Complete more of your student and academic profile to improve matching confidence.');
    if (skillScore < 50) recommendations.push('Add more technical skills, publications, or research detail to improve evidence of fit.');

    return {
      score,
      scoreBand: this.scoreBand(score),
      breakdown,
      strengths,
      weaknesses,
      recommendations,
      explanation: `Professor match ${score}/100 based on research alignment, department fit, profile strength, and supervision availability.`,
      aiSummary: `This professor is a ${this.scoreBand(score)} fit. Research alignment is ${researchScore.score >= 70 ? 'strong' : researchScore.score >= 45 ? 'moderate' : 'limited'}, and the current supervision signal is ${acceptingScore >= 100 ? 'favorable' : acceptingScore === 0 ? 'unfavorable' : 'uncertain'}.`,
      provider: AIModelProvider.deterministic,
      modelName: 'deterministic-phase5-professor-v1',
    };
  }

  private computeScholarshipMatch(profile: Awaited<ReturnType<MatchEngineService['buildProfileContext']>>, scholarship: any): MatchComputation {
    const scholarshipAreas = this.ensureStringArray(scholarship.fieldsOfStudy).concat(this.ensureStringArray(scholarship.researchAreas));
    const degreeLevels = this.ensureStringArray(scholarship.degreeLevels).concat(scholarship.degreeLevel ? [scholarship.degreeLevel] : []);
    const scholarshipText = [scholarship.title, scholarship.description, scholarship.eligibilityCriteria, scholarship.eligibility, ...scholarshipAreas]
      .filter(Boolean)
      .join(' ');

    const degreeScore = degreeLevels.some((item) => String(item).toLowerCase().includes(String(profile.targetDegree || '').toLowerCase())) ? 100 : 30;
    const fieldScore = this.scoreOverlap(this.compactStrings(profile.researchTerms), scholarshipAreas, 25);
    const countryScore = this.scoreScholarshipCountryPreference(profile, scholarship);
    const eligibilityScore = this.scoreScholarshipEligibility(profile, scholarshipText);
    const deadlineScore = this.scoreScholarshipDeadline(scholarship.deadline);
    const fundingScore = this.scoreScholarshipFunding(profile, scholarship);

    const breakdown = {
      degreeFit: { score: degreeScore, weight: 25, weighted: this.applyWeight(degreeScore, 25) },
      fieldAlignment: { score: fieldScore.score, weight: 25, weighted: fieldScore.weighted },
      countryPreference: { score: countryScore, weight: 15, weighted: this.applyWeight(countryScore, 15) },
      eligibilityFit: { score: eligibilityScore, weight: 20, weighted: this.applyWeight(eligibilityScore, 20) },
      deadlineTiming: { score: deadlineScore, weight: 10, weighted: this.applyWeight(deadlineScore, 10) },
      fundingPreference: { score: fundingScore, weight: 5, weighted: this.applyWeight(fundingScore, 5) },
    };

    const score = this.sumWeighted(breakdown);
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    if (degreeScore >= 100) strengths.push('Scholarship degree level aligns with your target program.');
    else weaknesses.push('Degree targeting is not a perfect fit for your stated goals.');

    if (countryScore >= 70) strengths.push('Destination country aligns with your preferences.');
    if (deadlineScore < 40) weaknesses.push('Deadline is either too close or already passed for a strong application window.');
    if (fundingScore >= 80) strengths.push('Funding structure aligns well with your stated funding preference.');

    if (eligibilityScore < 55) recommendations.push('Review eligibility requirements carefully before applying.');
    if (fieldScore.score < 50) recommendations.push('Improve your research summary and preferred research areas to surface more relevant scholarships.');

    return {
      score,
      scoreBand: this.scoreBand(score),
      breakdown,
      strengths,
      weaknesses,
      recommendations,
      explanation: `Scholarship match ${score}/100 based on degree fit, field alignment, country preference, eligibility, deadline timing, and funding structure.`,
      aiSummary: `This scholarship is a ${this.scoreBand(score)} fit. Degree and research fit are ${degreeScore >= 100 && fieldScore.score >= 65 ? 'strong' : 'mixed'}, while timing is ${deadlineScore >= 70 ? 'comfortable' : deadlineScore >= 40 ? 'moderate' : 'tight'}.`,
      provider: AIModelProvider.deterministic,
      modelName: 'deterministic-phase5-scholarship-v1',
    };
  }

  private async buildProfileContext(userId: string) {
    const [studentProfile, academicProfile] = await Promise.all([
      this.prisma.studentProfile.findUnique({
        where: { userId },
        include: {
          researchInterest: true,
          skills: true,
          publications: true,
          educations: { orderBy: [{ isCurrent: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] },
          preference: true,
        },
      }),
      this.ensureAcademicProfile(userId),
    ]);

    const currentEducation = studentProfile?.educations?.find((item) => item.isCurrent) || studentProfile?.educations?.[0];
    const researchTerms = [
      studentProfile?.researchInterest?.primaryArea,
      ...(studentProfile?.researchInterest?.secondaryAreas as string[] || []),
      ...(studentProfile?.researchInterest?.keywords as string[] || []),
      ...(this.ensureStringArray(academicProfile.preferredResearchAreasJson)),
      academicProfile.researchSummary || '',
      academicProfile.cvText || '',
    ];

    const preferredCountries = [
      ...(studentProfile?.researchInterest?.preferredCountries as string[] || []),
      ...(studentProfile?.preference?.targetCountries as string[] || []),
      ...(this.ensureStringArray(academicProfile.preferredCountriesJson)),
    ];

    const preferredUniversities = this.ensureStringArray(academicProfile.preferredUniversitiesJson);
    const preferredResearchAreas = this.ensureStringArray(academicProfile.preferredResearchAreasJson);
    const skillTerms = studentProfile?.skills?.map((item) => item.name) || [];
    const completeness = studentProfile?.profileCompleteness || 0;
    const updatedAt = new Date(Math.max(
      studentProfile?.updatedAt?.getTime() || 0,
      academicProfile.updatedAt.getTime(),
    ));

    const snapshot = {
      currentDegreeLevel: academicProfile.currentDegreeLevel || currentEducation?.degreeLevel,
      currentUniversity: academicProfile.currentUniversity || currentEducation?.university,
      currentDepartment: academicProfile.currentDepartment || currentEducation?.department,
      targetDegree: academicProfile.targetDegree || studentProfile?.preference?.targetDegree || studentProfile?.researchInterest?.interestedDegree,
      researchTerms,
      preferredCountries,
      preferredUniversities,
      preferredFundingTypes: this.ensureStringArray(academicProfile.preferredFundingTypesJson),
      preferredResearchAreas,
      skillTerms,
      publicationsCount: academicProfile.publicationsCount || studentProfile?.publications?.length || 0,
      completeness,
    };

    return {
      ...snapshot,
      updatedAt,
      snapshotHash: this.hashObject(snapshot),
    };
  }

  private async ensureAcademicProfile(userId: string) {
    const existing = await this.prisma.studentAcademicProfile.findUnique({ where: { userId } });
    if (existing) {
      return existing;
    }

    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        educations: { orderBy: [{ isCurrent: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] },
        researchInterest: true,
        preference: true,
        publications: true,
      },
    });

    const currentEducation = studentProfile?.educations?.find((item) => item.isCurrent) || studentProfile?.educations?.[0];

    return this.prisma.studentAcademicProfile.create({
      data: {
        userId,
        currentDegreeLevel: currentEducation?.degreeLevel,
        currentUniversity: currentEducation?.university,
        currentDepartment: currentEducation?.department,
        targetDegree: this.toInterestedDegree(studentProfile?.preference?.targetDegree || studentProfile?.researchInterest?.interestedDegree),
        targetIntake: studentProfile?.preference?.targetIntake || studentProfile?.researchInterest?.preferredIntake,
        gpa: currentEducation?.cgpa ?? null,
        gradingScale: currentEducation?.gradingScale || null,
        researchSummary: studentProfile?.shortBio || studentProfile?.careerGoal || null,
        publicationsCount: studentProfile?.publications?.length || 0,
        preferredCountriesJson: (studentProfile?.preference?.targetCountries as string[] || studentProfile?.researchInterest?.preferredCountries as string[] || []),
        preferredResearchAreasJson: (studentProfile?.researchInterest?.secondaryAreas as string[] || []),
        parseStatus: CvParseStatus.pending,
      },
    });
  }

  private serializeAcademicProfile(profile: AcademicProfileShape) {
    return {
      ...profile,
      preferredCountries: this.ensureStringArray(profile.preferredCountriesJson),
      preferredUniversities: this.ensureStringArray(profile.preferredUniversitiesJson),
      preferredFundingTypes: this.ensureStringArray(profile.preferredFundingTypesJson),
      preferredResearchAreas: this.ensureStringArray(profile.preferredResearchAreasJson),
    };
  }

  private formatMatch(match: any) {
    return {
      id: match.id,
      targetType: match.targetType,
      targetId: match.targetId,
      score: match.score,
      scoreBand: match.scoreBand,
      breakdown: match.breakdownJson,
      strengths: match.strengthsJson || [],
      weaknesses: match.weaknessesJson || [],
      recommendations: match.recommendationsJson || [],
      explanation: match.explanation,
      aiSummary: match.aiSummary,
      provider: match.provider,
      modelName: match.modelName,
      version: match.version,
      calculatedAt: match.calculatedAt,
    };
  }

  private formatProfessor(professor: any) {
    return {
      ...professor,
      researchAreas: professor.researchAreas?.map((item: any) => ({
        id: item.researchArea?.id || item.id,
        name: item.researchArea?.name || item.name,
        slug: item.researchArea?.slug || item.slug,
        score: item.score,
        isPrimary: item.isPrimary,
      })),
    };
  }

  private extractCvSignals(rawText: string) {
    const text = rawText.replace(/\r/g, '');
    const degreeMatch = text.match(/\b(phd|doctorate|msc|master|bsc|bachelor|postdoc)\b/i)?.[1]?.toLowerCase() || null;
    const gpaMatch = text.match(/\b(?:gpa|cgpa)\s*[:\-]?\s*(\d(?:\.\d{1,2})?)\b/i);
    const publicationsMatch = text.match(/\bpublications?\b[\s:]*([0-9]{1,2})?/i);
    const universityMatch = text.match(/\b(?:university|institute|college)\b[^\n]{0,80}/i)?.[0] || null;
    const departmentMatch = text.match(/\b(?:department|school|faculty)\b[^\n]{0,80}/i)?.[0] || null;
    const countryMentions = Array.from(new Set((text.match(/\b(usa|united states|canada|uk|united kingdom|germany|france|australia|singapore|netherlands|sweden)\b/gi) || []).map((item) => item.trim())));
    const areaMentions = Array.from(new Set((text.match(/\b(ai|artificial intelligence|machine learning|nlp|computer vision|robotics|data science|bioinformatics|systems|security)\b/gi) || []).map((item) => item.trim())));
    const researchSummary = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 20).slice(0, 3).join(' ');

    return {
      currentDegreeLevel: this.normalizeDegreeFromText(degreeMatch),
      currentUniversity: universityMatch,
      currentDepartment: departmentMatch,
      targetDegree: degreeMatch && degreeMatch.includes('postdoc') ? 'POSTDOC' : degreeMatch?.includes('phd') ? 'PHD' : 'MASTER',
      gpa: gpaMatch ? Number(gpaMatch[1]) : null,
      publicationsCount: publicationsMatch?.[1] ? Number(publicationsMatch[1]) : undefined,
      researchExperienceYears: this.extractYears(text),
      preferredCountries: countryMentions,
      preferredResearchAreas: areaMentions,
      researchSummary,
    };
  }

  private extractYears(text: string) {
    const matches = text.match(/([0-9]+(?:\.[0-9])?)\s*\+?\s*years?/i);
    return matches ? Number(matches[1]) : undefined;
  }

  private normalizeDegreeFromText(value: string | null) {
    if (!value) return undefined;
    if (value.includes('phd') || value.includes('doctor')) return 'PHD';
    if (value.includes('master') || value.includes('msc')) return 'MASTER';
    if (value.includes('bachelor') || value.includes('bsc')) return 'BACHELOR';
    return undefined;
  }

  private isMatchFresh(existing: any, profileHash: string, targetHash: string, targetUpdatedAt: Date, profileUpdatedAt: Date) {
    if (!existing) return false;
    if (existing.profileSnapshotHash !== profileHash || existing.targetSnapshotHash !== targetHash) return false;
    if (Date.now() - new Date(existing.calculatedAt).getTime() > this.staleMs) return false;
    if (new Date(existing.calculatedAt).getTime() < Math.max(targetUpdatedAt.getTime(), profileUpdatedAt.getTime())) return false;
    return true;
  }

  private scoreOverlap(sourceTerms: string[], targetTerms: string[], weight: number) {
    const source = new Set(this.normalizeTerms(sourceTerms));
    const target = new Set(this.normalizeTerms(targetTerms));
    if (!source.size || !target.size) {
      return { score: 25, weighted: this.applyWeight(25, weight) };
    }
    const intersection = [...source].filter((item) => target.has(item));
    const union = new Set([...source, ...target]);
    const score = Math.max(20, Math.min(100, Math.round((intersection.length / union.size) * 100)));
    return { score, weighted: this.applyWeight(score, weight) };
  }

  private scoreTextSimilarity(sourceTerms: string[], targetTerms: string[], weight: number) {
    const source = this.normalizeTerms(sourceTerms);
    const targetText = this.normalizeTerms(targetTerms).join(' ');
    if (!source.length || !targetText) {
      return { score: 35, weighted: this.applyWeight(35, weight) };
    }
    const hits = source.filter((term) => targetText.includes(term));
    const score = Math.max(20, Math.min(100, Math.round((hits.length / source.length) * 100)));
    return { score, weighted: this.applyWeight(score, weight) };
  }

  private scorePreferenceForProfessor(profile: Awaited<ReturnType<MatchEngineService['buildProfileContext']>>, professor: any) {
    let score = 40;
    const country = `${professor.university?.country?.name || ''} ${professor.university?.country?.isoAlpha2 || ''}`;
    const countryHit = this.normalizeTerms(profile.preferredCountries).some((term) => country.toLowerCase().includes(term));
    const universityHit = this.normalizeTerms(profile.preferredUniversities).some((term) => String(professor.university?.name || '').toLowerCase().includes(term));
    if (countryHit) score += 30;
    if (universityHit) score += 30;
    return Math.min(score, 100);
  }

  private scoreScholarshipCountryPreference(profile: Awaited<ReturnType<MatchEngineService['buildProfileContext']>>, scholarship: any) {
    if (!profile.preferredCountries.length) return 55;
    const candidates = [scholarship.country?.name, scholarship.country?.isoAlpha2, scholarship.university?.country?.name]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return this.normalizeTerms(profile.preferredCountries).some((term) => candidates.includes(term)) ? 100 : 25;
  }

  private scoreScholarshipEligibility(profile: Awaited<ReturnType<MatchEngineService['buildProfileContext']>>, scholarshipText: string) {
    let score = 50;
    const normalized = scholarshipText.toLowerCase();
    if (profile.targetDegree && normalized.includes(String(profile.targetDegree).toLowerCase())) score += 20;
    if (profile.currentDegreeLevel && normalized.includes(String(profile.currentDegreeLevel).toLowerCase())) score += 15;
    if (this.compactStrings(profile.researchTerms).some((term) => normalized.includes(term.toLowerCase()))) score += 15;
    return Math.min(score, 100);
  }

  private scoreScholarshipDeadline(deadline?: Date | null) {
    if (!deadline) return 50;
    const days = Math.floor((new Date(deadline).getTime() - Date.now()) / 86400000);
    if (days < 0) return 0;
    if (days <= 7) return 35;
    if (days <= 30) return 70;
    return 100;
  }

  private scoreScholarshipFunding(profile: Awaited<ReturnType<MatchEngineService['buildProfileContext']>>, scholarship: any) {
    const preferences = this.ensureStringArray(profile.preferredFundingTypes || []);
    if (!preferences.length) {
      return scholarship.isFullyFunded ? 100 : 60;
    }
    const scholarshipTerms = `${scholarship.fundingType} ${scholarship.isFullyFunded ? 'fully funded' : ''}`.toLowerCase();
    return preferences.some((item) => scholarshipTerms.includes(item.toLowerCase())) ? 100 : 35;
  }

  private ensureStringArray(value: unknown) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item)).filter(Boolean);
    }
    return [];
  }

  private normalizeTerms(values: string[]) {
    return values
      .flatMap((item) => String(item || '').toLowerCase().split(/[^a-z0-9]+/))
      .filter((item) => item.length >= 3);
  }

  private compactStrings(values: Array<string | undefined | null>) {
    return values.filter((item): item is string => Boolean(item && item.trim()));
  }

  private applyWeight(score: number, weight: number) {
    return Math.round((score * weight) / 100);
  }

  private sumWeighted(breakdown: Record<string, { weighted: number }>) {
    return Object.values(breakdown).reduce((sum, item) => sum + item.weighted, 0);
  }

  private scoreBand(score: number) {
    if (score >= 80) return 'excellent';
    if (score >= 65) return 'good';
    if (score >= 45) return 'moderate';
    return 'low';
  }

  private hashObject(value: unknown) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  private toDegreeLevel(value?: string | null) {
    if (!value) return undefined;
    const normalized = value.toUpperCase();
    if ((Object.values(StudentDegreeLevel) as string[]).includes(normalized)) {
      return normalized as StudentDegreeLevel;
    }
    return undefined;
  }

  private toInterestedDegree(value?: string | null) {
    if (!value) return undefined;
    const normalized = value.toUpperCase();
    if ((Object.values(StudentInterestedDegree) as string[]).includes(normalized)) {
      return normalized as StudentInterestedDegree;
    }
    return undefined;
  }
}
