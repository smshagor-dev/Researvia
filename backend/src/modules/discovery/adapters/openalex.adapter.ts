import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { DataSource, ProfessorPosition } from '@prisma/client';
import type {
  AcademicSourceAdapter,
  DiscoverySearchParams,
  SourceProfessorCandidate,
  SourceProfessorDetails,
  SourcePublicationCandidate,
} from '../../professor-sync/professor-sync.types';
import { sleep } from '../utils/normalize.util';

type OpenAlexAuthor = {
  id: string;
  display_name: string;
  display_name_alternatives?: string[];
  orcid?: string | null;
  works_count?: number;
  cited_by_count?: number;
  summary_stats?: { h_index?: number | null };
  last_known_institutions?: Array<{
    id?: string;
    display_name?: string;
    country_code?: string;
  }>;
  x_concepts?: Array<{ display_name?: string; score?: number }>;
  ids?: {
    openalex?: string;
    orcid?: string;
  };
};

@Injectable()
export class OpenAlexAdapter implements AcademicSourceAdapter {
  readonly name = 'OpenAlex';
  readonly sourceType = DataSource.openalex;

  private readonly logger = new Logger(OpenAlexAdapter.name);
  private readonly client: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    this.client = axios.create({
      baseURL: this.config.get<string>('OPENALEX_BASE_URL', 'https://api.openalex.org'),
      timeout: 10000,
      headers: {
        'User-Agent': 'ResearVia Discovery Engine',
      },
    });
  }

  async searchProfessors(params: DiscoverySearchParams): Promise<SourceProfessorCandidate[]> {
    if (!params.university.openalexId) {
      return [];
    }

    await sleep(200);

    const filters = [`last_known_institutions.id:${params.university.openalexId}`];

    try {
      const response = await this.client.get('/authors', {
        params: {
          filter: filters.join(','),
          per_page: params.limit ?? 10,
          search: params.researchArea.name,
          mailto: this.config.get<string>('OPENALEX_EMAIL'),
        },
      });

      const authors = Array.isArray(response.data?.results) ? (response.data.results as OpenAlexAuthor[]) : [];
      return authors.map((author) => this.mapAuthor(author));
    } catch (error) {
      this.logger.warn(`OpenAlex search failed for ${params.university.name}: ${(error as Error).message}`);
      return [];
    }
  }

  async getProfessorDetails(externalId: string): Promise<SourceProfessorDetails | null> {
    if (!externalId) {
      return null;
    }

    await sleep(200);

    try {
      const authorResponse = await this.client.get(`/authors/${encodeURIComponent(externalId)}`, {
        params: { mailto: this.config.get<string>('OPENALEX_EMAIL') },
      });

      const worksResponse = await this.client.get('/works', {
        params: {
          filter: `author.id:${externalId}`,
          per_page: 20,
          sort: 'publication_date:desc',
          mailto: this.config.get<string>('OPENALEX_EMAIL'),
        },
      });

      const mapped = this.mapAuthor(authorResponse.data as OpenAlexAuthor);
      return {
        ...mapped,
        publications: this.mapWorks(worksResponse.data?.results),
      };
    } catch (error) {
      this.logger.warn(`OpenAlex details failed for ${externalId}: ${(error as Error).message}`);
      return null;
    }
  }

  private mapAuthor(author: OpenAlexAuthor): SourceProfessorCandidate {
    const [firstName, ...rest] = author.display_name.split(' ');
    const lastName = rest.length ? rest.join(' ') : null;

    return {
      externalId: author.id,
      sourceUrl: author.id,
      fullName: author.display_name,
      firstName: firstName || null,
      lastName,
      position: ProfessorPosition.professor,
      openalexId: author.ids?.openalex || author.id,
      orcidId: author.ids?.orcid || author.orcid || null,
      researchAreas: (author.x_concepts || [])
        .map((concept) => concept.display_name)
        .filter((value): value is string => Boolean(value))
        .slice(0, 5),
      emails: [],
      hIndex: author.summary_stats?.h_index ?? null,
      citationsCount: author.cited_by_count ?? null,
      publicationsCount: author.works_count ?? null,
      rawPayload: author,
    };
  }

  private mapWorks(works: unknown): SourcePublicationCandidate[] {
    if (!Array.isArray(works)) {
      return [];
    }

    return works
      .map((work: any) => ({
        externalId: work?.id || null,
        doi: work?.doi || null,
        title: work?.title || 'Untitled publication',
        abstract: null,
        venue: work?.primary_location?.source?.display_name || null,
        publicationYear: work?.publication_year || null,
        publicationDate: work?.publication_date || null,
        citationCount: work?.cited_by_count || 0,
        url: work?.primary_location?.landing_page_url || work?.id || null,
        pdfUrl: work?.primary_location?.pdf_url || null,
      }))
      .filter((publication) => Boolean(publication.title));
  }
}
