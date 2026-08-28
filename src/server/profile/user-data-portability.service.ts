import { z } from "zod";
import { profilePatchSchema } from "@/schemas/profile";
import {
  getProfileSectionSchema,
  profileSectionKeys,
  repeatableProfileSections,
  type ProfileSectionKey
} from "@/schemas/student-profile-sections";
import { AppError } from "@/server/errors/AppError";
import {
  createOrReplaceStudentProfileSection,
  deleteStudentProfileSectionRecord,
  getAllStudentProfileSections,
  getStudentProfileSection
} from "@/server/profile/profile-sections.service";
import { getStudentProfile, updateStudentProfile } from "@/server/profile/profile.service";

const MAX_RECORDS_PER_SECTION = 250;
const MAX_TOTAL_RECORDS = 1500;

const envelopeSchema = z.object({
  version: z.literal(1),
  personal: z.record(z.string(), z.unknown()).optional(),
  sections: z.record(z.string(), z.unknown()).default({})
}).strict();

function stripMetadata(value: Record<string, unknown>) {
  const copy = { ...value };
  delete copy.id;
  delete copy._id;
  delete copy.userId;
  delete copy.createdAt;
  delete copy.updatedAt;
  return copy;
}

function portablePersonal(profile: Awaited<ReturnType<typeof getStudentProfile>>) {
  return {
    fullName: profile.fullName,
    headline: profile.headline,
    phone: profile.phone,
    dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : null,
    gender: profile.gender,
    nationality: profile.nationality,
    country: profile.country,
    city: profile.city,
    currentUniversity: profile.currentUniversity,
    currentDegree: profile.currentDegree,
    fieldOfStudy: profile.fieldOfStudy,
    graduationYear: profile.graduationYear,
    gpa: profile.gpa,
    bio: profile.bio,
    researchInterests: profile.researchInterests,
    skills: profile.skills,
    languages: profile.languages,
    targetDegrees: profile.targetDegrees,
    targetCountries: profile.targetCountries,
    fundingPreference: profile.fundingPreference,
    preferredResearchAreas: profile.preferredResearchAreas,
    website: profile.website,
    linkedin: profile.linkedin,
    github: profile.github,
    googleScholar: profile.googleScholar,
    orcid: profile.orcid,
    researchGate: profile.researchGate,
    profileVisibility: profile.profileVisibility,
    onboardingStep: profile.onboardingStep
  };
}

export async function exportStudentPortableData(userId: string) {
  const [personal, sections] = await Promise.all([
    getStudentProfile(userId),
    getAllStudentProfileSections(userId)
  ]);
  return {
    product: "ResearVia",
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    personal: portablePersonal(personal),
    sections
  };
}

export async function importStudentPortableData(
  userId: string,
  raw: unknown,
  mode: "MERGE" | "REPLACE" = "MERGE"
) {
  const parsed = envelopeSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError("PROFILE_IMPORT_INVALID", 400, "The import file is not a valid ResearVia profile export.", {
      issues: parsed.error.issues.slice(0, 20)
    });
  }

  let totalRecords = 0;
  const validated = new Map<ProfileSectionKey, Array<Record<string, unknown>> | Record<string, unknown> | null>();
  for (const section of profileSectionKeys) {
    const value = parsed.data.sections[section];
    if (value === undefined || value === null) {
      validated.set(section, null);
      continue;
    }
    const schema = getProfileSectionSchema(section);
    if (repeatableProfileSections.has(section)) {
      if (!Array.isArray(value)) throw new AppError("PROFILE_IMPORT_INVALID", 400, `${section} must be an array.`);
      if (value.length > MAX_RECORDS_PER_SECTION) throw new AppError("PROFILE_IMPORT_LIMIT", 400, `${section} has too many records.`);
      totalRecords += value.length;
      const rows = value.map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) throw new AppError("PROFILE_IMPORT_INVALID", 400, `${section} contains an invalid record.`);
        return schema.parse(stripMetadata(item as Record<string, unknown>));
      });
      validated.set(section, rows);
    } else {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new AppError("PROFILE_IMPORT_INVALID", 400, `${section} must be an object.`);
      totalRecords += 1;
      validated.set(section, schema.parse(stripMetadata(value as Record<string, unknown>)));
    }
  }
  if (totalRecords > MAX_TOTAL_RECORDS) throw new AppError("PROFILE_IMPORT_LIMIT", 400, "The import contains too many profile records.");

  if (parsed.data.personal) {
    const personal = profilePatchSchema.parse(stripMetadata(parsed.data.personal));
    await updateStudentProfile(userId, personal);
  }

  const result: Record<string, { imported: number; removed: number }> = {};
  for (const section of profileSectionKeys) {
    const incoming = validated.get(section);
    let removed = 0;
    let imported = 0;
    if (repeatableProfileSections.has(section)) {
      if (mode === "REPLACE") {
        const current = await getStudentProfileSection(userId, section);
        if (Array.isArray(current)) {
          for (const row of current) {
            const id = String(row.id ?? "");
            if (id) {
              await deleteStudentProfileSectionRecord(userId, section, id);
              removed += 1;
            }
          }
        }
      }
      if (Array.isArray(incoming)) {
        for (const row of incoming) {
          await createOrReplaceStudentProfileSection(userId, section, row);
          imported += 1;
        }
      }
    } else if (incoming && !Array.isArray(incoming)) {
      await createOrReplaceStudentProfileSection(userId, section, incoming);
      imported = 1;
    }
    result[section] = { imported, removed };
  }

  return { mode, totalRecords: Object.values(result).reduce((sum, item) => sum + item.imported, 0), sections: result };
}
