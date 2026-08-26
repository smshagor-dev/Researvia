import { z, type ZodType } from "zod";

const text = (max = 500) => z.string().trim().max(max);
const requiredText = (max = 500) => z.string().trim().min(1).max(max);
const list = (maxItems = 50, maxLength = 180) => z.array(z.string().trim().min(1).max(maxLength)).max(maxItems);
const optionalUrl = z.union([z.literal(""), z.string().trim().url().max(700)]);
const dateValue = z.union([z.literal(""), z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/)]).nullable();
const nullableNumber = (min: number, max: number) => z.number().min(min).max(max).nullable();

export const profileSectionKeys = [
  "education",
  "research-profile",
  "research-experience",
  "work-experience",
  "skills",
  "projects",
  "publications",
  "academic-activities",
  "certifications",
  "awards",
  "languages",
  "test-scores",
  "leadership",
  "memberships",
  "references",
  "opportunity-preferences",
  "collaboration-preferences",
  "links",
  "summary"
] as const;

export const profileSectionKeySchema = z.enum(profileSectionKeys);
export type ProfileSectionKey = z.infer<typeof profileSectionKeySchema>;

export const repeatableProfileSections = new Set<ProfileSectionKey>([
  "education",
  "research-experience",
  "work-experience",
  "skills",
  "projects",
  "publications",
  "academic-activities",
  "certifications",
  "awards",
  "languages",
  "test-scores",
  "leadership",
  "memberships",
  "references",
  "links"
]);

const educationSchema = z.object({
  institution: requiredText(220),
  degree: requiredText(160),
  fieldOfStudy: text(180).optional(),
  department: text(180).optional(),
  startDate: dateValue.optional(),
  endDate: dateValue.optional(),
  currentlyStudying: z.boolean().optional(),
  gpa: text(32).optional(),
  gpaScale: text(32).optional(),
  percentage: nullableNumber(0, 100).optional(),
  thesisTitle: text(500).optional(),
  thesisSupervisor: text(220).optional(),
  coursework: list(40).optional(),
  achievements: list(40, 300).optional()
}).strict();

const researchProfileSchema = z.object({
  primaryArea: text(180).optional(),
  secondaryAreas: list(30).optional(),
  keywords: list(60).optional(),
  researchMethods: list(40).optional(),
  preferredDomains: list(30).optional(),
  researchObjective: text(3000).optional()
}).strict();

const researchExperienceSchema = z.object({
  role: requiredText(180),
  institution: text(220).optional(),
  lab: text(220).optional(),
  supervisor: text(220).optional(),
  researchArea: text(220).optional(),
  startDate: dateValue.optional(),
  endDate: dateValue.optional(),
  currentlyActive: z.boolean().optional(),
  description: text(5000).optional(),
  methodology: list(40).optional(),
  tools: list(50).optional(),
  outcomes: list(40, 500).optional()
}).strict();

const workExperienceSchema = z.object({
  jobTitle: requiredText(180),
  organization: requiredText(220),
  employmentType: text(80).optional(),
  location: text(220).optional(),
  workMode: z.enum(["", "REMOTE", "HYBRID", "ONSITE"]).optional(),
  startDate: dateValue.optional(),
  endDate: dateValue.optional(),
  currentlyWorking: z.boolean().optional(),
  description: text(5000).optional(),
  responsibilities: list(40, 500).optional(),
  achievements: list(40, 500).optional(),
  technologies: list(50).optional()
}).strict();

const skillSchema = z.object({
  name: requiredText(120),
  category: z.enum(["TECHNICAL", "RESEARCH", "TOOL", "SOFT"]).optional(),
  proficiency: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]).optional(),
  yearsExperience: nullableNumber(0, 80).optional()
}).strict();

const projectSchema = z.object({
  name: requiredText(300),
  projectType: text(120).optional(),
  role: text(180).optional(),
  description: text(6000).optional(),
  startDate: dateValue.optional(),
  endDate: dateValue.optional(),
  technologies: list(60).optional(),
  researchAreas: list(40).optional(),
  achievements: list(40, 500).optional(),
  projectUrl: optionalUrl.optional(),
  repositoryUrl: optionalUrl.optional(),
  demoUrl: optionalUrl.optional()
}).strict();

const publicationSchema = z.object({
  title: requiredText(500),
  publicationType: z.enum(["JOURNAL", "CONFERENCE", "WORKSHOP", "BOOK_CHAPTER", "PREPRINT", "THESIS", "OTHER"]).optional(),
  authors: list(100, 220).optional(),
  authorPosition: text(80).optional(),
  venue: text(300).optional(),
  publisher: text(300).optional(),
  publicationDate: dateValue.optional(),
  doi: text(300).optional(),
  url: optionalUrl.optional(),
  volume: text(80).optional(),
  issue: text(80).optional(),
  pages: text(80).optional(),
  citationCount: nullableNumber(0, 10000000).optional(),
  status: z.enum(["PUBLISHED", "ACCEPTED", "UNDER_REVIEW", "SUBMITTED", "PREPRINT", "IN_PREPARATION"]).optional(),
  abstract: text(6000).optional()
}).strict();

