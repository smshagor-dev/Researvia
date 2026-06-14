import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { EmailAccountsService } from '../email-accounts/email-accounts.service';
import { ProfessorSyncQueueService } from '../queues/professor-sync-queue.service';
import {
  ExperienceType,
  Prisma,
  SkillCategory,
  StudentDocumentType,
} from '@prisma/client';

@Injectable()
export class StudentProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly emailAccounts: EmailAccountsService,
    private readonly queues: ProfessorSyncQueueService,
  ) {}

  async getProfile(userId: string) {
    await this.ensureStudentProfileForUserId(userId);
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        educations: { orderBy: [{ isCurrent: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] },
        researchInterest: true,
        skills: true,
        experiences: true,
        projects: true,
        publications: true,
        documents: true,
        testScores: true,
        preference: true,
      },
    });

    if (!profile) {
      return { profile: null, completeness: this.emptyCompleteness() };
    }

    return {
      profile: this.serializeProfile(profile),
      completeness: this.buildCompleteness(profile),
    };
  }

  async submitOnboarding(userId: string, dto: any) {
    await this.upsertStudentProfile(userId, dto.basic, dto.academic, dto.research, dto.skills, dto.preferences, dto.onboardingStep, dto.onboardingCompleted ?? true);
    return this.getProfile(userId);
  }

  async updateBasic(userId: string, dto: any) {
    const profile = await this.ensureStudentProfile(userId);
    await this.prisma.studentProfile.update({
      where: { id: profile.id },
      data: {
        fullName: dto.fullName ?? profile.fullName,
        preferredName: dto.preferredName,
        nationality: dto.nationality ?? profile.nationality,
        currentCountry: dto.currentCountry ?? profile.currentCountry,
        city: dto.city,
        phone: dto.phone,
        whatsapp: dto.whatsapp,
        linkedin: dto.linkedin,
        github: dto.github,
        website: dto.personalWebsite,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
      },
    });
    return this.recalculateAndGet(userId);
  }

  async updateAcademic(userId: string, dto: any) {
    const profile = await this.ensureStudentProfile(userId);
    await this.replaceEducationBlock(profile.id, dto);
    return this.recalculateAndGet(userId);
  }

  async updateResearch(userId: string, dto: any) {
    const profile = await this.ensureStudentProfile(userId);
    await this.prisma.studentResearchInterest.upsert({
      where: { studentProfileId: profile.id },
      update: this.mapResearch(dto),
      create: { studentProfileId: profile.id, ...this.mapResearch(dto) },
    });
    return this.recalculateAndGet(userId);
  }

  async updateSkills(userId: string, dto: any) {
    const profile = await this.ensureStudentProfile(userId);
    await this.replaceSkillsBlock(profile.id, dto);
    return this.recalculateAndGet(userId);
  }

  async updatePreferences(userId: string, dto: any) {
    const profile = await this.ensureStudentProfile(userId);

    if (dto.defaultSendingEmailAccountId) {
      const accounts = await this.emailAccounts.getEmailAccounts(userId);
      if (!accounts.some((account: any) => account.id === dto.defaultSendingEmailAccountId)) {
        throw new BadRequestException('Default sending email account is invalid');
      }
    }

    await this.prisma.studentProfile.update({
      where: { id: profile.id },
      data: {
        shortBio: dto.shortBio,
        careerGoal: dto.careerGoal,
        whyInterestedInResearch: dto.whyInterestedInResearch,
      },
    });

    await this.prisma.studentPreference.upsert({
      where: { studentProfileId: profile.id },
      update: {
        preferredEmailTone: dto.preferredEmailTone,
        emailSignature: dto.emailSignature,
        defaultSendingEmailAccountId: dto.defaultSendingEmailAccountId,
        targetDegree: dto.targetDegree,
        targetCountries: dto.targetCountries,
        targetIntake: dto.targetIntake,
        budgetRange: dto.budgetRange,
        englishTest: dto.englishTest,
        englishScore: dto.englishScore,
        greScore: dto.greScore,
        gmatScore: dto.gmatScore,
        publicationCount: dto.publicationCount,
      },
      create: {
        studentProfileId: profile.id,
        preferredEmailTone: dto.preferredEmailTone,
        emailSignature: dto.emailSignature,
        defaultSendingEmailAccountId: dto.defaultSendingEmailAccountId,
        targetDegree: dto.targetDegree,
        targetCountries: dto.targetCountries,
        targetIntake: dto.targetIntake,
        budgetRange: dto.budgetRange,
        englishTest: dto.englishTest,
        englishScore: dto.englishScore,
        greScore: dto.greScore,
        gmatScore: dto.gmatScore,
        publicationCount: dto.publicationCount,
      },
    });

    return this.recalculateAndGet(userId);
  }

  async updateProfile(userId: string, dto: any) {
    if (dto.basic) await this.updateBasic(userId, dto.basic);
    if (dto.academic) await this.updateAcademic(userId, dto.academic);
    if (dto.research) await this.updateResearch(userId, dto.research);
    if (dto.skills) await this.updateSkills(userId, dto.skills);
    if (dto.preferences) await this.updatePreferences(userId, dto.preferences);
    if (dto.onboardingStep || dto.onboardingCompleted !== undefined) {
      const profile = await this.ensureStudentProfile(userId);
      await this.prisma.studentProfile.update({
        where: { id: profile.id },
        data: {
          onboardingStep: dto.onboardingStep ?? profile.onboardingStep,
          onboardingCompleted: dto.onboardingCompleted ?? profile.onboardingCompleted,
        },
      });
    }
    return this.recalculateAndGet(userId);
  }

  async uploadDocument(userId: string, type: StudentDocumentType, file: Express.Multer.File) {
    const profile = await this.ensureStudentProfile(userId);
    this.validateDocumentFile(file);

    const key = `student-documents/${userId}/${type.toLowerCase()}/${Date.now()}-${file.originalname}`;
    await this.storage.upload(key, file.buffer, file.mimetype);

    const created = await this.prisma.studentDocument.create({
      data: {
        studentProfileId: profile.id,
        type,
        fileKey: key,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
    });

    await this.queues.enqueueAiProfileAnalysis({ userId, source: 'profile-update' });

    return {
      document: created,
      signedUrl: await this.storage.getSignedUrl(key),
    };
  }

  async deleteDocument(userId: string, documentId: string) {
    const profile = await this.ensureStudentProfile(userId);
    const document = await this.prisma.studentDocument.findFirst({
      where: { id: documentId, studentProfileId: profile.id },
    });
    if (!document) throw new NotFoundException('Document not found');

    await this.storage.delete(document.fileKey);
    await this.prisma.studentDocument.delete({ where: { id: documentId } });
    await this.queues.enqueueAiProfileAnalysis({ userId, source: 'profile-update' });
    return { success: true };
  }

  async getCompleteness(userId: string) {
    await this.ensureStudentProfileForUserId(userId);
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        educations: { orderBy: [{ isCurrent: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] },
        researchInterest: true,
        skills: true,
        documents: true,
        preference: true,
      },
    });
    if (!profile) return this.emptyCompleteness();
    return this.buildCompleteness(profile);
  }

  async getStudents(page = 1, perPage = 20, search?: string) {
    const skip = (page - 1) * perPage;
    const where: Prisma.StudentProfileWhereInput = search
      ? {
          OR: [
            { fullName: { contains: search } },
            { nationality: { contains: search } },
            { user: { email: { contains: search } } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.studentProfile.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, status: true, createdAt: true } },
          educations: { orderBy: [{ isCurrent: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] },
          researchInterest: true,
        },
      }),
      this.prisma.studentProfile.count({ where }),
    ]);

    return {
      data: data.map((item) => this.serializeProfile(item)),
      meta: { page, perPage, total, lastPage: Math.ceil(total / perPage) },
    };
  }

  async getStudentByUserId(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, email: true, status: true, createdAt: true } },
        educations: { orderBy: [{ isCurrent: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] },
        researchInterest: true,
        skills: true,
        experiences: true,
        projects: true,
        publications: true,
        documents: true,
        preference: true,
      },
    });
    if (!profile) throw new NotFoundException('Student profile not found');
    return { profile: this.serializeProfile(profile), completeness: this.buildCompleteness(profile) };
  }

  async ensureStudentProfileForUserId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, role: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.ensureStudentProfileForUser(user);
  }

  async ensureStudentProfileForUser(user: { id: string; email: string; fullName: string; role?: string }) {
    const normalizedRole = String(user.role || '').toLowerCase();
    if (!['user', 'student'].includes(normalizedRole)) {
      return null;
    }

    const existing = await this.prisma.studentProfile.findUnique({ where: { userId: user.id } });
    if (existing) return existing;

    return this.prisma.studentProfile.create({
      data: {
        userId: user.id,
        fullName: user.fullName || user.email,
        nationality: 'Unknown',
        currentCountry: 'Unknown',
        onboardingCompleted: false,
        onboardingStep: 1,
        profileCompleteness: 0,
      },
    });
  }

  async getStudentSessionMeta(userId: string) {
    const [profile, systemMailbox] = await Promise.all([
      this.prisma.studentProfile.findUnique({
        where: { userId },
        include: { preference: true },
      }),
      this.prisma.emailAccount.findFirst({
        where: { userId, type: 'SYSTEM' },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      hasStudentProfile: Boolean(profile),
      studentOnboardingCompleted: Boolean(profile?.onboardingCompleted),
      profileCompleteness: profile?.profileCompleteness ?? 0,
      systemMailboxEmail: systemMailbox?.email ?? null,
    };
  }

  private async upsertStudentProfile(
    userId: string,
    basic: any,
    academic: any,
    research: any,
    skills: any,
    preferences?: any,
    onboardingStep = 5,
    onboardingCompleted = true,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const profile = await this.prisma.studentProfile.upsert({
      where: { userId },
      update: {
        fullName: basic.fullName || user.fullName,
        preferredName: basic.preferredName,
        nationality: basic.nationality,
        currentCountry: basic.currentCountry,
        city: basic.city,
        phone: basic.phone,
        whatsapp: basic.whatsapp,
        linkedin: basic.linkedin,
        github: basic.github,
        website: basic.personalWebsite,
        gender: basic.gender,
        dateOfBirth: basic.dateOfBirth ? new Date(basic.dateOfBirth) : null,
        onboardingStep,
        onboardingCompleted,
      },
      create: {
        userId,
        fullName: basic.fullName || user.fullName,
        preferredName: basic.preferredName,
        nationality: basic.nationality,
        currentCountry: basic.currentCountry,
        city: basic.city,
        phone: basic.phone,
        whatsapp: basic.whatsapp,
        linkedin: basic.linkedin,
        github: basic.github,
        website: basic.personalWebsite,
        gender: basic.gender,
        dateOfBirth: basic.dateOfBirth ? new Date(basic.dateOfBirth) : null,
        onboardingStep,
        onboardingCompleted,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { fullName: basic.fullName || user.fullName },
    });

    await this.replaceEducationBlock(profile.id, academic);

    await this.prisma.studentResearchInterest.upsert({
      where: { studentProfileId: profile.id },
      update: this.mapResearch(research),
      create: { studentProfileId: profile.id, ...this.mapResearch(research) },
    });

    await this.replaceSkillsBlock(profile.id, skills);

    if (preferences) {
      await this.updatePreferences(userId, preferences);
    } else {
      await this.recalculateCompleteness(profile.id);
    }
  }

  private mapAcademic(dto: any, isCurrent = false, sortOrder = 0) {
    return {
      isCurrent,
      sortOrder,
      degreeLevel: dto.currentDegreeLevel,
      university: dto.currentUniversity,
      department: dto.department,
      majorSubject: dto.majorSubject,
      faculty: dto.faculty,
      currentYear: dto.currentYear,
      expectedGraduationYear: dto.expectedGraduationYear,
      cgpa: dto.cgpa,
      gradingScale: dto.gradingScale,
      thesisTitle: dto.thesisTitle,
      supervisorName: dto.supervisorName,
    };
  }

  private mapAdditionalAcademic(dto: any, sortOrder: number) {
    return this.mapAcademic(dto, false, sortOrder);
  }

  private mapResearch(dto: any) {
    return {
      primaryArea: dto.primaryResearchArea,
      secondaryAreas: dto.secondaryResearchAreas || [],
      keywords: dto.keywords || [],
      preferredTopics: dto.preferredResearchTopics || [],
      interestedDegree: dto.interestedDegree,
      preferredCountries: dto.preferredStudyCountries,
      preferredUniversities: dto.preferredUniversities || [],
      preferredIntake: dto.preferredIntake,
      fundingNeed: Array.isArray(dto.fundingNeed) ? dto.fundingNeed : (dto.fundingNeed ? [dto.fundingNeed] : []),
    };
  }

  private async replaceSkillsBlock(profileId: string, dto: any) {
    await this.prisma.$transaction([
      this.prisma.studentSkill.deleteMany({ where: { studentProfileId: profileId } }),
      this.prisma.studentExperience.deleteMany({ where: { studentProfileId: profileId } }),
      this.prisma.studentProject.deleteMany({ where: { studentProfileId: profileId } }),
      this.prisma.studentPublication.deleteMany({ where: { studentProfileId: profileId } }),
    ]);

    if (dto.skills?.length) {
      await this.prisma.studentSkill.createMany({
        data: dto.skills.map((skill: any) => ({
          studentProfileId: profileId,
          category: skill.category as SkillCategory,
          name: skill.name,
          level: skill.level,
        })),
      });
    }

    for (const item of dto.experiences || []) {
      await this.prisma.studentExperience.create({
        data: {
          studentProfileId: profileId,
          type: item.type as ExperienceType,
          title: item.title,
          organization: item.organization,
          startDate: item.startDate ? new Date(item.startDate) : null,
          endDate: item.endDate ? new Date(item.endDate) : null,
          description: item.description,
        },
      });
    }

    for (const item of dto.projects || []) {
      await this.prisma.studentProject.create({
        data: {
          studentProfileId: profileId,
          title: item.title,
          description: item.description,
          technologies: item.technologies || [],
          link: item.link,
        },
      });
    }

    for (const item of dto.publications || []) {
      await this.prisma.studentPublication.create({
        data: {
          studentProfileId: profileId,
          title: item.title,
          journalOrConference: item.journalOrConference,
          year: item.year,
          doi: item.doi,
          url: item.url,
          publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
          description: item.description,
        },
      });
    }

    await this.recalculateCompleteness(profileId);
  }

  private async replaceEducationBlock(profileId: string, dto: any) {
    const items = [
      this.mapAcademic(dto, true, 0),
      ...((dto.additionalEducation || []).map((item: any, index: number) => this.mapAdditionalAcademic(item, index + 1))),
    ];

    await this.prisma.$transaction([
      this.prisma.studentEducation.deleteMany({ where: { studentProfileId: profileId } }),
      ...items.map((item) => this.prisma.studentEducation.create({
        data: {
          studentProfileId: profileId,
          ...item,
        },
      })),
    ]);
  }

  private async ensureStudentProfile(userId: string) {
    const profile = await this.ensureStudentProfileForUserId(userId);
    if (!profile) throw new NotFoundException('Student profile not found');
    return profile;
  }

  private async recalculateAndGet(userId: string) {
    const profile = await this.ensureStudentProfile(userId);
    await this.recalculateCompleteness(profile.id);
    await this.queues.enqueueAiProfileAnalysis({ userId, source: 'profile-update' });
    return this.getProfile(userId);
  }

  private async recalculateCompleteness(profileId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { id: profileId },
      include: {
        educations: { orderBy: [{ isCurrent: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] },
        researchInterest: true,
        skills: true,
        documents: true,
        preference: true,
      },
    });
    if (!profile) return;

    const completeness = this.buildCompleteness(profile);
    await this.prisma.studentProfile.update({
      where: { id: profileId },
      data: {
        profileCompleteness: completeness.percentage,
        onboardingCompleted: completeness.percentage >= 60 ? profile.onboardingCompleted : false,
      },
    });
  }

  private buildCompleteness(profile: any) {
    const currentEducation = this.getCurrentEducation(profile);
    const checks = [
      ['fullName', !!profile.fullName],
      ['nationality', !!profile.nationality],
      ['currentCountry', !!profile.currentCountry],
      ['currentDegreeLevel', !!currentEducation?.degreeLevel],
      ['currentUniversity', !!currentEducation?.university],
      ['department', !!currentEducation?.department],
      ['majorSubject', !!currentEducation?.majorSubject],
      ['expectedGraduationYear', !!currentEducation?.expectedGraduationYear],
      ['primaryResearchArea', !!profile.researchInterest?.primaryArea],
      ['interestedDegree', !!profile.researchInterest?.interestedDegree],
      ['preferredStudyCountries', Array.isArray(profile.researchInterest?.preferredCountries) && profile.researchInterest.preferredCountries.length > 0],
      ['fundingNeed', Array.isArray(profile.researchInterest?.fundingNeed) && profile.researchInterest.fundingNeed.length > 0],
      ['skills', Array.isArray(profile.skills) && profile.skills.length > 0],
      ['cv', Array.isArray(profile.documents) && profile.documents.some((doc: any) => doc.type === 'CV')],
      ['shortBio', !!profile.shortBio],
      ['careerGoal', !!profile.careerGoal],
      ['defaultSendingEmailAccountId', !!profile.preference?.defaultSendingEmailAccountId],
    ] as const;

    const completed = checks.filter(([, ok]) => ok).map(([field]) => field);
    const missing = checks.filter(([, ok]) => !ok).map(([field]) => field);
    const percentage = Math.round((completed.length / checks.length) * 100);

    return {
      percentage,
      completedFields: completed,
      missingFields: missing,
      recommendedFields: missing.filter((field) => !['cv', 'shortBio', 'careerGoal', 'defaultSendingEmailAccountId'].includes(field)),
    };
  }

  private emptyCompleteness() {
    return { percentage: 0, completedFields: [], missingFields: [], recommendedFields: [] };
  }

  private getCurrentEducation(profile: any) {
    if (Array.isArray(profile.educations) && profile.educations.length > 0) {
      return profile.educations.find((item: any) => item.isCurrent) || profile.educations[0];
    }
    if (Array.isArray(profile.educationHistory) && profile.educationHistory.length > 0) {
      return profile.educationHistory.find((item: any) => item.isCurrent) || profile.educationHistory[0];
    }
    return profile.education || null;
  }

  private serializeProfile(profile: any) {
    const educationHistory = Array.isArray(profile.educations) ? profile.educations : [];
    const currentEducation = this.getCurrentEducation(profile);
    const { educations, ...rest } = profile;

    return {
      ...rest,
      education: currentEducation,
      educationHistory,
    };
  }

  private validateDocumentFile(file: Express.Multer.File) {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
    ];
    const maxSizeBytes = Number(process.env.STUDENT_DOCUMENT_MAX_BYTES || 10 * 1024 * 1024);

    if (!file) throw new BadRequestException('Document file is required');
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Allowed files: PDF, DOC, DOCX, JPG, PNG');
    }
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(`File exceeds max size of ${Math.round(maxSizeBytes / (1024 * 1024))}MB`);
    }
  }
}
