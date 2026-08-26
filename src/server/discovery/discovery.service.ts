import type { ProfessorSearchInput, UniversitySearchInput } from "@/schemas/discovery";
import { prepareDiscoveryDatabase } from "@/server/db/discovery-indexes";
import { AppError } from "@/server/errors/AppError";
import { Professor } from "@/server/models/Professor";
import { University } from "@/server/models/University";

export type UniversityCard = {
  id: string;
  name: string;
  slug: string;
  country: string;
  city: string;
  region: string;
  website: string;
  description: string;
  logoUrl: string;
  source: string;
  sourceUrl: string;
  lastVerifiedAt: string | null;
};

export type ProfessorCard = {
  id: string;
  fullName: string;
  slug: string;
  universityId: string;
  universityName: string;
  universitySlug: string;
  title: string;
  department: string;
  country: string;
  city: string;
  email: string;
  website: string;
  orcid: string;
  googleScholar: string;
  researchAreas: string[];
  bio: string;
  publicationCount: number;
  citedByCount: number;
  source: string;
  sourceUrl: string;
  lastVerifiedAt: string | null;
  contactEnrichmentStatus: string;
  contactConfidence: string;
  contactEmailSource: string;
  contactWebsiteSource: string;
  contactEnrichedAt: string | null;
};

function universityDto(value: Record<string, unknown>): UniversityCard {
  return {
    id: String(value._id),
    name: String(value.name),
    slug: String(value.slug),
    country: String(value.country),
    city: String(value.city ?? ""),
    region: String(value.region ?? ""),
    website: String(value.website ?? ""),
    description: String(value.description ?? ""),
    logoUrl: String(value.logoUrl ?? ""),
    source: String(value.source ?? "MANUAL"),
    sourceUrl: String(value.sourceUrl ?? ""),
    lastVerifiedAt: value.lastVerifiedAt ? new Date(value.lastVerifiedAt as Date).toISOString() : null
  };
}

function professorDto(value: Record<string, unknown>): ProfessorCard {
  const university = value.universityId && typeof value.universityId === "object"
    ? value.universityId as Record<string, unknown>
    : {};

  return {
    id: String(value._id),
    fullName: String(value.fullName),
    slug: String(value.slug),
    universityId: String(university._id ?? value.universityId ?? ""),
    universityName: String(university.name ?? ""),
    universitySlug: String(university.slug ?? ""),
    title: String(value.title ?? ""),
    department: String(value.department ?? ""),
    country: String(value.country),
    city: String(value.city ?? ""),
    email: String(value.email ?? ""),
    website: String(value.website ?? ""),
    orcid: String(value.orcid ?? ""),
    googleScholar: String(value.googleScholar ?? ""),
    researchAreas: Array.isArray(value.researchAreas) ? value.researchAreas.map(String) : [],
    bio: String(value.bio ?? ""),
    publicationCount: Number(value.publicationCount ?? 0),
    citedByCount: Number(value.citedByCount ?? 0),
    source: String(value.source ?? "MANUAL"),
    sourceUrl: String(value.sourceUrl ?? ""),
    lastVerifiedAt: value.lastVerifiedAt ? new Date(value.lastVerifiedAt as Date).toISOString() : null,
    contactEnrichmentStatus: String(value.contactEnrichmentStatus ?? "NOT_STARTED"),
    contactConfidence: String(value.contactConfidence ?? "NONE"),
    contactEmailSource: String(value.contactEmailSource ?? "NONE"),
    contactWebsiteSource: String(value.contactWebsiteSource ?? "NONE"),
    contactEnrichedAt: value.contactEnrichedAt ? new Date(value.contactEnrichedAt as Date).toISOString() : null
  };
}

export async function searchUniversities(input: UniversitySearchInput) {
  await prepareDiscoveryDatabase();
  const filter = {
    status: "PUBLISHED" as const,
    ...(input.q ? { $text: { $search: input.q } } : {}),
    ...(input.country ? { country: input.country } : {})
  };
  const skip = (input.page - 1) * input.limit;
  const [items, total] = await Promise.all([
    University.find(filter).sort({ name: 1 }).skip(skip).limit(input.limit).lean(),
    University.countDocuments(filter)
  ]);
  return {
    items: items.map((item) => universityDto(item as unknown as Record<string, unknown>)),
    page: input.page,
    limit: input.limit,
    total,
    pages: Math.max(1, Math.ceil(total / input.limit))
  };
}

export async function getUniversityBySlug(slug: string): Promise<UniversityCard> {
  await prepareDiscoveryDatabase();
  const university = await University.findOne({ slug, status: "PUBLISHED" }).lean();
  if (!university) throw new AppError("UNIVERSITY_NOT_FOUND", 404, "University not found.");
  return universityDto(university as unknown as Record<string, unknown>);
}

export async function searchProfessors(input: ProfessorSearchInput) {
  await prepareDiscoveryDatabase();
  const filter = {
    status: "PUBLISHED" as const,
    ...(input.q ? { $text: { $search: input.q } } : {}),
    ...(input.country ? { country: input.country } : {}),
    ...(input.universityId ? { universityId: input.universityId } : {}),
    ...(input.researchArea ? { researchAreas: input.researchArea } : {})
  };
  const skip = (input.page - 1) * input.limit;
  const [items, total] = await Promise.all([
    Professor.find(filter).sort({ fullName: 1 }).skip(skip).limit(input.limit).populate("universityId", "name slug").lean(),
    Professor.countDocuments(filter)
  ]);
  return {
    items: items.map((item) => professorDto(item as unknown as Record<string, unknown>)),
    page: input.page,
    limit: input.limit,
    total,
    pages: Math.max(1, Math.ceil(total / input.limit))
  };
}

export async function getProfessorBySlug(slug: string): Promise<ProfessorCard> {
  await prepareDiscoveryDatabase();
  const professor = await Professor.findOne({ slug, status: "PUBLISHED" }).populate("universityId", "name slug").lean();
  if (!professor) throw new AppError("PROFESSOR_NOT_FOUND", 404, "Professor not found.");
  return professorDto(professor as unknown as Record<string, unknown>);
}
