import { isValidObjectId, type Model } from "mongoose";
import type { ProfileSectionKey } from "@/schemas/student-profile-sections";
import { repeatableProfileSections } from "@/schemas/student-profile-sections";
import { connectDatabase } from "@/server/db/mongoose";
import { AppError } from "@/server/errors/AppError";
import { StudentPublication } from "@/server/models/StudentPublication";
import {
  StudentAcademicActivity,
  StudentAward,
  StudentCertification,
  StudentCollaborationPreference,
  StudentEducation,
  StudentLanguage,
  StudentLeadershipExperience,
  StudentLink,
  StudentMembership,
  StudentOpportunityPreference,
  StudentProject,
  StudentReference,
  StudentResearchExperience,
  StudentResearchProfile,
  StudentSkill,
  StudentSummary,
  StudentTestScore,
  StudentWorkExperience
} from "@/server/models/StudentProfileSections";
import { StudentProfile } from "@/server/models/StudentProfile";

type LooseModel = Model<Record<string, unknown>>;
type PlainRecord = Record<string, unknown>;

const modelsBySection = {
  education: StudentEducation,
  "research-profile": StudentResearchProfile,
  "research-experience": StudentResearchExperience,
  "work-experience": StudentWorkExperience,
  skills: StudentSkill,
  projects: StudentProject,
  publications: StudentPublication,
  "academic-activities": StudentAcademicActivity,
  certifications: StudentCertification,
  awards: StudentAward,
  languages: StudentLanguage,
  "test-scores": StudentTestScore,
  leadership: StudentLeadershipExperience,
  memberships: StudentMembership,
  references: StudentReference,
  "opportunity-preferences": StudentOpportunityPreference,
  "collaboration-preferences": StudentCollaborationPreference,
  links: StudentLink,
  summary: StudentSummary
} as const;

function modelFor(section: ProfileSectionKey): LooseModel {
  return modelsBySection[section] as unknown as LooseModel;
}

function serializeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (value && typeof value === "object") {
    if ("toHexString" in value && typeof (value as { toHexString?: unknown }).toHexString === "function") {
      return (value as { toHexString: () => string }).toHexString();
    }
    const output: PlainRecord = {};
    for (const [key, nested] of Object.entries(value as PlainRecord)) {
      if (key === "userId" || key === "__v") continue;
      output[key === "_id" ? "id" : key] = serializeValue(nested);
    }
    return output;
  }
  return value;
}

function serializeRecord(value: unknown): PlainRecord {
  return serializeValue(value) as PlainRecord;
}

async function syncLegacyProfile(userId: string, section: ProfileSectionKey) {
  if (section === "skills") {
    const rows = await StudentSkill.find({ userId }).select({ name: 1 }).lean();
    await StudentProfile.updateOne({ userId }, { $set: { skills: rows.map((row) => String(row.name)) } }, { upsert: true });
    return;
  }
  if (section === "languages") {
    const rows = await StudentLanguage.find({ userId }).select({ language: 1 }).lean();
    await StudentProfile.updateOne({ userId }, { $set: { languages: rows.map((row) => String(row.language)) } }, { upsert: true });
    return;
  }
  if (section === "research-profile") {
    const row = await StudentResearchProfile.findOne({ userId }).lean();
    if (!row) return;
    const interests = [row.primaryArea, ...(Array.isArray(row.secondaryAreas) ? row.secondaryAreas : [])]
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
    await StudentProfile.updateOne(
      { userId },
      { $set: { researchInterests: interests, preferredResearchAreas: Array.isArray(row.preferredDomains) ? row.preferredDomains : [] } },
      { upsert: true }
    );
    return;
  }
  if (section === "opportunity-preferences") {
    const row = await StudentOpportunityPreference.findOne({ userId }).lean();
    if (!row) return;
    const validDegrees = new Set(["BACHELORS", "MASTERS", "PHD", "RESEARCH", "OTHER"]);
    const targetDegrees = (Array.isArray(row.preferredDegreeLevels) ? row.preferredDegreeLevels : [])
      .map(String)
      .filter((value) => validDegrees.has(value));
    await StudentProfile.updateOne(
      { userId },
      {
        $set: {
          targetCountries: Array.isArray(row.preferredCountries) ? row.preferredCountries : [],
          targetDegrees,
          fundingPreference: row.fundingPreference ?? "ANY",
          preferredResearchAreas: Array.isArray(row.preferredResearchAreas) ? row.preferredResearchAreas : []
        }
      },
      { upsert: true }
    );
  }
}

