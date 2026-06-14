import { ConfigService } from '@nestjs/config';
import { FundingType, ScholarshipDegreeLevel, ScholarshipSourceType } from '@prisma/client';
import axios from 'axios';
import { ScholarshipSourceAdapter, type NormalizedScholarship } from '../scholarship.types';

type RawScholarshipRecord = Record<string, unknown>;

export abstract class HttpScholarshipAdapter implements ScholarshipSourceAdapter {
  abstract readonly sourceType: ScholarshipSourceType;
  abstract readonly sourceName: string;
  protected abstract readonly configKey: string;

  constructor(protected readonly config: ConfigService) {}

  async searchScholarships(): Promise<NormalizedScholarship[]> {
    const endpoint = this.getConfiguredUrl();
    if (!endpoint) {
      return [];
    }

    const payload = await this.fetchJson(endpoint);
    const items = this.extractRecords(payload);
    return items
      .map((item) => this.normalize(item))
      .filter((value): value is NormalizedScholarship => Boolean(value));
  }

  async getScholarshipDetails(sourceExternalId: string, sourceUrl?: string | null): Promise<NormalizedScholarship | null> {
    const endpoint = sourceUrl || this.buildDetailUrl(sourceExternalId);
    if (!endpoint) {
      return null;
    }

    const payload = await this.fetchJson(endpoint);
    const records = this.extractRecords(payload);
    const candidate = records[0] ?? (payload as RawScholarshipRecord);
    return this.normalize(candidate);
  }

  protected getConfiguredUrl() {
    return this.config.get<string>(this.configKey) || '';
  }

  protected buildDetailUrl(sourceExternalId: string) {
    const base = this.getConfiguredUrl();
    if (!base || !sourceExternalId) {
      return '';
    }

    if (base.includes('{id}')) {
      return base.replace('{id}', encodeURIComponent(sourceExternalId));
    }

    return `${base.replace(/\/$/, '')}/${encodeURIComponent(sourceExternalId)}`;
  }

