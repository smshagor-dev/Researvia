import type { FilterQuery } from "mongoose";
import type { OpportunitySearchInput, ScholarshipSearchInput } from "@/schemas/opportunities";
import { prepareOpportunityDatabase } from "@/server/db/opportunity-indexes";
import { AppError } from "@/server/errors/AppError";
import { Opportunity, type OpportunityDocument } from "@/server/models/Opportunity";
import { Scholarship, type ScholarshipDocument } from "@/server/models/Scholarship";

export type DeadlineState = "OPEN" | "CLOSING_SOON" | "CLOSED" | "UNKNOWN";

export function getDeadlineState(deadline: Date | string | null | undefined, now = new Date()): DeadlineState {
  if (!deadline) return "UNKNOWN";
  const value = new Date(deadline);
  if (Number.isNaN(value.getTime())) return "UNKNOWN";
  if (value.getTime() < now.getTime()) return "CLOSED";
  if (value.getTime() - now.getTime() <= 30 * 24 * 60 * 60 * 1000) return "CLOSING_SOON";
  return "OPEN";
}

function pagination(total: number, page: number, limit: number) {
  return { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
}

function scholarshipDto(value: Record<string, unknown>) {
  const university = value.universityId && typeof value.universityId === "object" ? value.universityId as Record<string, unknown> : {};
  const deadline = value.deadline ? new Date(value.deadline as Date).toISOString() : null;
  return {
    id: String(value._id), name: String(value.name), slug: String(value.slug), provider: String(value.provider), country: String(value.country),
    universityName: String(university.name ?? ""), universitySlug: String(university.slug ?? ""),
    degreeLevels: Array.isArray(value.degreeLevels) ? value.degreeLevels.map(String) : [], studyFields: Array.isArray(value.studyFields) ? value.studyFields.map(String) : [],
    fundingType: String(value.fundingType ?? "UNKNOWN"), fundingAmount: String(value.fundingAmount ?? ""), tuitionCoverage: String(value.tuitionCoverage ?? ""), stipend: String(value.stipend ?? ""), travelSupport: String(value.travelSupport ?? ""),
    eligibility: String(value.eligibility ?? ""), nationalityRestrictions: Array.isArray(value.nationalityRestrictions) ? value.nationalityRestrictions.map(String) : [], languageRequirements: Array.isArray(value.languageRequirements) ? value.languageRequirements.map(String) : [], requiredDocuments: Array.isArray(value.requiredDocuments) ? value.requiredDocuments.map(String) : [],
    applicationUrl: String(value.applicationUrl), openDate: value.openDate ? new Date(value.openDate as Date).toISOString() : null, deadline, deadlineState: getDeadlineState(deadline), source: String(value.source), sourceUrl: String(value.sourceUrl), lastVerifiedAt: value.lastVerifiedAt ? new Date(value.lastVerifiedAt as Date).toISOString() : null
  };
}

function opportunityDto(value: Record<string, unknown>) {
  const university = value.universityId && typeof value.universityId === "object" ? value.universityId as Record<string, unknown> : {};
  const professor = value.professorId && typeof value.professorId === "object" ? value.professorId as Record<string, unknown> : {};
  const deadline = value.deadline ? new Date(value.deadline as Date).toISOString() : null;
  return {
    id: String(value._id), title: String(value.title), slug: String(value.slug), type: String(value.type), organization: String(value.organization), country: String(value.country), city: String(value.city ?? ""),
    universityName: String(university.name ?? ""), universitySlug: String(university.slug ?? ""), professorName: String(professor.fullName ?? ""), professorSlug: String(professor.slug ?? ""),
    fields: Array.isArray(value.fields) ? value.fields.map(String) : [], researchAreas: Array.isArray(value.researchAreas) ? value.researchAreas.map(String) : [], funding: String(value.funding ?? ""), eligibility: String(value.eligibility ?? ""), description: String(value.description ?? ""), requiredDocuments: Array.isArray(value.requiredDocuments) ? value.requiredDocuments.map(String) : [],
    applicationUrl: String(value.applicationUrl), openDate: value.openDate ? new Date(value.openDate as Date).toISOString() : null, deadline, deadlineState: getDeadlineState(deadline), source: String(value.source), sourceUrl: String(value.sourceUrl), lastVerifiedAt: value.lastVerifiedAt ? new Date(value.lastVerifiedAt as Date).toISOString() : null
  };
}

export async function searchScholarships(input: ScholarshipSearchInput) {
  await prepareOpportunityDatabase();
  const filter: FilterQuery<ScholarshipDocument> = { status: "PUBLISHED" };
  if (input.q) filter.$text = { $search: input.q };
  if (input.country) filter.country = input.country;
  if (input.degree) filter.degreeLevels = input.degree;
  if (input.fundingType) filter.fundingType = input.fundingType;
  if (input.openOnly) filter.$or = [{ deadline: { $gte: new Date() } }, { deadline: null }];
  const skip = (input.page - 1) * input.limit;
  const [items, total] = await Promise.all([Scholarship.find(filter).sort({ deadline: 1, name: 1 }).skip(skip).limit(input.limit).populate("universityId", "name slug").lean(), Scholarship.countDocuments(filter)]);
  return { items: items.map((item) => scholarshipDto(item as unknown as Record<string, unknown>)), ...pagination(total, input.page, input.limit) };
}

export async function getScholarshipBySlug(slug: string) {
  await prepareOpportunityDatabase();
  const item = await Scholarship.findOne({ slug, status: "PUBLISHED" }).populate("universityId", "name slug").lean();
  if (!item) throw new AppError("SCHOLARSHIP_NOT_FOUND", 404, "Scholarship not found.");
  return scholarshipDto(item as unknown as Record<string, unknown>);
}

export async function searchOpportunities(input: OpportunitySearchInput) {
  await prepareOpportunityDatabase();
  const filter: FilterQuery<OpportunityDocument> = { status: "PUBLISHED" };
  if (input.q) filter.$text = { $search: input.q };
  if (input.country) filter.country = input.country;
  if (input.researchArea) filter.researchAreas = input.researchArea;
  if (input.type) filter.type = input.type;
  if (input.openOnly) filter.$or = [{ deadline: { $gte: new Date() } }, { deadline: null }];
  const skip = (input.page - 1) * input.limit;
  const [items, total] = await Promise.all([Opportunity.find(filter).sort({ deadline: 1, title: 1 }).skip(skip).limit(input.limit).populate("universityId", "name slug").populate("professorId", "fullName slug").lean(), Opportunity.countDocuments(filter)]);
  return { items: items.map((item) => opportunityDto(item as unknown as Record<string, unknown>)), ...pagination(total, input.page, input.limit) };
}

export async function getOpportunityBySlug(slug: string) {
  await prepareOpportunityDatabase();
  const item = await Opportunity.findOne({ slug, status: "PUBLISHED" }).populate("universityId", "name slug").populate("professorId", "fullName slug").lean();
  if (!item) throw new AppError("OPPORTUNITY_NOT_FOUND", 404, "Opportunity not found.");
  return opportunityDto(item as unknown as Record<string, unknown>);
}
