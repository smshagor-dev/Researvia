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
export class RorAdapter implements AcademicSourceAdapter {
  readonly name = 'ROR';
  readonly sourceType = DataSource.ror;

  private readonly logger = new Logger(RorAdapter.name);

  constructor(private readonly config: ConfigService) {
    this.logger.debug(`ROR adapter configured for ${this.config.get<string>('ROR_BASE_URL')}`);
  }

  async searchProfessors(_params: DiscoverySearchParams): Promise<SourceProfessorCandidate[]> {
    // TODO: ROR is organization-focused and should be used for institution enrichment, not professor records.
    return [];
  }

  async getProfessorDetails(_externalId: string): Promise<SourceProfessorDetails | null> {
    return null;
  }
}