export async function getStudentProfileSection(userId: string, section: ProfileSectionKey) {
  await connectDatabase();
  const target = modelFor(section);
  if (repeatableProfileSections.has(section)) {
    const rows = await target.find({ userId }).sort({ updatedAt: -1, _id: -1 }).lean();
    return rows.map(serializeRecord);
  }
  const row = await target.findOne({ userId }).lean();
  return row ? serializeRecord(row) : null;
}

export async function createOrReplaceStudentProfileSection(
  userId: string,
  section: ProfileSectionKey,
  input: PlainRecord
) {
  await connectDatabase();
  const target = modelFor(section);
  if (repeatableProfileSections.has(section)) {
    const created = await target.create({ ...input, userId });
    await syncLegacyProfile(userId, section);
    return serializeRecord(created.toObject());
  }
  const row = await target.findOneAndUpdate(
    { userId },
    { $set: input, $setOnInsert: { userId } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();
  if (!row) throw new AppError("PROFILE_SECTION_SAVE_FAILED", 500, "Profile section could not be saved.");
  await syncLegacyProfile(userId, section);
  return serializeRecord(row);
}

export async function updateStudentProfileSectionRecord(
  userId: string,
  section: ProfileSectionKey,
  id: string,
  input: PlainRecord
) {
  if (!repeatableProfileSections.has(section)) {
    throw new AppError("PROFILE_SECTION_SINGLETON", 400, "This profile section has one record and must be saved directly.");
  }
  if (!isValidObjectId(id)) throw new AppError("PROFILE_SECTION_NOT_FOUND", 404, "Profile record not found.");
  await connectDatabase();
  const row = await modelFor(section).findOneAndUpdate(
    { _id: id, userId },
    { $set: input },
    { new: true, runValidators: true }
  ).lean();
  if (!row) throw new AppError("PROFILE_SECTION_NOT_FOUND", 404, "Profile record not found.");
  await syncLegacyProfile(userId, section);
  return serializeRecord(row);
}

export async function deleteStudentProfileSectionRecord(userId: string, section: ProfileSectionKey, id: string) {
  if (!repeatableProfileSections.has(section)) {
    throw new AppError("PROFILE_SECTION_SINGLETON", 400, "This profile section cannot be deleted as a record.");
  }
  if (!isValidObjectId(id)) throw new AppError("PROFILE_SECTION_NOT_FOUND", 404, "Profile record not found.");
  await connectDatabase();
  const deleted = await modelFor(section).findOneAndDelete({ _id: id, userId }).lean();
  if (!deleted) throw new AppError("PROFILE_SECTION_NOT_FOUND", 404, "Profile record not found.");
  await syncLegacyProfile(userId, section);
}

export async function getAllStudentProfileSections(userId: string) {
  await connectDatabase();
  const entries = await Promise.all(
    (Object.keys(modelsBySection) as ProfileSectionKey[]).map(async (section) => [section, await getStudentProfileSection(userId, section)] as const)
  );
  return Object.fromEntries(entries) as Record<ProfileSectionKey, PlainRecord[] | PlainRecord | null>;
}

function nonEmptyRecord(value: PlainRecord | null | undefined) {
  if (!value) return false;
  return Object.entries(value).some(([key, item]) => {
    if (["id", "createdAt", "updatedAt"].includes(key)) return false;
    if (Array.isArray(item)) return item.length > 0;
    if (typeof item === "boolean") return item;
    return item !== null && item !== undefined && String(item).trim().length > 0;
  });
}

export function calculateExtendedProfileCompletion(
  personal: PlainRecord,
  sections: Record<ProfileSectionKey, PlainRecord[] | PlainRecord | null>
) {
  const personalReady = [personal.fullName, personal.country, personal.bio].filter((value) => typeof value === "string" && value.trim()).length >= 2;
  const importantSections: ProfileSectionKey[] = [
    "education",
    "research-profile",
    "research-experience",
    "skills",
    "projects",
    "publications",
    "languages",
    "opportunity-preferences",
    "collaboration-preferences",
    "links",
    "summary"
  ];
  const completed = importantSections.filter((section) => {
    const value = sections[section];
    return Array.isArray(value) ? value.length > 0 : nonEmptyRecord(value);
  }).length + (personalReady ? 1 : 0);
  return Math.round((completed / (importantSections.length + 1)) * 100);
}
