import { type ProfilePatchInput } from "@/schemas/profile";
import { prepareProfileDatabase } from "@/server/db/profile-indexes";
import { AppError } from "@/server/errors/AppError";
import { StudentProfile } from "@/server/models/StudentProfile";
import type { StudentProfileDto } from "@/types/profile";

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasItems(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

export function calculateProfileCompletion(profile: Record<string, unknown>): number {
  const checks = [
    hasText(profile.country),
    hasText(profile.currentUniversity),
    hasText(profile.currentDegree),
    hasText(profile.fieldOfStudy),
    hasItems(profile.researchInterests),
    hasItems(profile.skills),
    hasItems(profile.targetDegrees),
    hasItems(profile.targetCountries),
    hasItems(profile.languages),
    hasText(profile.bio) || hasItems(profile.preferredResearchAreas)
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function serializeProfile(profile: Record<string, unknown>): StudentProfileDto {
  return {
    id: String(profile._id),
    userId: String(profile.userId),
    country: String(profile.country ?? ""),
    currentUniversity: String(profile.currentUniversity ?? ""),
    currentDegree: profile.currentDegree ? (String(profile.currentDegree) as StudentProfileDto["currentDegree"]) : null,
    fieldOfStudy: String(profile.fieldOfStudy ?? ""),
    graduationYear: typeof profile.graduationYear === "number" ? profile.graduationYear : null,
    gpa: String(profile.gpa ?? ""),
    bio: String(profile.bio ?? ""),
    researchInterests: Array.isArray(profile.researchInterests) ? profile.researchInterests.map(String) : [],
    skills: Array.isArray(profile.skills) ? profile.skills.map(String) : [],
    languages: Array.isArray(profile.languages) ? profile.languages.map(String) : [],
    targetDegrees: Array.isArray(profile.targetDegrees)
      ? (profile.targetDegrees.map(String) as StudentProfileDto["targetDegrees"])
      : [],
    targetCountries: Array.isArray(profile.targetCountries) ? profile.targetCountries.map(String) : [],
    fundingPreference: String(profile.fundingPreference ?? "ANY") as StudentProfileDto["fundingPreference"],
    preferredResearchAreas: Array.isArray(profile.preferredResearchAreas) ? profile.preferredResearchAreas.map(String) : [],
    website: String(profile.website ?? ""),
    linkedin: String(profile.linkedin ?? ""),
    github: String(profile.github ?? ""),
    googleScholar: String(profile.googleScholar ?? ""),
    orcid: String(profile.orcid ?? ""),
    profileVisibility: String(profile.profileVisibility ?? "RECOMMENDATION_ONLY") as StudentProfileDto["profileVisibility"],
    onboardingStep: typeof profile.onboardingStep === "number" ? profile.onboardingStep : 1,
    onboardingCompletedAt: profile.onboardingCompletedAt
      ? new Date(profile.onboardingCompletedAt as string | number | Date).toISOString()
      : null,
    completion: calculateProfileCompletion(profile)
  };
}

export async function getStudentProfile(userId: string): Promise<StudentProfileDto> {
  await prepareProfileDatabase();
  const profile = await StudentProfile.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  if (!profile) throw new AppError("PROFILE_UNAVAILABLE", 500, "Student profile could not be loaded.");
  return serializeProfile(profile as unknown as Record<string, unknown>);
}

export async function updateStudentProfile(userId: string, input: ProfilePatchInput): Promise<StudentProfileDto> {
  await prepareProfileDatabase();
  const profile = await StudentProfile.findOneAndUpdate(
    { userId },
    { $set: input, $setOnInsert: { userId } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();

  if (!profile) throw new AppError("PROFILE_UPDATE_FAILED", 500, "Student profile could not be updated.");
  return serializeProfile(profile as unknown as Record<string, unknown>);
}

export async function completeStudentOnboarding(userId: string): Promise<StudentProfileDto> {
  const profile = await getStudentProfile(userId);
  const missing: string[] = [];

  if (!profile.country) missing.push("country");
  if (!profile.currentUniversity) missing.push("currentUniversity");
  if (!profile.currentDegree) missing.push("currentDegree");
  if (!profile.fieldOfStudy) missing.push("fieldOfStudy");
  if (profile.researchInterests.length === 0) missing.push("researchInterests");
  if (profile.skills.length === 0) missing.push("skills");
  if (profile.targetDegrees.length === 0) missing.push("targetDegrees");
  if (profile.targetCountries.length === 0) missing.push("targetCountries");

  if (missing.length > 0) {
    throw new AppError(
      "ONBOARDING_INCOMPLETE",
      400,
      "Complete the required academic profile fields before finishing onboarding.",
      { missing }
    );
  }

  await prepareProfileDatabase();
  const completed = await StudentProfile.findOneAndUpdate(
    { userId },
    { $set: { onboardingStep: 4, onboardingCompletedAt: new Date() } },
    { new: true, runValidators: true }
  ).lean();

  if (!completed) throw new AppError("PROFILE_UPDATE_FAILED", 500, "Student onboarding could not be completed.");
  return serializeProfile(completed as unknown as Record<string, unknown>);
}
