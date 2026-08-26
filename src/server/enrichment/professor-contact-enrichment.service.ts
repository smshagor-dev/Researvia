import { getServerEnv } from "@/config/env";
import { prepareDiscoveryDatabase } from "@/server/db/discovery-indexes";
import { AppError } from "@/server/errors/AppError";
import { enqueueJob } from "@/server/jobs/job.service";
import { Professor } from "@/server/models/Professor";
import { University } from "@/server/models/University";

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_MS = 30 * DAY_MS;
const REQUEST_TIMEOUT_MS = 12_000;

type JsonRecord = Record<string, unknown>;
type Confidence = "NONE" | "LOW" | "MEDIUM" | "HIGH";

type OrcidEmailCandidate = {
  email: string;
  primary: boolean;
  verified: boolean;
  officialDomain: boolean;
  confidence: Confidence;
};

type EmploymentMetadata = {
  title: string;
  department: string;
  organization: string;
  active: boolean;
};

let orcidTokenCache: { token: string; expiresAt: number } | null = null;

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeName(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
}

function hostFromUrl(value: string): string {
  try { return normalizeDomain(new URL(value).hostname); } catch { return ""; }
}

export function normalizeOrcidId(value: string): string {
  const match = value.match(/\b\d{4}-\d{4}-\d{4}-[\dX]{4}\b/i);
  return match ? match[0].toUpperCase() : "";
}

export function normalizeRorId(value: string): string {
  const match = value.match(/\b0[a-z0-9]{8}\b/i);
  return match ? match[0].toLowerCase() : "";
}

function normalizeOpenAlexId(value: string, prefix: "A" | "I"): string {
  const match = value.match(new RegExp(`\\b${prefix}\\d+\\b`, "i"));
  return match ? match[0].toUpperCase() : "";
}

export function emailMatchesOfficialDomain(email: string, domains: string[]): boolean {
  const domain = normalizeDomain(email.split("@")[1] ?? "");
  return Boolean(domain) && domains.some((candidate) => {
    const official = normalizeDomain(candidate);
    return Boolean(official) && (domain === official || domain.endsWith(`.${official}`));
  });
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 320;
}

function publicHttpsUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return "";
    const host = normalizeDomain(url.hostname);
    if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return "";
    return url.toString();
  } catch { return ""; }
}

function confidenceRank(value: Confidence) {
  return value === "HIGH" ? 3 : value === "MEDIUM" ? 2 : value === "LOW" ? 1 : 0;
}

function maxConfidence(a: Confidence, b: Confidence): Confidence {
  return confidenceRank(a) >= confidenceRank(b) ? a : b;
}

export function selectOrcidEmail(payload: unknown, officialDomains: string[]): OrcidEmailCandidate | null {
  const entries = arrayValue(record(payload).email).map(record);
  const candidates = entries.flatMap((entry) => {
    const email = stringValue(entry.email).toLowerCase();
    if (!validEmail(email)) return [];
    const primary = entry.primary === true;
    const verified = entry.verified === true;
    const officialDomain = emailMatchesOfficialDomain(email, officialDomains);
    const confidence: Confidence = officialDomain && verified ? "HIGH" : officialDomain || verified ? "MEDIUM" : "LOW";
    return [{ email, primary, verified, officialDomain, confidence }];
  });
  candidates.sort((a, b) => {
    const score = (candidate: OrcidEmailCandidate) => (candidate.officialDomain ? 100 : 0) + (candidate.verified ? 40 : 0) + (candidate.primary ? 10 : 0);
    return score(b) - score(a);
  });
  return candidates[0] ?? null;
}

export function extractOrcidResearcherUrls(payload: unknown): string[] {
  return unique(arrayValue(record(payload)["researcher-url"]).map((entry) => {
    const url = record(record(entry).url);
    return publicHttpsUrl(stringValue(url.value));
  }).filter(Boolean));
}