const academicActivitySchema = z.object({
  eventName: requiredText(300),
  eventType: text(120).optional(),
  role: text(120).optional(),
  title: text(500).optional(),
  location: text(220).optional(),
  eventDate: dateValue.optional(),
  url: optionalUrl.optional()
}).strict();

const certificationSchema = z.object({
  name: requiredText(300),
  issuer: text(220).optional(),
  issueDate: dateValue.optional(),
  expiryDate: dateValue.optional(),
  credentialId: text(200).optional(),
  credentialUrl: optionalUrl.optional(),
  skills: list(40).optional()
}).strict();

const awardSchema = z.object({
  name: requiredText(300),
  organization: text(220).optional(),
  awardDate: dateValue.optional(),
  description: text(3000).optional(),
  level: z.enum(["UNIVERSITY", "NATIONAL", "INTERNATIONAL", "COMPETITION", "RESEARCH", "ACADEMIC", "OTHER"]).optional()
}).strict();

const languageSchema = z.object({
  language: requiredText(120),
  proficiency: z.enum(["NATIVE", "A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
  note: text(300).optional()
}).strict();

const testScoreSchema = z.object({
  testType: requiredText(120),
  score: requiredText(80),
  testDate: dateValue.optional(),
  expiryDate: dateValue.optional(),
  registrationId: text(180).optional()
}).strict();

const leadershipSchema = z.object({
  role: requiredText(180),
  organization: requiredText(220),
  startDate: dateValue.optional(),
  endDate: dateValue.optional(),
  currentlyActive: z.boolean().optional(),
  description: text(4000).optional(),
  achievements: list(40, 500).optional()
}).strict();

const membershipSchema = z.object({
  organization: requiredText(220),
  membershipType: text(160).optional(),
  membershipId: text(180).optional(),
  startDate: dateValue.optional(),
  expiryDate: dateValue.optional()
}).strict();

const referenceSchema = z.object({
  name: requiredText(220),
  position: text(180).optional(),
  institution: text(220).optional(),
  relationship: text(160).optional(),
  email: z.union([z.literal(""), z.string().trim().email().max(320)]).optional(),
  phone: text(80).optional(),
  linkedin: optionalUrl.optional(),
  canContact: z.boolean().optional(),
  recommendationLetterAvailable: z.boolean().optional()
}).strict();

const opportunityPreferenceSchema = z.object({
  lookingFor: list(30).optional(),
  preferredCountries: list(30).optional(),
  preferredUniversities: list(40, 220).optional(),
  preferredResearchAreas: list(40).optional(),
  preferredDegreeLevels: list(10).optional(),
  preferredWorkModes: list(10).optional(),
  fundingPreference: z.enum(["ANY", "FULLY_FUNDED", "FULL_OR_PARTIAL", "SELF_FUNDED"]).optional(),
  targetIntake: text(120).optional(),
  expectedStartDate: dateValue.optional(),
  fullyFundedOnly: z.boolean().optional(),
  partialFundingAcceptable: z.boolean().optional(),
  tuitionWaiverRequired: z.boolean().optional(),
  stipendRequired: z.boolean().optional(),
  travelFundingRequired: z.boolean().optional(),
  accommodationFundingRequired: z.boolean().optional()
}).strict();

const collaborationPreferenceSchema = z.object({
  openToCollaboration: z.boolean().optional(),
  lookingForCoauthors: z.boolean().optional(),
  lookingForSupervisor: z.boolean().optional(),
  lookingForResearchAssistantship: z.boolean().optional(),
  preferredResearchAreas: list(40).optional(),
  availableHoursPerWeek: nullableNumber(0, 168).optional()
}).strict();

const linkSchema = z.object({
  label: requiredText(100),
  type: z.enum(["WEBSITE", "PORTFOLIO", "GITHUB", "LINKEDIN", "GOOGLE_SCHOLAR", "ORCID", "RESEARCHGATE", "KAGGLE", "HUGGING_FACE", "OTHER"]).optional(),
  url: z.string().trim().url().max(700)
}).strict();

const summarySchema = z.object({
  professionalSummary: text(5000).optional(),
  careerObjective: text(3000).optional(),
  researchObjective: text(3000).optional()
}).strict();

const schemas: Record<ProfileSectionKey, ZodType<Record<string, unknown>>> = {
  education: educationSchema,
  "research-profile": researchProfileSchema,
  "research-experience": researchExperienceSchema,
  "work-experience": workExperienceSchema,
  skills: skillSchema,
  projects: projectSchema,
  publications: publicationSchema,
  "academic-activities": academicActivitySchema,
  certifications: certificationSchema,
  awards: awardSchema,
  languages: languageSchema,
  "test-scores": testScoreSchema,
  leadership: leadershipSchema,
  memberships: membershipSchema,
  references: referenceSchema,
  "opportunity-preferences": opportunityPreferenceSchema,
  "collaboration-preferences": collaborationPreferenceSchema,
  links: linkSchema,
  summary: summarySchema
};

export function getProfileSectionSchema(section: ProfileSectionKey) {
  return schemas[section];
}

export function getProfileSectionPatchSchema(section: ProfileSectionKey) {
  const schema = schemas[section];
  return schema instanceof z.ZodObject ? schema.partial().strict() : schema;
}
