import type { DataSource, EmailType, ProfessorPosition } from '@prisma/client';

export type SyncTrigger = 'admin' | 'cron' | 'system';

export interface DiscoverySearchParams {
  university: {
    id: string;
    name: string;
    openalexId?: string | null;
    websiteUrl?: string | null;
    emailDomains?: string[] | null;
    countryCode?: string | null;
  };
  researchArea: {
    id: string;
    name: string;
    openalexConceptId?: string | null;
  };
  limit?: number;
}

export interface SourceEmailCandidate {
  email: string;
  type?: EmailType;
}

export interface SourcePublicationCandidate {
  externalId?: string | null;
  doi?: string | null;
  title: string;
  abstract?: string | null;
  venue?: string | null;
  publicationYear?: number | null;
  publicationDate?: string | null;
  citationCount?: number | null;
  url?: string | null;
  pdfUrl?: string | null;
}

export interface SourceProfessorCandidate {
  externalId: string;
  sourceUrl?: string | null;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  position?: ProfessorPosition | null;
  bio?: string | null;
  avatarUrl?: string | null;
  personalWebsite?: string | null;
  googleScholarUrl?: string | null;
  labUrl?: string | null;
  openalexId?: string | null;
  orcidId?: string | null;
  departmentName?: string | null;
  researchAreas: string[];
  emails: SourceEmailCandidate[];
  hIndex?: number | null;
  citationsCount?: number | null;
  publicationsCount?: number | null;
  lastPublicationYear?: number | null;
  rawPayload: unknown;
}

export interface SourceProfessorDetails extends SourceProfessorCandidate {
  publications?: SourcePublicationCandidate[];
}

export interface AcademicSourceAdapter {
  readonly name: string;
  readonly sourceType: DataSource;
  searchProfessors(params: DiscoverySearchParams): Promise<SourceProfessorCandidate[]>;
  getProfessorDetails(externalId: string): Promise<SourceProfessorDetails | null>;
}

export interface DiscoverProfessorsJobData {
  sourceTypes?: DataSource[];
  universityIds?: string[];
  researchAreaIds?: string[];
  limitPerCombination?: number;
  trigger?: SyncTrigger;
  requestedBy?: string;
}

export interface SyncProfessorProfilesJobData {
  professorId?: string;
  trigger?: SyncTrigger;
  requestedBy?: string;
}

export interface SyncProfessorPublicationsJobData {
  professorId?: string;
  trigger?: SyncTrigger;
  requestedBy?: string;
}

export interface ScoreProfessorQualityJobData {
  professorId: string;
  trigger?: SyncTrigger;
}

export interface DeduplicateProfessorsJobData {
  trigger?: SyncTrigger;
  requestedBy?: string;
}

export interface SyncCounters {
  processedCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
}