function collectValuesByKey(value: unknown, key: string, output: unknown[] = []): unknown[] {
  if (Array.isArray(value)) {
    for (const item of value) collectValuesByKey(item, key, output);
    return output;
  }
  if (!value || typeof value !== "object") return output;
  for (const [candidateKey, candidateValue] of Object.entries(value as JsonRecord)) {
    if (candidateKey === key) output.push(candidateValue);
    collectValuesByKey(candidateValue, key, output);
  }
  return output;
}

function employmentMatchesUniversity(summary: JsonRecord, university: { name: string; aliases: string[]; ror: string }) {
  const organization = record(summary.organization);
  const organizationName = normalizeName(stringValue(organization.name));
  const targetNames = [university.name, ...university.aliases].map(normalizeName).filter(Boolean);
  const nameMatch = Boolean(organizationName) && targetNames.some((target) => organizationName === target || organizationName.includes(target) || target.includes(organizationName));
  const disambiguated = record(organization["disambiguated-organization"]);
  const externalId = normalizeRorId(stringValue(disambiguated["disambiguated-organization-identifier"]));
  return nameMatch || Boolean(university.ror && externalId && externalId === university.ror);
}

export function selectOrcidEmployment(payload: unknown, university: { name: string; aliases?: string[]; ror?: string }): EmploymentMetadata | null {
  const summaries = collectValuesByKey(payload, "employment-summary").flatMap((value) => Array.isArray(value) ? value.map(record) : [record(value)]);
  const normalizedUniversity = { name: university.name, aliases: university.aliases ?? [], ror: normalizeRorId(university.ror ?? "") };
  const candidates = summaries.filter((summary) => employmentMatchesUniversity(summary, normalizedUniversity)).map((summary) => ({
    title: stringValue(summary["role-title"]),
    department: stringValue(summary["department-name"]),
    organization: stringValue(record(summary.organization).name),
    active: !summary["end-date"]
  }));
  candidates.sort((a, b) => Number(b.active) - Number(a.active));
  return candidates[0] ?? null;
}

async function fetchJson(url: string, init: RequestInit = {}): Promise<JsonRecord | null> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (response.status === 404) return null;
  if (!response.ok) throw new AppError("ACADEMIC_PROVIDER_FAILED", 502, `Academic metadata provider returned ${response.status}.`);
  return await response.json() as JsonRecord;
}

