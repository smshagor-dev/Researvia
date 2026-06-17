import { ScholarshipSourceType } from '@prisma/client';
import type { ScholarshipSourceAdapter, NormalizedScholarship } from '../scholarship.types';
import { BOOTSTRAP_SCHOLARSHIPS } from '../bootstrap-scholarships.data';

export class BootstrapScholarshipAdapter implements ScholarshipSourceAdapter {
  readonly sourceType = ScholarshipSourceType.manual;
  readonly sourceName = 'BootstrapScholarshipFeed';

  async searchScholarships(): Promise<NormalizedScholarship[]> {
    return BOOTSTRAP_SCHOLARSHIPS;
  }

  async getScholarshipDetails(sourceExternalId: string): Promise<NormalizedScholarship | null> {
    return (
      BOOTSTRAP_SCHOLARSHIPS.find((scholarship) => scholarship.sourceExternalId === sourceExternalId) || null
    );
  }
}
