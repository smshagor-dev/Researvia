import { connectDatabase } from "@/server/db/mongoose";
import { AppError } from "@/server/errors/AppError";
import { ImportJob } from "@/server/models/ImportJob";
import { ImportRecord } from "@/server/models/ImportRecord";
import { Opportunity } from "@/server/models/Opportunity";
import { Professor } from "@/server/models/Professor";
import { Scholarship } from "@/server/models/Scholarship";
import { University } from "@/server/models/University";
import { enqueueJob } from "@/server/jobs/job.service";
import { writeAudit } from "@/server/admin/admin.service";

export type ImportEntityType = "UNIVERSITY" | "PROFESSOR" | "SCHOLARSHIP" | "OPPORTUNITY";
export type ImportFormat = "CSV" | "JSON" | "OPENALEX";

const text = (value: unknown) => typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
const list = (value: unknown) => Array.isArray(value) ? value.map(text).filter(Boolean) : text(value).split(/[;|]/).map((item) => item.trim()).filter(Boolean);
const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 300);

function plain(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Row must be an object.");
  return value as Record<string, unknown>;
}

function normalize(entityType: ImportEntityType, rawInput: unknown) {
  const raw = plain(rawInput);
  const errors: string[] = [];
  if (entityType === "UNIVERSITY") {
    const name = text(raw.name);
    const country = text(raw.country);
    if (!name) errors.push("name is required");
    if (!country) errors.push("country is required");
    return { errors, data: { name, slug: text(raw.slug) || slugify(name), aliases: list(raw.aliases), country, city: text(raw.city), region: text(raw.region), website: text(raw.website), description: text(raw.description), logoUrl: text(raw.logoUrl), openAlexId: text(raw.openAlexId), rorId: text(raw.rorId), sourceUrl: text(raw.sourceUrl) } };
  }
  if (entityType === "PROFESSOR") {
    const fullName = text(raw.fullName || raw.name);
    const country = text(raw.country);
    const universitySlug = text(raw.universitySlug);
    if (!fullName) errors.push("fullName is required");
    if (!country) errors.push("country is required");
    if (!universitySlug) errors.push("universitySlug is required");
    return { errors, data: { fullName, slug: text(raw.slug) || slugify(fullName), country, universitySlug, title: text(raw.title), department: text(raw.department), city: text(raw.city), email: text(raw.email).toLowerCase(), website: text(raw.website), orcid: text(raw.orcid), googleScholar: text(raw.googleScholar), openAlexId: text(raw.openAlexId), researchAreas: list(raw.researchAreas), keywords: list(raw.keywords), bio: text(raw.bio), sourceUrl: text(raw.sourceUrl) } };
  }
  if (entityType === "SCHOLARSHIP") {
    const name = text(raw.name);
    const provider = text(raw.provider);
    const country = text(raw.country);
    const applicationUrl = text(raw.applicationUrl);
    const sourceUrl = text(raw.sourceUrl);
    if (!name) errors.push("name is required");
    if (!provider) errors.push("provider is required");
    if (!country) errors.push("country is required");
    if (!applicationUrl) errors.push("applicationUrl is required");
    if (!sourceUrl) errors.push("sourceUrl is required");
    const deadline = text(raw.deadline);
    if (deadline && Number.isNaN(Date.parse(deadline))) errors.push("deadline must be a valid date");
    return { errors, data: { name, slug: text(raw.slug) || slugify(`${name}-${country}`), provider, country, degreeLevels: list(raw.degreeLevels), studyFields: list(raw.studyFields), fundingType: ["FULL", "PARTIAL", "OTHER", "UNKNOWN"].includes(text(raw.fundingType).toUpperCase()) ? text(raw.fundingType).toUpperCase() : "UNKNOWN", fundingAmount: text(raw.fundingAmount), tuitionCoverage: text(raw.tuitionCoverage), stipend: text(raw.stipend), travelSupport: text(raw.travelSupport), eligibility: text(raw.eligibility), nationalityRestrictions: list(raw.nationalityRestrictions), languageRequirements: list(raw.languageRequirements), requiredDocuments: list(raw.requiredDocuments), applicationUrl, sourceUrl, deadline: deadline || null } };
  }
  const title = text(raw.title);
  const organization = text(raw.organization);
  const country = text(raw.country);
  const applicationUrl = text(raw.applicationUrl);
  const sourceUrl = text(raw.sourceUrl);
  const type = text(raw.type).toUpperCase();
  const allowed = ["PHD", "MASTERS", "RESEARCH_ASSISTANT", "TEACHING_ASSISTANT", "RESEARCH_INTERNSHIP", "INDUSTRY_RESEARCH_INTERNSHIP", "FELLOWSHIP", "CONFERENCE", "WORKSHOP", "SUMMER_PROGRAM", "RESEARCH_PROJECT", "OTHER"];
  if (!title) errors.push("title is required");
  if (!organization) errors.push("organization is required");
  if (!country) errors.push("country is required");
  if (!applicationUrl) errors.push("applicationUrl is required");
  if (!sourceUrl) errors.push("sourceUrl is required");
  if (!allowed.includes(type)) errors.push("type is invalid");
  const deadline = text(raw.deadline);
  if (deadline && Number.isNaN(Date.parse(deadline))) errors.push("deadline must be a valid date");
  return { errors, data: { title, slug: text(raw.slug) || slugify(`${title}-${organization}`), type, organization, country, city: text(raw.city), fields: list(raw.fields), researchAreas: list(raw.researchAreas), funding: text(raw.funding), eligibility: text(raw.eligibility), description: text(raw.description), requiredDocuments: list(raw.requiredDocuments), applicationUrl, sourceUrl, deadline: deadline || null } };
}

