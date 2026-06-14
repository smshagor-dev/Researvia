import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from '@prisma/client';
import type {
  AcademicSourceAdapter,
  DiscoverySearchParams,
  SourceProfessorCandidate,
  SourceProfessorDetails,
} from '../../professor-sync/professor-sync.types';

@Injectable()
export class OrcidAdapter implements AcademicSourceAdapter {
  readonly name = 'ORCID';
  readonly sourceType = DataSource.orcid;

  private readonly logger = new Logger(OrcidAdapter.name);

  constructor(private readonly config: ConfigService) {
    this.logger.debug(`ORCID adapter configured for ${this.config.get<string>('ORCID_BASE_URL')}`);
  }

  async searchProfessors(_params: DiscoverySearchParams): Promise<SourceProfessorCandidate[]> {
    // TODO: implement ORCID expanded-search integration with institution filters.
    return [];
  }

  async getProfessorDetails(_externalId: string): Promise<SourceProfessorDetails | null> {
    // TODO: implement ORCID person record enrichment when the API contract is finalized.
    return null;
  }
}

