import { connectDatabase } from "@/server/db/mongoose";
import { AppError } from "@/server/errors/AppError";
import { CvAnalysis } from "@/server/models/CvAnalysis";
import { Opportunity } from "@/server/models/Opportunity";
import { Scholarship } from "@/server/models/Scholarship";
import { StudentDocument } from "@/server/models/StudentDocument";
import { StudentProfile } from "@/server/models/StudentProfile";
import { StudentPublication } from "@/server/models/StudentPublication";

const normalize = (value: string) => value.trim().toLowerCase();
const tokens = (values: string[]) => new Set(values.flatMap((value) => normalize(value).split(/[^a-z0-9+#.-]+/).filter((part) => part.length > 2)));
const common = (a: Set<string>, values: string[]) => { const b = tokens(values); let count = 0; for (const item of a) if (b.has(item)) count += 1; return count; };
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function deadlineIntelligence(deadline: Date | null | undefined, lastVerifiedAt: Date | null | undefined) {
  if (!deadline) return { status: "UNKNOWN" as const, daysRemaining: null, confidence: lastVerifiedAt ? "MEDIUM" as const : "LOW" as const };
  const daysRemaining = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
  const ageDays = lastVerifiedAt ? Math.floor((Date.now() - new Date(lastVerifiedAt).getTime()) / 86_400_000) : null;
  const confidence = ageDays === null ? "LOW" as const : ageDays <= 30 ? "HIGH" as const : ageDays <= 90 ? "MEDIUM" as const : "LOW" as const;
  return { status: daysRemaining < 0 ? "CLOSED" as const : daysRemaining <= 7 ? "CLOSING_SOON" as const : "OPEN" as const, daysRemaining, confidence };
}

export async function getApplicationReadiness(userId: string) {
  await connectDatabase();
  const [profile, publicationCount, cv, cvAnalysis] = await Promise.all([
    StudentProfile.findOne({ userId }).lean(), StudentPublication.countDocuments({ userId }), StudentDocument.findOne({ userId, kind: "CV" }).sort({ createdAt: -1 }).lean(), CvAnalysis.findOne({ userId }).sort({ createdAt: -1 }).lean()
  ]);
  if (!profile) throw new AppError("PROFILE_REQUIRED", 400, "Complete your academic profile first.");
  const components = {
    academicProfile: profile.fieldOfStudy && profile.currentDegree ? 20 : profile.fieldOfStudy || profile.currentDegree ? 10 : 0,
    researchFocus: Math.min(20, profile.researchInterests.length * 5 + profile.preferredResearchAreas.length * 3),
    skills: Math.min(15, profile.skills.length * 3),
    publications: publicationCount > 0 ? Math.min(15, 5 + publicationCount * 5) : 0,
    cv: cv ? (cvAnalysis ? Math.round(cvAnalysis.score * 0.2) : 12) : 0,
    targeting: Math.min(10, profile.targetCountries.length * 2 + profile.targetDegrees.length * 2)
  };
  const score = clamp(Object.values(components).reduce((sum, value) => sum + value, 0));
  const missing = [!profile.fieldOfStudy ? "Field of study" : null, profile.researchInterests.length === 0 ? "Research interests" : null, profile.skills.length === 0 ? "Skills" : null, !cv ? "Academic CV" : null, profile.targetDegrees.length === 0 ? "Target degree" : null].filter(Boolean) as string[];
  const status = score >= 75 ? "APPLY_NOW" as const : score >= 45 ? "IMPROVE_FIRST" as const : "LOW_READINESS" as const;
  return { score, status, components, missing, recommendedActions: missing.slice(0, 4).map((item) => `Complete or strengthen: ${item}`), publicationCount, cvAnalysisScore: cvAnalysis?.score ?? null };
}

export async function evaluateEligibility(userId: string, type: "SCHOLARSHIP" | "OPPORTUNITY", targetId: string) {
  await connectDatabase();
  const profile = await StudentProfile.findOne({ userId }).lean();
  if (!profile) throw new AppError("PROFILE_REQUIRED", 400, "Complete your academic profile first.");
  const profileTokens = tokens([profile.fieldOfStudy, ...profile.researchInterests, ...profile.skills]);
  const reasons: string[] = []; const gaps: string[] = []; let score = 20;
  if (type === "SCHOLARSHIP") {
    const scholarship = await Scholarship.findOne({ _id: targetId, status: "PUBLISHED" }).lean();
    if (!scholarship) throw new AppError("TARGET_NOT_FOUND", 404, "Published scholarship not found.");
    const fieldMatch = common(profileTokens, scholarship.studyFields);
    if (fieldMatch) { score += 25; reasons.push("Study field overlaps with your profile"); } else gaps.push("No confirmed study-field overlap");
    const levels = scholarship.degreeLevels.map((value) => value.toUpperCase());
    if (levels.length === 0) gaps.push("Degree-level requirement is not structured");
    else if (profile.targetDegrees.some((degree) => levels.includes(degree))) { score += 20; reasons.push("Target degree matches"); } else gaps.push("Target degree may not match");
    if (scholarship.nationalityRestrictions.length && profile.country) gaps.push("Nationality restrictions require manual verification against the official source");
    if (!scholarship.eligibility) gaps.push("Eligibility criteria are not fully structured"); else score += 10;
  } else {
    const opportunity = await Opportunity.findOne({ _id: targetId, status: "PUBLISHED" }).lean();
    if (!opportunity) throw new AppError("TARGET_NOT_FOUND", 404, "Published opportunity not found.");
    const areaMatch = common(profileTokens, [...opportunity.fields, ...opportunity.researchAreas]);
    if (areaMatch) { score += 30; reasons.push("Research/field terms overlap"); } else gaps.push("No confirmed research-area overlap");
    if (!opportunity.eligibility) gaps.push("Eligibility criteria are not fully structured"); else score += 10;
  }
  if (!profile.country) gaps.push("Your country/nationality is missing");
  if (!profile.gpa) gaps.push("Your GPA is missing or not normalized");
  const confidence = gaps.length === 0 ? "HIGH" as const : gaps.length <= 2 ? "MEDIUM" as const : "LOW" as const;
  const result = score >= 65 && confidence === "HIGH" ? "ELIGIBLE" as const : score >= 40 ? "POSSIBLY_ELIGIBLE" as const : "MISSING_INFORMATION" as const;
  return { result, score: clamp(score), confidence, reasons, gaps, warning: "Eligibility is a decision-support estimate. Verify the official source before applying." };
}

export function scholarshipFundingBreakdown(item: { tuitionCoverage?: string; stipend?: string; travelSupport?: string; fundingAmount?: string; fundingType?: string }) {
  return { fundingType: item.fundingType || "UNKNOWN", fundingAmount: item.fundingAmount || "Unknown", tuition: item.tuitionCoverage || "Unknown", stipend: item.stipend || "Unknown", accommodation: "Unknown", travel: item.travelSupport || "Unknown", insurance: "Unknown", applicationFees: "Unknown", estimatedRemainingStudentCost: "Unknown", warning: "Unknown funding components are never inferred or fabricated. Verify the official source." };
}