export function parseCsv(input: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { field += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(field); field = "";
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else field += char;
  }
  if (field || row.length) { row.push(field); if (row.some((value) => value.trim())) rows.push(row); }
  if (rows.length < 2) return [];
  const headers = rows[0].map((value) => value.trim());
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

export async function createImportPreview(adminUserId: string, entityType: ImportEntityType, format: ImportFormat, rows: unknown[]) {
  await connectDatabase();
  if (!rows.length) throw new AppError("IMPORT_EMPTY", 400, "The import contains no records.");
  if (rows.length > 1000) throw new AppError("IMPORT_TOO_LARGE", 400, "Imports are limited to 1,000 rows per job.");
  const job = await ImportJob.create({ adminUserId, entityType, format, totalRows: rows.length });
  const records = rows.map((raw, index) => {
    try {
      const result = normalize(entityType, raw);
      return { importJobId: job._id, rowNumber: index + 1, rawData: raw, normalizedData: result.data, status: result.errors.length ? "INVALID" : "VALID", errors: result.errors };
    } catch (error) {
      return { importJobId: job._id, rowNumber: index + 1, rawData: raw, normalizedData: null, status: "INVALID", errors: [error instanceof Error ? error.message : "Invalid row"] };
    }
  });
  await ImportRecord.insertMany(records);
  job.validRows = records.filter((record) => record.status === "VALID").length;
  job.invalidRows = records.length - job.validRows;
  await job.save();
  await writeAudit({ actorUserId: adminUserId, action: "IMPORT_PREVIEW_CREATED", targetType: "ImportJob", targetId: job._id.toString(), metadata: { entityType, format, totalRows: rows.length, validRows: job.validRows, invalidRows: job.invalidRows } });
  return getImportJob(adminUserId, job._id.toString());
}

export async function confirmImport(adminUserId: string, importJobId: string) {
  await connectDatabase();
  const job = await ImportJob.findOne({ _id: importJobId, adminUserId, status: "PREVIEW" });
  if (!job) throw new AppError("IMPORT_NOT_CONFIRMABLE", 404, "Import preview not found or already confirmed.");
  if (job.validRows < 1) throw new AppError("IMPORT_NO_VALID_ROWS", 400, "There are no valid rows to import.");
  job.status = "QUEUED";
  await job.save();
  await enqueueJob({ type: "PROCESS_IMPORT", payload: { importJobId: job._id.toString() }, idempotencyKey: `import:${job._id.toString()}` });
  await writeAudit({ actorUserId: adminUserId, action: "IMPORT_CONFIRMED", targetType: "ImportJob", targetId: job._id.toString() });
  return { queued: true };
}

async function importOne(entityType: ImportEntityType, format: ImportFormat, data: Record<string, unknown>) {
  const source = format === "OPENALEX" ? "OPENALEX" : format;
  if (entityType === "UNIVERSITY") {
    return University.findOneAndUpdate({ slug: data.slug }, { $set: { name: data.name, slug: data.slug, aliases: data.aliases, country: data.country, city: data.city, region: data.region, website: data.website, description: data.description, logoUrl: data.logoUrl, externalIds: { openAlex: data.openAlexId || "", ror: data.rorId || "" }, source, sourceUrl: data.sourceUrl || "", retrievedAt: new Date(), status: "DRAFT" } }, { upsert: true, new: true, runValidators: true });
  }
  if (entityType === "PROFESSOR") {
    const university = await University.findOne({ slug: data.universitySlug }).lean();
    if (!university) throw new Error(`University ${String(data.universitySlug)} does not exist.`);
    return Professor.findOneAndUpdate({ slug: data.slug }, { $set: { fullName: data.fullName, slug: data.slug, universityId: university._id, title: data.title, department: data.department, country: data.country, city: data.city, email: data.email, website: data.website, orcid: data.orcid, googleScholar: data.googleScholar, openAlexId: data.openAlexId, researchAreas: data.researchAreas, keywords: data.keywords, bio: data.bio, source, sourceUrl: data.sourceUrl || "", retrievedAt: new Date(), status: "DRAFT" } }, { upsert: true, new: true, runValidators: true });
  }
  if (entityType === "SCHOLARSHIP") {
    return Scholarship.findOneAndUpdate({ slug: data.slug }, { $set: { ...data, deadline: data.deadline ? new Date(String(data.deadline)) : null, source: format === "CSV" ? "CSV" : "JSON", retrievedAt: new Date(), status: "DRAFT" } }, { upsert: true, new: true, runValidators: true });
  }
  return Opportunity.findOneAndUpdate({ slug: data.slug }, { $set: { ...data, deadline: data.deadline ? new Date(String(data.deadline)) : null, source: format === "CSV" ? "CSV" : format === "JSON" ? "JSON" : "ORGANIZATION", retrievedAt: new Date(), status: "DRAFT" } }, { upsert: true, new: true, runValidators: true });
}

export async function processImportJob(importJobId: string) {
  await connectDatabase();
  const job = await ImportJob.findOne({ _id: importJobId, status: { $in: ["QUEUED", "PROCESSING"] } });
  if (!job) return;
  job.status = "PROCESSING";
  await job.save();
  const records = await ImportRecord.find({ importJobId: job._id, status: "VALID" }).sort({ rowNumber: 1 });
  let processed = 0;
  let failed = 0;
  for (const record of records) {
    try {
      const target = await importOne(job.entityType as ImportEntityType, job.format as ImportFormat, record.normalizedData as Record<string, unknown>);
      record.status = "IMPORTED";
      record.targetId = target._id.toString();
      processed += 1;
    } catch (error) {
      record.status = "FAILED";
      record.errors = [error instanceof Error ? error.message.slice(0, 500) : "Import failed"];
      failed += 1;
    }
    await record.save();
  }
  job.status = "COMPLETED";
  job.processedRows = processed;
  job.failedRows = failed;
  job.completedAt = new Date();
  await job.save();
  await writeAudit({ actorUserId: job.adminUserId.toString(), action: "IMPORT_COMPLETED", targetType: "ImportJob", targetId: job._id.toString(), metadata: { processed, failed } });
}

export async function listImportJobs(adminUserId: string) {
  await connectDatabase();
  return ImportJob.find({ adminUserId }).sort({ createdAt: -1 }).limit(100).lean();
}

export async function getImportJob(adminUserId: string, id: string) {
  await connectDatabase();
  const job = await ImportJob.findOne({ _id: id, adminUserId }).lean();
  if (!job) throw new AppError("IMPORT_NOT_FOUND", 404, "Import job not found.");
  const records = await ImportRecord.find({ importJobId: id }).sort({ rowNumber: 1 }).limit(1000).lean();
  return { job, records };
}
