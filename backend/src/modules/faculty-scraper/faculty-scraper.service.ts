import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, EmailSourceType, EmailVerificationStatus, SyncLogStatus } from '@prisma/client';
import { Job } from 'bullmq';
import axios from 'axios';
import * as dns from 'dns/promises';
import { URL } from 'url';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { SyncLogsService } from '../sync-logs/sync-logs.service';
import { toPrismaJsonValue } from '../../shared/prisma/json.util';
import {
  EMAIL_VALIDATION_JOB,
  EMAIL_VALIDATION_QUEUE,
  FACULTY_DISCOVERY_JOB,
  FACULTY_DISCOVERY_QUEUE,
  FACULTY_EMAIL_EXTRACTION_JOB,
  FACULTY_EMAIL_EXTRACTION_QUEUE,
  FACULTY_SCRAPE_JOB,
  FACULTY_SCRAPE_QUEUE,
} from './faculty-scraper.constants';
import type {
  EmailValidationJobData,
  FacultyDiscoveryJobData,
  FacultyEmailExtractionJobData,
  FacultyPageCategory,
  FacultyScrapeJobData,
} from './faculty-scraper.types';
import { deobfuscateEmails, extractEmailsFromHtml, hashEmail, normalizeEmail, stripHtml } from './utils/email.util';
import { ProfessorSyncQueueService } from '../queues/professor-sync-queue.service';

