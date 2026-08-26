import { prepareDiscoveryDatabase } from "@/server/db/discovery-indexes";
import { Professor } from "@/server/models/Professor";
import { StudentProfile } from "@/server/models/StudentProfile";
import { StudentPublication } from "@/server/models/StudentPublication";
import {
  StudentEducation,
  StudentOpportunityPreference,
  StudentResearchExperience,
  StudentResearchProfile,
  StudentSkill,
  StudentSummary
} from "@/server/models/StudentProfileSections";

const STOP_WORDS = new Set(["and", "the", "for", "with", "from", "into", "using", "research", "science", "engineering", "of", "in", "on", "a", "an", "to"]);

function terms(values: unknown[]) {
  const output = new Set<string>();
  for (const value of values) {
    const text = String(value ?? "").toLowerCase();
    for (const token of text.split(/[^a-z0-9+#.]+/i)) {
      const clean = token.trim();
      if (clean.length >= 2 && !STOP_WORDS.has(clean)) output.add(clean);
    }
  }
  return output;
}

function overlapScore(source: Set<string>, target: Set<string>) {
  if (source.size === 0 || target.size === 0) return 0;
  let matches = 0;
  for (const token of source) if (target.has(token)) matches += 1;
  return Math.min(1, matches / Math.max(2, Math.min(source.size, 8)));
}

function array(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function reason(label: string, score: number) {
  return score >= 0.45 ? label : null;
}

export type ProfessorProfileMatch = {
  id: string;
  slug: string;
  fullName: string;
  title: string;
  department: string;
  country: string;
  universityName: string;
  researchAreas: string[];
  matchScore: number;
  matchReasons: string[];
};

export async function findProfessorMatches(userId: string, limit = 8) {
  await prepareDiscoveryDatabase();
  const [legacyProfile, researchProfile, skills, education, publications, researchExperience, preferences, summary] = await Promise.all([
    StudentProfile.findOne({ userId }).lean(),
    StudentResearchProfile.findOne({ userId }).lean(),
    StudentSkill.find({ userId }).lean(),
    StudentEducation.find({ userId }).sort({ endDate: -1, startDate: -1 }).lean(),
    StudentPublication.find({ userId }).sort({ publicationDate: -1 }).limit(30).lean(),
    StudentResearchExperience.find({ userId }).sort({ startDate: -1 }).limit(20).lean(),
    StudentOpportunityPreference.findOne({ userId }).lean(),
    StudentSummary.findOne({ userId }).lean()
  ]);

  const researchTerms = terms([
    researchProfile?.primaryArea,
    ...array(researchProfile?.secondaryAreas),
    ...array(researchProfile?.preferredDomains),
    ...array(preferences?.preferredResearchAreas),
    ...array(legacyProfile?.researchInterests),
    ...array(legacyProfile?.preferredResearchAreas),
    ...researchExperience.flatMap((item) => [item.researchArea, ...array(item.methodology), ...array(item.tools)])
  ]);
  const keywordTerms = terms(array(researchProfile?.keywords));
  const skillTerms = terms([
    ...skills.map((item) => item.name),
    ...array(researchProfile?.researchMethods),
    ...array(legacyProfile?.skills)
  ]);
  const publicationTerms = terms(publications.flatMap((item) => [item.title, item.venue, item.abstract]));
  const academicTerms = terms([
    ...education.flatMap((item) => [item.degree, item.fieldOfStudy, item.department, item.thesisTitle]),
    legacyProfile?.currentDegree,
    legacyProfile?.fieldOfStudy,
    legacyProfile?.currentUniversity
  ]);
  const objectiveTerms = terms([researchProfile?.researchObjective, summary?.researchObjective, summary?.careerObjective, legacyProfile?.bio]);
  const preferredCountries = new Set([
    ...array(preferences?.preferredCountries),
    ...array(legacyProfile?.targetCountries)
  ].map((item) => item.toLowerCase()));

  const profileSignalCount = [researchTerms, keywordTerms, skillTerms, publicationTerms, academicTerms, objectiveTerms]
    .filter((set) => set.size > 0).length;
  if (profileSignalCount === 0) return { profileStrength: 0, items: [] as ProfessorProfileMatch[] };

  const searchTerms = [...new Set([...researchTerms, ...keywordTerms])].slice(0, 18);
  const filter: Record<string, unknown> = { status: "PUBLISHED" };
  if (searchTerms.length > 0) filter.$text = { $search: searchTerms.join(" ") };

  let professors = await Professor.find(filter)
    .limit(250)
    .populate("universityId", "name slug")
    .lean();

  if (professors.length < limit) {
    professors = await Professor.find({ status: "PUBLISHED" })
      .sort({ citedByCount: -1, publicationCount: -1 })
      .limit(250)
      .populate("universityId", "name slug")
      .lean();
  }

  const scored = professors.map((professor) => {
    const professorResearch = terms([...array(professor.researchAreas), professor.department, professor.bio]);
    const professorKeywords = terms([...array(professor.keywords), ...array(professor.researchAreas), professor.bio]);
    const professorAll = terms([
      ...array(professor.researchAreas),
      ...array(professor.keywords),
      professor.department,
      professor.bio,
      professor.title
    ]);

    const research = overlapScore(researchTerms, professorResearch);
    const keywords = overlapScore(keywordTerms, professorKeywords);
    const publicationsScore = overlapScore(publicationTerms, professorAll);
    const skillsScore = overlapScore(skillTerms, professorAll);
    const academic = overlapScore(academicTerms, professorAll);
    const objective = overlapScore(objectiveTerms, professorAll);
    const country = preferredCountries.size > 0 && preferredCountries.has(String(professor.country).toLowerCase()) ? 1 : 0;

    const total = research * 30 + keywords * 20 + publicationsScore * 15 + skillsScore * 10 + academic * 10 + objective * 10 + country * 5;
    const university = professor.universityId && typeof professor.universityId === "object"
      ? professor.universityId as unknown as Record<string, unknown>
      : {};

    return {
      id: String(professor._id),
      slug: String(professor.slug),
      fullName: String(professor.fullName),
      title: String(professor.title ?? ""),
      department: String(professor.department ?? ""),
      country: String(professor.country ?? ""),
      universityName: String(university.name ?? ""),
      researchAreas: array(professor.researchAreas),
      matchScore: Math.round(total),
      matchReasons: [
        reason("Research interests align", research),
        reason("Strong keyword overlap", keywords),
        reason("Publication topics align", publicationsScore),
        reason("Methods and skills align", skillsScore),
        reason("Academic background aligns", academic),
        reason("Research objective aligns", objective),
        country ? "Preferred country" : null
      ].filter((value): value is string => Boolean(value))
    } satisfies ProfessorProfileMatch;
  });

  const items = scored
    .filter((item) => item.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || a.fullName.localeCompare(b.fullName))
    .slice(0, limit);

  return { profileStrength: Math.round((profileSignalCount / 6) * 100), items };
}
