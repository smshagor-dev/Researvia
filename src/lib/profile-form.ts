import type { ProfilePatchInput } from "@/schemas/profile";
import type { StudentProfileDto } from "@/types/profile";

export function parseList(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export function formatList(value: string[]): string {
  return value.join(", ");
}

export function profileToPatch(profile: StudentProfileDto, onboardingStep?: number): ProfilePatchInput {
  return {
    country: profile.country,
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
    profileVisibility: profile.profileVisibility,
    ...(onboardingStep === undefined ? {} : { onboardingStep })
  };
}