@Injectable()
export class FacultyScraperService {
  private readonly logger = new Logger(FacultyScraperService.name);
  private readonly userAgent = 'ResearViaFacultyScraper/1.0 (+https://researvia.com)';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly syncLogs: SyncLogsService,
    private readonly professorSyncQueues: ProfessorSyncQueueService,
  ) {}

  async runFacultyDiscovery(job: Job<FacultyDiscoveryJobData>) {
    await this.syncLogs.markRunning(String(job.id));
    try {
      const professor = await this.getProfessor(job.data.professorId);
      const discovered = this.discoverFacultyPageUrl(professor);
      if (!discovered) {
        await this.syncLogs.markPartial(
          String(job.id),
          { processedCount: 1, skippedCount: 1 },
          toPrismaJsonValue({ reason: 'no_trusted_url_found', professorId: professor.id }),
        );
        return { discovered: false };
      }

      await this.prisma.professor.update({
        where: { id: professor.id },
        data: { facultyPageUrl: discovered.url },
      });

      const scrapeJob = await this.professorSyncQueues.enqueueFacultyScrape({
        professorId: professor.id,
        facultyPageUrl: discovered.url,
        sourceType: discovered.sourceType,
        requestedBy: job.data.requestedBy,
      });

      await this.syncLogs.createQueuedLog({
        jobId: String(scrapeJob.id),
        queueName: FACULTY_SCRAPE_QUEUE,
        jobName: FACULTY_SCRAPE_JOB,
        metadataJson: toPrismaJsonValue({ professorId: professor.id, facultyPageUrl: discovered.url }),
      });

      await this.syncLogs.markCompleted(
        String(job.id),
        { processedCount: 1, updatedCount: 1 },
        toPrismaJsonValue({ professorId: professor.id, facultyPageUrl: discovered.url }),
      );

      return { discovered: true, facultyPageUrl: discovered.url };
    } catch (error) {
      await this.syncLogs.markFailed(String(job.id), (error as Error).message, { processedCount: 1 });
      throw error;
    }
  }

  async runFacultyScrape(job: Job<FacultyScrapeJobData>) {
    await this.syncLogs.markRunning(String(job.id));
    try {
      const allowed = await this.checkRobots(job.data.facultyPageUrl);
      if (!allowed) {
        await this.syncLogs.markPartial(
          String(job.id),
          { processedCount: 1, skippedCount: 1 },
          toPrismaJsonValue({ professorId: job.data.professorId, reason: 'robots_disallow' }),
        );
        return { scraped: false };
      }

      const response = await axios.get<string>(job.data.facultyPageUrl, {
        timeout: 10000,
        responseType: 'text',
        headers: { 'User-Agent': this.userAgent },
      });

      await this.prisma.professor.update({
        where: { id: job.data.professorId },
        data: { lastScrapedAt: new Date(), facultyPageUrl: job.data.facultyPageUrl },
      });

      const extractionJob = await this.professorSyncQueues.enqueueFacultyEmailExtraction({
        professorId: job.data.professorId,
        facultyPageUrl: job.data.facultyPageUrl,
        sourceType: job.data.sourceType,
        html: response.data,
      });

      await this.syncLogs.createQueuedLog({
        jobId: String(extractionJob.id),
        queueName: FACULTY_EMAIL_EXTRACTION_QUEUE,
        jobName: FACULTY_EMAIL_EXTRACTION_JOB,
        metadataJson: toPrismaJsonValue({ professorId: job.data.professorId, facultyPageUrl: job.data.facultyPageUrl }),
      });

      await this.syncLogs.markCompleted(
        String(job.id),
        { processedCount: 1, updatedCount: 1 },
        toPrismaJsonValue({ professorId: job.data.professorId, contentLength: response.data.length }),
      );

      return { scraped: true };
    } catch (error) {
      await this.syncLogs.markFailed(String(job.id), (error as Error).message, { processedCount: 1 });
      throw error;
    }
  }

  async runFacultyEmailExtraction(job: Job<FacultyEmailExtractionJobData>) {
    await this.syncLogs.markRunning(String(job.id));
    try {
      const emails = extractEmailsFromHtml(job.data.html);
      const pageText = stripHtml(deobfuscateEmails(job.data.html));

      for (const email of emails) {
        const validationJob = await this.professorSyncQueues.enqueueEmailValidation({
          professorId: job.data.professorId,
          email,
          sourceUrl: job.data.facultyPageUrl,
          sourceType: job.data.sourceType,
          pageText,
        });

        await this.syncLogs.createQueuedLog({
          jobId: String(validationJob.id),
          queueName: EMAIL_VALIDATION_QUEUE,
          jobName: EMAIL_VALIDATION_JOB,
          metadataJson: toPrismaJsonValue({ professorId: job.data.professorId, email }),
        });
      }

      await this.syncLogs.markCompleted(
        String(job.id),
        { processedCount: emails.length, createdCount: emails.length },
        toPrismaJsonValue({ professorId: job.data.professorId, emails }),
      );

      return { emailsFound: emails.length };
    } catch (error) {
      await this.syncLogs.markFailed(String(job.id), (error as Error).message, { processedCount: 1 });
      throw error;
    }
  }

  async runEmailValidation(job: Job<EmailValidationJobData>) {
    await this.syncLogs.markRunning(String(job.id));
    try {
      const professor = await this.getProfessor(job.data.professorId);
      const normalizedEmail = normalizeEmail(job.data.email);
      const sourceDomain = new URL(job.data.sourceUrl).hostname.toLowerCase();
      const emailDomain = normalizedEmail.split('@')[1] || '';
      const universityDomains = (Array.isArray(professor.university.emailDomains) ? professor.university.emailDomains : []).map((value) =>
        String(value).toLowerCase(),
      );
      const domainMatched = universityDomains.some((domain) => emailDomain === domain || emailDomain.endsWith(`.${domain}`));
      const mxValid = await this.checkMx(emailDomain);
      const visibleContactSection = /(contact|email|reach|faculty|staff)/i.test(job.data.pageText || '');
      const professorNameMatch = [professor.firstName, professor.lastName, professor.fullName]
        .filter(Boolean)
        .some((name) => normalizedEmail.includes(String(name).toLowerCase().replace(/\s+/g, '.')));

      let confidenceScore = 0;
      confidenceScore += this.getSourceTypeScore(job.data.sourceType);
      if (domainMatched) confidenceScore += 25;
      if (mxValid) confidenceScore += 20;
      if (visibleContactSection) confidenceScore += 15;
      if (professorNameMatch) confidenceScore += 10;

      const verificationStatus =
        confidenceScore >= 90
          ? EmailVerificationStatus.verified
          : confidenceScore >= 70
            ? EmailVerificationStatus.manual_review
            : EmailVerificationStatus.rejected;

      const existing = await this.prisma.professorEmail.findUnique({ where: { email: normalizedEmail } });
      const data = {
        professorId: professor.id,
        email: normalizedEmail,
        emailHash: hashEmail(normalizedEmail),
        sourceUrl: job.data.sourceUrl,
        sourceDomain,
        sourceType: job.data.sourceType as EmailSourceType,
        domainMatched,
        mxValid,
        confidenceScore,
        verificationStatus,
        isVerified: verificationStatus === EmailVerificationStatus.verified,
        verifiedAt: verificationStatus === EmailVerificationStatus.verified ? new Date() : null,
        type: emailDomain === 'gmail.com' || emailDomain === 'yahoo.com' ? 'personal' : 'institutional',
      } satisfies Prisma.ProfessorEmailUncheckedCreateInput;

      const emailRecord = existing
        ? await this.prisma.professorEmail.update({
            where: { id: existing.id },
            data: {
              professorId: professor.id,
              sourceUrl: data.sourceUrl,
              sourceDomain: data.sourceDomain,
              sourceType: data.sourceType,
              domainMatched: data.domainMatched,
              mxValid: data.mxValid,
              confidenceScore: data.confidenceScore,
              verificationStatus: data.verificationStatus,
              isVerified: data.isVerified,
              verifiedAt: data.verifiedAt,
            },
          })
        : await this.prisma.professorEmail.create({ data });

      await this.prisma.verificationLog.create({
        data: {
          professorEmailId: emailRecord.id,
          source: 'manual_review',
          sourceUrl: job.data.sourceUrl,
          result: verificationStatus,
          domainMatched,
          mxCheckResult: mxValid,
          notes: `Confidence score: ${confidenceScore}`,
        },
      });

      await this.syncLogs.markCompleted(
        String(job.id),
        { processedCount: 1, createdCount: existing ? 0 : 1, updatedCount: existing ? 1 : 0 },
        toPrismaJsonValue({ email: normalizedEmail, verificationStatus, confidenceScore }),
      );

      return { email: normalizedEmail, verificationStatus, confidenceScore };
    } catch (error) {
      await this.syncLogs.markFailed(String(job.id), (error as Error).message, { processedCount: 1 });
      throw error;
    }
  }

  private discoverFacultyPageUrl(professor: any): { url: string; sourceType: FacultyPageCategory } | null {
    if (professor.facultyPageUrl) {
      return { url: professor.facultyPageUrl, sourceType: 'faculty_page' };
    }

    const candidates = [
      professor.personalWebsite ? { url: professor.personalWebsite, sourceType: 'faculty_page' as const } : null,
      professor.labUrl ? { url: professor.labUrl, sourceType: 'lab_page' as const } : null,
      professor.department?.websiteUrl ? { url: professor.department.websiteUrl, sourceType: 'department_page' as const } : null,
      professor.university?.websiteUrl ? { url: professor.university.websiteUrl, sourceType: 'directory_page' as const } : null,
    ].filter(Boolean) as Array<{ url: string; sourceType: FacultyPageCategory }>;

    const trustedDomains = (Array.isArray(professor.university?.emailDomains) ? professor.university.emailDomains : []).map((value) =>
      String(value).toLowerCase(),
    );

    return (
      candidates.find((candidate) => {
        try {
          const hostname = new URL(candidate.url).hostname.toLowerCase();
          return trustedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
        } catch {
          return false;
        }
      }) || null
    );
  }

  private async checkRobots(targetUrl: string) {
    try {
      const parsed = new URL(targetUrl);
      const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
      const response = await axios.get<string>(robotsUrl, {
        timeout: 5000,
        responseType: 'text',
        headers: { 'User-Agent': this.userAgent },
        validateStatus: () => true,
      });

      if (response.status >= 400 || !response.data) {
        return true;
      }

      const disallowAll = /user-agent:\s*\*[\s\S]*?disallow:\s*\/\s*$/im.test(response.data);
      return !disallowAll;
    } catch {
      return true;
    }
  }

  private async checkMx(domain: string) {
    try {
      const records = await dns.resolveMx(domain);
      return records.length > 0;
    } catch {
      return false;
    }
  }

  private getSourceTypeScore(sourceType: FacultyPageCategory) {
    switch (sourceType) {
      case 'faculty_page':
        return 30;
      case 'department_page':
      case 'lab_page':
      case 'directory_page':
        return 25;
      default:
        return 0;
    }
  }

  private async getProfessor(professorId: string) {
    const professor = await this.prisma.professor.findUnique({
      where: { id: professorId },
      include: {
        university: { select: { websiteUrl: true, emailDomains: true } },
        department: { select: { websiteUrl: true } },
      },
    });

    if (!professor) {
      throw new NotFoundException('Professor not found');
    }

    return professor;
  }
}