async function getOrcidReadPublicToken(): Promise<string | null> {
  const env = getServerEnv();
  if (!env.ORCID_CLIENT_ID || !env.ORCID_CLIENT_SECRET) return null;
  if (orcidTokenCache && orcidTokenCache.expiresAt > Date.now() + 60_000) return orcidTokenCache.token;
  const body = new URLSearchParams({ client_id: env.ORCID_CLIENT_ID, client_secret: env.ORCID_CLIENT_SECRET, grant_type: "client_credentials", scope: "/read-public" });
  const response = await fetch(env.ORCID_TOKEN_URL, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (!response.ok) throw new AppError("ORCID_AUTH_FAILED", 502, `ORCID authentication returned ${response.status}.`);
  const payload = await response.json() as { access_token?: string; expires_in?: number };
  if (!payload.access_token) throw new AppError("ORCID_AUTH_FAILED", 502, "ORCID did not return an access token.");
  const expiresIn = Math.max(300, Number(payload.expires_in ?? 3600));
  orcidTokenCache = { token: payload.access_token, expiresAt: Date.now() + expiresIn * 1000 };
  return payload.access_token;
}

async function fetchOrcidSection(orcid: string, section: "email" | "researcher-urls" | "employments", token: string) {
  const base = getServerEnv().ORCID_API_BASE.replace(/\/$/, "");
  return fetchJson(`${base}/${encodeURIComponent(orcid)}/${section}`, { headers: { accept: "application/vnd.orcid+json", authorization: `Bearer ${token}` } });
}

async function fetchOpenAlexAuthor(openAlexId: string) {
  const id = normalizeOpenAlexId(openAlexId, "A");
  return id ? fetchJson(`https://api.openalex.org/authors/${id}`, { headers: { "user-agent": "ResearVia academic discovery platform" } }) : null;
}

async function fetchOpenAlexInstitution(openAlexId: string) {
  const id = normalizeOpenAlexId(openAlexId, "I");
  return id ? fetchJson(`https://api.openalex.org/institutions/${id}`, { headers: { "user-agent": "ResearVia academic discovery platform" } }) : null;
}

async function fetchRorOrganization(rorId: string) {
  const id = normalizeRorId(rorId);
  return id ? fetchJson(`https://api.ror.org/v2/organizations/${id}`, { headers: { "user-agent": "ResearVia academic discovery platform" } }) : null;
}

function websiteFromRor(payload: JsonRecord | null): string {
  if (!payload) return "";
  for (const linkValue of arrayValue(payload.links)) {
    const link = record(linkValue);
    if (stringValue(link.type) === "website") return stringValue(link.value);
  }
  return "";
}

function officialDomainsFromUniversity(university: JsonRecord): string[] {
  const explicit = arrayValue(university.officialDomains).map(String).map(normalizeDomain).filter(Boolean);
  const websiteHost = hostFromUrl(stringValue(university.website));
  return unique([...explicit, ...(websiteHost ? [websiteHost] : [])]);
}

export async function enrichUniversityMetadata(universityId: string) {
  await prepareDiscoveryDatabase();
  const university = await University.findById(universityId).lean();
  if (!university) return null;
  let ror = normalizeRorId(university.externalIds?.ror ?? "");
  let website = university.website ?? "";
  const sourceUrls: string[] = [];

  if (university.externalIds?.openAlex) {
    const openAlex = await fetchOpenAlexInstitution(university.externalIds.openAlex);
    if (openAlex) {
      const ids = record(openAlex.ids);
      ror ||= normalizeRorId(stringValue(ids.ror));
      website ||= stringValue(openAlex.homepage_url);
      if (stringValue(openAlex.id)) sourceUrls.push(stringValue(openAlex.id));
    }
  }

  let officialDomains = officialDomainsFromUniversity(university as unknown as JsonRecord);
  if (ror) {
    const rorRecord = await fetchRorOrganization(ror);
    if (rorRecord) {
      officialDomains = unique([...arrayValue(rorRecord.domains).map(String).map(normalizeDomain).filter(Boolean), ...officialDomains]);
      website ||= websiteFromRor(rorRecord);
      sourceUrls.push(`https://ror.org/${ror}`);
    }
  }

  const now = new Date();
  await University.updateOne({ _id: universityId }, { $set: {
    ...(ror ? { "externalIds.ror": ror } : {}),
    ...(website ? { website } : {}),
    officialDomains,
    lastVerifiedAt: now
  } });
  return { ror, website, officialDomains, sourceUrls: unique(sourceUrls), verifiedAt: now };
}

function chooseResearcherWebsite(urls: string[], officialDomains: string[]) {
  const official = urls.find((url) => {
    const host = hostFromUrl(url);
    return officialDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
  });
  return official ? { url: official, confidence: "HIGH" as Confidence } : urls[0] ? { url: urls[0], confidence: "MEDIUM" as Confidence } : null;
}

export async function enrichProfessorContact(professorId: string) {
  await prepareDiscoveryDatabase();
  const now = new Date();
  await Professor.updateOne({ _id: professorId }, { $set: { contactEnrichmentStatus: "PROCESSING", contactEnrichmentAttemptedAt: now, contactEnrichmentError: "" } });
  try {
    const professor = await Professor.findById(professorId).lean();
    if (!professor) return null;
    await enrichUniversityMetadata(professor.universityId.toString());
    const university = await University.findById(professor.universityId).lean();
    if (!university) throw new AppError("UNIVERSITY_NOT_FOUND", 404, "Professor university not found.");
    const officialDomains = officialDomainsFromUniversity(university as unknown as JsonRecord);
    const sourceUrls = [...(professor.contactSourceUrls ?? [])];
    let orcid = normalizeOrcidId(professor.orcid ?? "");
    let researchAreas = professor.researchAreas ?? [];

    if (professor.openAlexId) {
      const author = await fetchOpenAlexAuthor(professor.openAlexId);
      if (author) {
        orcid ||= normalizeOrcidId(stringValue(author.orcid));
        if (!researchAreas.length) {
          researchAreas = arrayValue(author.topics).slice(0, 12).map((topic) => stringValue(record(topic).display_name)).filter(Boolean);
        }
        if (stringValue(author.id)) sourceUrls.push(stringValue(author.id));
      }
    }

    let selectedEmail: OrcidEmailCandidate | null = null;
    let selectedWebsite: { url: string; confidence: Confidence } | null = null;
    let employment: EmploymentMetadata | null = null;
    let providerNote = "";

    if (orcid) {
      sourceUrls.push(`https://orcid.org/${orcid}`);
      const token = await getOrcidReadPublicToken();
      if (token) {
        const [emails, urls, employments] = await Promise.all([
          fetchOrcidSection(orcid, "email", token),
          fetchOrcidSection(orcid, "researcher-urls", token),
          fetchOrcidSection(orcid, "employments", token)
        ]);
        selectedEmail = selectOrcidEmail(emails, officialDomains);
        selectedWebsite = chooseResearcherWebsite(extractOrcidResearcherUrls(urls), officialDomains);
        employment = selectOrcidEmployment(employments, { name: university.name, aliases: university.aliases ?? [], ror: university.externalIds?.ror ?? "" });
      } else {
        providerNote = "ORCID Public API credentials are not configured; OpenAlex/ROR metadata was refreshed but ORCID public contact data was not read.";
      }
    } else {
      providerNote = "No ORCID iD is available from the current public metadata sources.";
    }

    const email = professor.email || selectedEmail?.email || "";
    const website = professor.website || selectedWebsite?.url || "";
    const title = professor.title || employment?.title || "";
    const department = professor.department || employment?.department || "";
    const enrichedFromOrcid = Boolean(selectedEmail || selectedWebsite || employment);
    let confidence: Confidence = professor.contactConfidence as Confidence;
    if (selectedEmail) confidence = maxConfidence(confidence, selectedEmail.confidence);
    if (selectedWebsite) confidence = maxConfidence(confidence, selectedWebsite.confidence);
    const status = enrichedFromOrcid
      ? (email ? "ENRICHED" : "PARTIAL")
      : (email || website || title || department ? "PARTIAL" : "NO_PUBLIC_CONTACT");

    const update: JsonRecord = {
      email,
      website,
      title,
      department,
      orcid,
      researchAreas,
      contactEnrichmentStatus: status,
      contactConfidence: confidence,
      contactSourceUrls: unique(sourceUrls),
      contactEnrichedAt: enrichedFromOrcid ? now : professor.contactEnrichedAt ?? null,
      contactEnrichmentAttemptedAt: now,
      contactEnrichmentError: providerNote,
      lastVerifiedAt: now
    };
    if (!professor.email && selectedEmail) update.contactEmailSource = "ORCID";
    if (!professor.website && selectedWebsite) update.contactWebsiteSource = "ORCID";
    await Professor.updateOne({ _id: professorId }, { $set: update });
    return { professorId, status, email, website, title, department, orcid, confidence, sourceUrls: unique(sourceUrls) };
  } catch (error) {
    await Professor.updateOne({ _id: professorId }, { $set: { contactEnrichmentStatus: "FAILED", contactEnrichmentAttemptedAt: new Date(), contactEnrichmentError: (error instanceof Error ? error.message : "Contact enrichment failed").slice(0, 1000) } });
    throw error;
  }
}

export async function queueProfessorContactEnrichment(professorId: string, reason = "catalog-change") {
  await prepareDiscoveryDatabase();
  const exists = await Professor.exists({ _id: professorId, status: { $in: ["DRAFT", "PUBLISHED"] } });
  if (!exists) return false;
  await Professor.updateOne({ _id: professorId }, { $set: { contactEnrichmentStatus: "QUEUED" } });
  await enqueueJob({
    type: "ENRICH_PROFESSOR_CONTACT",
    payload: { professorId, reason },
    idempotencyKey: `professor-contact:${professorId}:${dayKey()}`,
    maxAttempts: 4
  });
  return true;
}

export async function queueUniversityMetadataEnrichment(universityId: string, reason = "catalog-change") {
  await prepareDiscoveryDatabase();
  const exists = await University.exists({ _id: universityId, status: { $in: ["DRAFT", "PUBLISHED"] } });
  if (!exists) return false;
  await enqueueJob({
    type: "ENRICH_UNIVERSITY_METADATA",
    payload: { universityId, reason },
    idempotencyKey: `university-metadata:${universityId}:${dayKey()}`,
    maxAttempts: 4
  });
  return true;
}

export async function queueProfessorContactBackfill(reason = "periodic-reconciliation", limit = 100) {
  await prepareDiscoveryDatabase();
  const cutoff = new Date(Date.now() - STALE_MS);
  const candidates = await Professor.find({
    status: { $in: ["DRAFT", "PUBLISHED"] },
    $or: [
      { contactEnrichmentStatus: { $in: ["NOT_STARTED", "FAILED"] } },
      { contactEnrichmentAttemptedAt: null },
      { contactEnrichmentAttemptedAt: { $lt: cutoff } }
    ]
  }).select("_id").sort({ contactEnrichmentAttemptedAt: 1, createdAt: 1 }).limit(Math.max(1, Math.min(limit, 500))).lean();
  let queued = 0;
  for (const candidate of candidates) if (await queueProfessorContactEnrichment(candidate._id.toString(), reason)) queued += 1;
  return { queued, scanned: candidates.length };
}

export async function queueUniversityMetadataBackfill(reason = "periodic-reconciliation", limit = 100) {
  await prepareDiscoveryDatabase();
  const cutoff = new Date(Date.now() - STALE_MS);
  const candidates = await University.find({
    status: { $in: ["DRAFT", "PUBLISHED"] },
    $or: [{ officialDomains: { $size: 0 } }, { lastVerifiedAt: null }, { lastVerifiedAt: { $lt: cutoff } }]
  }).select("_id").sort({ lastVerifiedAt: 1, createdAt: 1 }).limit(Math.max(1, Math.min(limit, 500))).lean();
  let queued = 0;
  for (const candidate of candidates) if (await queueUniversityMetadataEnrichment(candidate._id.toString(), reason)) queued += 1;
  return { queued, scanned: candidates.length };
}

export async function scanProfessorContactEnrichment(reason = "periodic-reconciliation") {
  const [professors, universities] = await Promise.all([
    queueProfessorContactBackfill(reason, 100),
    queueUniversityMetadataBackfill(reason, 100)
  ]);
  return { professors, universities };
}

export async function getProfessorContactEnrichmentStats() {
  await prepareDiscoveryDatabase();
  const statuses = ["NOT_STARTED", "QUEUED", "PROCESSING", "ENRICHED", "PARTIAL", "NO_PUBLIC_CONTACT", "FAILED"] as const;
  const counts = await Promise.all(statuses.map((status) => Professor.countDocuments({ status: { $in: ["DRAFT", "PUBLISHED"] }, contactEnrichmentStatus: status })));
  const [total, withEmail, withWebsite, universitiesWithDomains] = await Promise.all([
    Professor.countDocuments({ status: { $in: ["DRAFT", "PUBLISHED"] } }),
    Professor.countDocuments({ status: { $in: ["DRAFT", "PUBLISHED"] }, email: { $ne: "" } }),
    Professor.countDocuments({ status: { $in: ["DRAFT", "PUBLISHED"] }, website: { $ne: "" } }),
    University.countDocuments({ status: { $in: ["DRAFT", "PUBLISHED"] }, "officialDomains.0": { $exists: true } })
  ]);
  const env = getServerEnv();
  return {
    total,
    withEmail,
    withWebsite,
    universitiesWithDomains,
    orcidConfigured: Boolean(env.ORCID_CLIENT_ID && env.ORCID_CLIENT_SECRET),
    byStatus: Object.fromEntries(statuses.map((status, index) => [status, counts[index] ?? 0])) as Record<(typeof statuses)[number], number>
  };
}
