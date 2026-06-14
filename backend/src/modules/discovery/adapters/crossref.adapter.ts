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
export class CrossrefAdapter implements AcademicSourceAdapter {
  readonly name = 'Crossref';
  readonly sourceType = DataSource.crossref;

  private readonly logger = new Logger(CrossrefAdapter.name);

  constructor(private readonly config: ConfigService) {
    this.logger.debug(`Crossref adapter configured for ${this.config.get<string>('CROSSREF_BASE_URL')}`);
  }

  async searchProfessors(_params: DiscoverySearchParams): Promise<SourceProfessorCandidate[]> {
    // TODO: Crossref does not provide a first-class professor directory, so discovery is deferred.
    return [];
  }

  async getProfessorDetails(_externalId: string): Promise<SourceProfessorDetails | null> {
    // TODO: add author/work enrichment once a safe Crossref author matching strategy is defined.
    return null;
  }
}

