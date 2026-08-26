import { Schema, model, models, type Model, type Types } from "mongoose";

type SectionRecord = {
  userId: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
} & Record<string, unknown>;

const baseOptions = { timestamps: true, versionKey: false, strict: "throw" as const };
const userId = { type: Schema.Types.ObjectId, ref: "User", required: true, index: true };
const strings = { type: [String], default: [] };

function sectionModel(name: string, schema: Schema) {
  return ((models[name] as Model<SectionRecord> | undefined) ?? model(name, schema)) as Model<SectionRecord>;
}

const educationSchema = new Schema({
  userId,
  institution: { type: String, required: true, trim: true, maxlength: 220 },
  degree: { type: String, required: true, trim: true, maxlength: 160 },
  fieldOfStudy: { type: String, default: "", trim: true, maxlength: 180 },
  department: { type: String, default: "", trim: true, maxlength: 180 },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  currentlyStudying: { type: Boolean, default: false },
  gpa: { type: String, default: "", trim: true, maxlength: 32 },
  gpaScale: { type: String, default: "", trim: true, maxlength: 32 },
  percentage: { type: Number, default: null, min: 0, max: 100 },
  thesisTitle: { type: String, default: "", trim: true, maxlength: 500 },
  thesisSupervisor: { type: String, default: "", trim: true, maxlength: 220 },
  coursework: strings,
  achievements: strings
}, baseOptions);
educationSchema.index({ userId: 1, startDate: -1 });

const researchProfileSchema = new Schema({
  userId: { ...userId, unique: true },
  primaryArea: { type: String, default: "", trim: true, maxlength: 180 },
  secondaryAreas: strings,
  keywords: strings,
  researchMethods: strings,
  preferredDomains: strings,
  researchObjective: { type: String, default: "", trim: true, maxlength: 3000 }
}, baseOptions);

const researchExperienceSchema = new Schema({
  userId,
  role: { type: String, required: true, trim: true, maxlength: 180 },
  institution: { type: String, default: "", trim: true, maxlength: 220 },
  lab: { type: String, default: "", trim: true, maxlength: 220 },
  supervisor: { type: String, default: "", trim: true, maxlength: 220 },
  researchArea: { type: String, default: "", trim: true, maxlength: 220 },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  currentlyActive: { type: Boolean, default: false },
  description: { type: String, default: "", trim: true, maxlength: 5000 },
  methodology: strings,
  tools: strings,
  outcomes: strings
}, baseOptions);
researchExperienceSchema.index({ userId: 1, startDate: -1 });

const workExperienceSchema = new Schema({
  userId,
  jobTitle: { type: String, required: true, trim: true, maxlength: 180 },
  organization: { type: String, required: true, trim: true, maxlength: 220 },
  employmentType: { type: String, default: "", trim: true, maxlength: 80 },
  location: { type: String, default: "", trim: true, maxlength: 220 },
  workMode: { type: String, enum: ["", "REMOTE", "HYBRID", "ONSITE"], default: "" },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  currentlyWorking: { type: Boolean, default: false },
  description: { type: String, default: "", trim: true, maxlength: 5000 },
  responsibilities: strings,
  achievements: strings,
  technologies: strings
}, baseOptions);
workExperienceSchema.index({ userId: 1, startDate: -1 });

const skillSchema = new Schema({
  userId,
  name: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, enum: ["TECHNICAL", "RESEARCH", "TOOL", "SOFT"], default: "TECHNICAL" },
  proficiency: { type: String, enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"], default: "INTERMEDIATE" },
  yearsExperience: { type: Number, default: null, min: 0, max: 80 }
}, baseOptions);
skillSchema.index({ userId: 1, name: 1, category: 1 }, { unique: true });

const projectSchema = new Schema({
  userId,
  name: { type: String, required: true, trim: true, maxlength: 300 },
  projectType: { type: String, default: "", trim: true, maxlength: 120 },
  role: { type: String, default: "", trim: true, maxlength: 180 },
  description: { type: String, default: "", trim: true, maxlength: 6000 },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  technologies: strings,
  researchAreas: strings,
  achievements: strings,
  projectUrl: { type: String, default: "", trim: true, maxlength: 700 },
  repositoryUrl: { type: String, default: "", trim: true, maxlength: 700 },
  demoUrl: { type: String, default: "", trim: true, maxlength: 700 }
}, baseOptions);
projectSchema.index({ userId: 1, startDate: -1 });

