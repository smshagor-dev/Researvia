import { z } from "zod";

export const currentDegreeSchema = z.enum(["HIGH_SCHOOL", "BACHELORS", "MASTERS", "PHD", "OTHER"]);
export const targetDegreeSchema = z.enum(["BACHELORS", "MASTERS", "PHD", "RESEARCH", "OTHER"]);
export const fundingPreferenceSchema = z.enum(["ANY", "FULLY_FUNDED", "FULL_OR_PARTIAL", "SELF_FUNDED"]);
export const profileVisibilitySchema = z.enum(["PRIVATE", "RECOMMENDATION_ONLY"]);
export const genderSchema = z.enum(["", "MALE", "FEMALE", "NON_BINARY", "PREFER_NOT_TO_SAY", "OTHER"]);

const optionalUrl = z.union([z.literal(""), z.string().trim().url().max(500)]);
const shortList = (maxItems: number) => z.array(z.string().trim().min(1).max(120)).max(maxItems);
const optionalDate = z.union([z.literal(""), z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/)]).nullable();

export const profilePatchSchema = z
  .object({
    fullName: z.string().trim().max(220).optional(),
    headline: z.string().trim().max(240).optional(),
    phone: z.string().trim().max(80).optional(),
    dateOfBirth: optionalDate.optional(),
    gender: genderSchema.optional(),
    nationality: z.string().trim().max(120).optional(),
    country: z.string().trim().max(120).optional(),
    city: z.string().trim().max(120).optional(),
    currentUniversity: z.string().trim().max(180).optional(),
    currentDegree: currentDegreeSchema.nullable().optional(),
    fieldOfStudy: z.string().trim().max(180).optional(),
    graduationYear: z.number().int().min(1950).max(2100).nullable().optional(),
    gpa: z.string().trim().max(32).optional(),
    bio: z.string().trim().max(1200).optional(),
    researchInterests: shortList(30).optional(),
    skills: shortList(40).optional(),
    languages: shortList(20).optional(),
    targetDegrees: z.array(targetDegreeSchema).max(5).optional(),
    targetCountries: shortList(20).optional(),
    fundingPreference: fundingPreferenceSchema.optional(),
    preferredResearchAreas: shortList(30).optional(),
    website: optionalUrl.optional(),
    linkedin: optionalUrl.optional(),
    github: optionalUrl.optional(),
    googleScholar: optionalUrl.optional(),
    orcid: optionalUrl.optional(),
    researchGate: optionalUrl.optional(),
    profileVisibility: profileVisibilitySchema.optional(),
    onboardingStep: z.number().int().min(1).max(4).optional()
  })
  .strict();

export type ProfilePatchInput = z.infer<typeof profilePatchSchema>;
