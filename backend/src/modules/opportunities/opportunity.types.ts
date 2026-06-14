import { OpportunityType } from '@prisma/client';

export interface OpportunityDiscoveryJobData {
  triggeredBy: string;
}

export interface OpportunitySyncJobData {
  triggeredBy: string;
  opportunityId?: string;
}

export interface OpportunityQualityScoreJobData {
  triggeredBy: string;
  opportunityId?: string;
}

export interface DiscoveredOpportunityInput {
  title: string;
  type: OpportunityType;
  countryId?: string | null;
  universityId?: string | null;
  departmentId?: string | null;
  professorId?: string | null;
  fundingAmount?: number | null;
  currency?: string | null;
  isFullyFunded?: boolean;
  description?: string | null;
  requirements?: string | null;
  deadline?: Date | null;
  officialUrl?: string | null;
  sourceUrl?: string | null;
  verificationStatus?: 'pending' | 'verified' | 'rejected' | 'manual_review';
  status?: 'draft' | 'active' | 'expired' | 'closed' | 'archived';
}