const academicActivitySchema = new Schema({
  userId,
  eventName: { type: String, required: true, trim: true, maxlength: 300 },
  eventType: { type: String, default: "", trim: true, maxlength: 120 },
  role: { type: String, default: "", trim: true, maxlength: 120 },
  title: { type: String, default: "", trim: true, maxlength: 500 },
  location: { type: String, default: "", trim: true, maxlength: 220 },
  eventDate: { type: Date, default: null },
  url: { type: String, default: "", trim: true, maxlength: 700 },
  certificateDocumentId: { type: Schema.Types.ObjectId, ref: "StudentDocument", default: null }
}, baseOptions);
academicActivitySchema.index({ userId: 1, eventDate: -1 });

const certificationSchema = new Schema({
  userId,
  name: { type: String, required: true, trim: true, maxlength: 300 },
  issuer: { type: String, default: "", trim: true, maxlength: 220 },
  issueDate: { type: Date, default: null },
  expiryDate: { type: Date, default: null },
  credentialId: { type: String, default: "", trim: true, maxlength: 200 },
  credentialUrl: { type: String, default: "", trim: true, maxlength: 700 },
  skills: strings,
  documentId: { type: Schema.Types.ObjectId, ref: "StudentDocument", default: null }
}, baseOptions);
certificationSchema.index({ userId: 1, issueDate: -1 });

const awardSchema = new Schema({
  userId,
  name: { type: String, required: true, trim: true, maxlength: 300 },
  organization: { type: String, default: "", trim: true, maxlength: 220 },
  awardDate: { type: Date, default: null },
  description: { type: String, default: "", trim: true, maxlength: 3000 },
  level: { type: String, enum: ["UNIVERSITY", "NATIONAL", "INTERNATIONAL", "COMPETITION", "RESEARCH", "ACADEMIC", "OTHER"], default: "OTHER" }
}, baseOptions);
awardSchema.index({ userId: 1, awardDate: -1 });

const languageSchema = new Schema({
  userId,
  language: { type: String, required: true, trim: true, maxlength: 120 },
  proficiency: { type: String, enum: ["NATIVE", "A1", "A2", "B1", "B2", "C1", "C2"], default: "B1" },
  note: { type: String, default: "", trim: true, maxlength: 300 }
}, baseOptions);
languageSchema.index({ userId: 1, language: 1 }, { unique: true });

const testScoreSchema = new Schema({
  userId,
  testType: { type: String, required: true, trim: true, maxlength: 120 },
  score: { type: String, required: true, trim: true, maxlength: 80 },
  testDate: { type: Date, default: null },
  expiryDate: { type: Date, default: null },
  registrationId: { type: String, default: "", trim: true, maxlength: 180 }
}, baseOptions);
testScoreSchema.index({ userId: 1, testType: 1, testDate: -1 });

const leadershipSchema = new Schema({
  userId,
  role: { type: String, required: true, trim: true, maxlength: 180 },
  organization: { type: String, required: true, trim: true, maxlength: 220 },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  currentlyActive: { type: Boolean, default: false },
  description: { type: String, default: "", trim: true, maxlength: 4000 },
  achievements: strings
}, baseOptions);
leadershipSchema.index({ userId: 1, startDate: -1 });

const membershipSchema = new Schema({
  userId,
  organization: { type: String, required: true, trim: true, maxlength: 220 },
  membershipType: { type: String, default: "", trim: true, maxlength: 160 },
  membershipId: { type: String, default: "", trim: true, maxlength: 180 },
  startDate: { type: Date, default: null },
  expiryDate: { type: Date, default: null }
}, baseOptions);
membershipSchema.index({ userId: 1, organization: 1 });

const referenceSchema = new Schema({
  userId,
  name: { type: String, required: true, trim: true, maxlength: 220 },
  position: { type: String, default: "", trim: true, maxlength: 180 },
  institution: { type: String, default: "", trim: true, maxlength: 220 },
  relationship: { type: String, default: "", trim: true, maxlength: 160 },
  email: { type: String, default: "", trim: true, lowercase: true, maxlength: 320 },
  phone: { type: String, default: "", trim: true, maxlength: 80 },
  linkedin: { type: String, default: "", trim: true, maxlength: 700 },
  canContact: { type: Boolean, default: false },
  recommendationLetterAvailable: { type: Boolean, default: false }
}, baseOptions);
referenceSchema.index({ userId: 1, name: 1 });

