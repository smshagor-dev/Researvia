import { connectDatabase } from "@/server/db/mongoose";
import { StudentPublication } from "@/server/models/StudentPublication";
import { StudentProfile } from "@/server/models/StudentProfile";
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

let profileIndexesPromise: Promise<void> | null = null;

const profileModels = [
  StudentProfile,
  StudentEducation,
  StudentResearchProfile,
  StudentResearchExperience,
  StudentWorkExperience,
  StudentSkill,
  StudentProject,
  StudentPublication,
  StudentAcademicActivity,
  StudentCertification,
  StudentAward,
  StudentLanguage,
  StudentTestScore,
  StudentLeadershipExperience,
  StudentMembership,
  StudentReference,
  StudentOpportunityPreference,
  StudentCollaborationPreference,
  StudentLink,
  StudentSummary
];

export async function prepareProfileDatabase(): Promise<void> {
  await connectDatabase();

  if (!profileIndexesPromise) {
    profileIndexesPromise = Promise.all(profileModels.map((target) => target.createIndexes()))
      .then(() => undefined)
      .catch((error: unknown) => {
        profileIndexesPromise = null;
        throw error;
      });
  }

  await profileIndexesPromise;
}