  protected async fetchJson(url: string) {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: { Accept: 'application/json' },
      validateStatus: (status) => status >= 200 && status < 300,
    });

    return response.data;
  }

  protected extractRecords(payload: unknown): RawScholarshipRecord[] {
    if (Array.isArray(payload)) {
      return payload.filter((item): item is RawScholarshipRecord => Boolean(item && typeof item === 'object'));
    }

    if (payload && typeof payload === 'object') {
      const objectPayload = payload as Record<string, unknown>;
      const firstArray = Object.values(objectPayload).find((value) => Array.isArray(value));
      if (Array.isArray(firstArray)) {
        return firstArray.filter((item): item is RawScholarshipRecord => Boolean(item && typeof item === 'object'));
      }

      return [objectPayload];
    }

    return [];
  }

  protected normalize(record: RawScholarshipRecord): NormalizedScholarship | null {
    const title = this.pickString(record, ['title', 'name']);
    const providerName = this.pickString(record, ['providerName', 'provider', 'organization', 'institution']);
    const officialSourceUrl = this.pickString(record, ['officialSourceUrl', 'officialUrl', 'sourceUrl', 'url', 'applicationUrl']);

    if (!title || !providerName || !officialSourceUrl) {
      return null;
    }

    return {
      title,
      providerName,
      providerType: this.pickString(record, ['providerType', 'provider_category', 'category']) || 'external_provider',
      countryCode: this.pickString(record, ['countryCode', 'country_code']),
      countryName: this.pickString(record, ['countryName', 'country']),
      universityName: this.pickString(record, ['universityName', 'university', 'institutionName']),
      degreeLevel: this.normalizeDegreeLevel(this.pickString(record, ['degreeLevel', 'degree', 'level'])),
      degreeLevels: this.normalizeDegreeLevels(record),
      fundingType: this.normalizeFundingType(this.pickString(record, ['fundingType', 'type', 'opportunityType'])),
      fundingAmount: this.pickNumber(record, ['fundingAmount', 'amount', 'awardAmount']),
      currency: this.pickString(record, ['currency']),
      isFullyFunded: this.pickBoolean(record, ['isFullyFunded']) ?? this.inferFullyFunded(record),
      applicationUrl: this.pickString(record, ['applicationUrl', 'applyUrl']) || officialSourceUrl,
      officialSourceUrl,
      description: this.pickString(record, ['description', 'summary']),
      eligibilityCriteria: this.pickString(record, ['eligibilityCriteria', 'eligibility']),
      requiredDocuments: this.pickStringArray(record, ['requiredDocuments', 'documents']),
      researchAreas: this.pickStringArray(record, ['researchAreas', 'fieldsOfStudy', 'researchFields']),
      deadline: this.pickDate(record, ['deadline', 'applicationDeadline', 'closingDate']),
      applicationOpenDate: this.pickDate(record, ['applicationOpenDate', 'openDate']),
      applicationCloseDate: this.pickDate(record, ['applicationCloseDate', 'closeDate']),
      sourceExternalId: this.pickString(record, ['sourceExternalId', 'externalId', 'id']),
      metadata: record,
    };
  }

  protected normalizeFundingType(value?: string | null): FundingType {
    const normalized = (value || '').toLowerCase();
    if (normalized.includes('grant')) return FundingType.grant;
    if (normalized.includes('assistant')) return FundingType.assistantship;
    if (normalized.includes('fellow')) return FundingType.fellowship;
    if (normalized.includes('intern')) return FundingType.internship;
    if (normalized.includes('exchange')) return FundingType.exchange;
    return FundingType.scholarship;
  }

  protected normalizeDegreeLevel(value?: string | null): ScholarshipDegreeLevel | null {
    const normalized = (value || '').toLowerCase();
    if (!normalized) return null;
    if (normalized.includes('bachelor')) return ScholarshipDegreeLevel.bachelor;
    if (normalized.includes('master')) return ScholarshipDegreeLevel.master;
    if (normalized.includes('phd') || normalized.includes('doctor')) return ScholarshipDegreeLevel.phd;
    if (normalized.includes('postdoc')) return ScholarshipDegreeLevel.postdoc;
    return ScholarshipDegreeLevel.mixed;
  }

  protected normalizeDegreeLevels(record: RawScholarshipRecord): ScholarshipDegreeLevel[] {
    const array = this.pickStringArray(record, ['degreeLevels', 'levels']);
    if (array.length === 0) {
      const single = this.normalizeDegreeLevel(this.pickString(record, ['degreeLevel', 'degree', 'level']));
      return single ? [single] : [ScholarshipDegreeLevel.mixed];
    }

    const mapped = array
      .map((value) => this.normalizeDegreeLevel(value))
      .filter((value): value is ScholarshipDegreeLevel => Boolean(value));

    return mapped.length > 0 ? [...new Set(mapped)] : [ScholarshipDegreeLevel.mixed];
  }

  protected inferFullyFunded(record: RawScholarshipRecord) {
    const value = JSON.stringify(record).toLowerCase();
    return value.includes('fully funded');
  }

  protected pickString(record: RawScholarshipRecord, keys: string[]) {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return null;
  }

  protected pickNumber(record: RawScholarshipRecord, keys: string[]) {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string' && value.trim()) {
        const numeric = Number(value.replace(/[^0-9.-]/g, ''));
        if (Number.isFinite(numeric)) {
          return numeric;
        }
      }
    }
    return null;
  }

  protected pickBoolean(record: RawScholarshipRecord, keys: string[]) {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'boolean') {
        return value;
      }
    }
    return null;
  }

  protected pickDate(record: RawScholarshipRecord, keys: string[]) {
    const value = this.pickString(record, keys);
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  protected pickStringArray(record: RawScholarshipRecord, keys: string[]) {
    for (const key of keys) {
      const value = record[key];
      if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
      }
      if (typeof value === 'string' && value.trim()) {
        return value.split(',').map((item) => item.trim()).filter(Boolean);
      }
    }
    return [];
  }
}