const opportunityPreferenceSchema = new Schema({
  userId: { ...userId, unique: true },
  lookingFor: strings,
  preferredCountries: strings,
  preferredUniversities: strings,
  preferredResearchAreas: strings,
  preferredDegreeLevels: strings,
  preferredWorkModes: strings,
  fundingPreference: { type: String, enum: ["ANY", "FULLY_FUNDED", "FULL_OR_PARTIAL", "SELF_FUNDED"], default: "ANY" },
  targetIntake: { type: String, default: "", trim: true, maxlength: 120 },
  expectedStartDate: { type: Date, default: null },
  fullyFundedOnly: { type: Boolean, default: false },
  partialFundingAcceptable: { type: Boolean, default: true },
  tuitionWaiverRequired: { type: Boolean, default: false },
  stipendRequired: { type: Boolean, default: false },
  travelFundingRequired: { type: Boolean, default: false },
  accommodationFundingRequired: { type: Boolean, default: false }
}, baseOptions);

const collaborationPreferenceSchema = new Schema({
  userId: { ...userId, unique: true },
  openToCollaboration: { type: Boolean, default: true },
  lookingForCoauthors: { type: Boolean, default: false },
  lookingForSupervisor: { type: Boolean, default: true },
  lookingForResearchAssistantship: { type: Boolean, default: true },
  preferredResearchAreas: strings,
  availableHoursPerWeek: { type: Number, default: null, min: 0, max: 168 }
}, baseOptions);

const linkSchema = new Schema({
  userId,
  label: { type: String, required: true, trim: true, maxlength: 100 },
  type: { type: String, enum: ["WEBSITE", "PORTFOLIO", "GITHUB", "LINKEDIN", "GOOGLE_SCHOLAR", "ORCID", "RESEARCHGATE", "KAGGLE", "HUGGING_FACE", "OTHER"], default: "OTHER" },
  url: { type: String, required: true, trim: true, maxlength: 700 }
}, baseOptions);
linkSchema.index({ userId: 1, type: 1, url: 1 }, { unique: true });

const summarySchema = new Schema({
  userId: { ...userId, unique: true },
  professionalSummary: { type: String, default: "", trim: true, maxlength: 5000 },
  careerObjective: { type: String, default: "", trim: true, maxlength: 3000 },
  researchObjective: { type: String, default: "", trim: true, maxlength: 3000 }
}, baseOptions);

export const StudentEducation = sectionModel("StudentEducation", educationSchema);
export const StudentResearchProfile = sectionModel("StudentResearchProfile", researchProfileSchema);
export const StudentResearchExperience = sectionModel("StudentResearchExperience", researchExperienceSchema);
export const StudentWorkExperience = sectionModel("StudentWorkExperience", workExperienceSchema);
export const StudentSkill = sectionModel("StudentSkill", skillSchema);
export const StudentProject = sectionModel("StudentProject", projectSchema);
export const StudentAcademicActivity = sectionModel("StudentAcademicActivity", academicActivitySchema);
export const StudentCertification = sectionModel("StudentCertification", certificationSchema);
export const StudentAward = sectionModel("StudentAward", awardSchema);
export const StudentLanguage = sectionModel("StudentLanguage", languageSchema);
export const StudentTestScore = sectionModel("StudentTestScore", testScoreSchema);
export const StudentLeadershipExperience = sectionModel("StudentLeadershipExperience", leadershipSchema);
export const StudentMembership = sectionModel("StudentMembership", membershipSchema);
export const StudentReference = sectionModel("StudentReference", referenceSchema);
export const StudentOpportunityPreference = sectionModel("StudentOpportunityPreference", opportunityPreferenceSchema);
export const StudentCollaborationPreference = sectionModel("StudentCollaborationPreference", collaborationPreferenceSchema);
export const StudentLink = sectionModel("StudentLink", linkSchema);
export const StudentSummary = sectionModel("StudentSummary", summarySchema);
