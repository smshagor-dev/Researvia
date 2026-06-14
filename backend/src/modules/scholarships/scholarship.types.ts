import { FundingType, ScholarshipDegreeLevel, ScholarshipSourceType } from '@prisma/client';

export type ScholarshipDiscoveryJobData = {
  sourceTypes?: ScholarshipSourceType[];
  triggeredBy?: string;
};

export type ScholarshipSyncJobData = {
  scholarshipId?: string;
  sourceTypes?: ScholarshipSourceType[];
  triggeredBy?: string;
};

export type ScholarshipDeadlineCheckJobData = {
  triggeredBy?: string;
};

export type ScholarshipQualityScoreJobData = {
  scholarshipId?: string;
  triggeredBy?: string;
};

export type NormalizedScholarship = {
  title: string;
  providerName: string;
  providerType?: string | null;
  countryCode?: string | null;
  countryName?: string | null;
  universityName?: string | null;
  degreeLevel?: ScholarshipDegreeLevel | null;
  degreeLevels?: ScholarshipDegreeLevel[];
  fundingType: FundingType;
  fundingAmount?: number | null;
  currency?: string | null;
  isFullyFunded?: boolean;
  applicationUrl?: string | null;
  officialSourceUrl: string;
  description?: string | null;
  eligibilityCriteria?: string | null;
  requiredDocuments?: string[];
  researchAreas?: string[];
  deadline?: string | Date | null;
  applicationOpenDate?: string | Date | null;
  applicationCloseDate?: string | Date | null;
  sourceExternalId?: string | null;
  metadata?: Record<string, unknown>;
};

export interface ScholarshipSourceAdapter {
  readonly sourceType: ScholarshipSourceType;
  readonly sourceName: string;
  searchScholarships(): Promise<NormalizedScholarship[]>;
  getScholarshipDetails(sourceExternalId: string, sourceUrl?: string | null): Promise<NormalizedScholarship | null>;
}
