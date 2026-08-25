import { getServerEnv } from "@/config/env";
import { connectDatabase } from "@/server/db/mongoose";
import { AppError } from "@/server/errors/AppError";
import { AIRequest } from "@/server/models/AIRequest";
import { Opportunity } from "@/server/models/Opportunity";
import { Professor } from "@/server/models/Professor";
import { Scholarship } from "@/server/models/Scholarship";
import { StudentProfile } from "@/server/models/StudentProfile";
import { User } from "@/server/models/User";

const words = (values: string[]) => new Set(values.flatMap((value) => value.toLowerCase().split(/[^a-z0-9+#.-]+/).filter((part) => part.length > 2)));
const overlap = (a: Set<string>, values: string[]) => {
  const b = words(values);
  let count = 0;
  for (const item of a) if (b.has(item)) count += 1;
  return count;
};
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export async function buildRecommendations(userId: string) {
  await connectDatabase();
  const profile = await StudentProfile.findOne({ userId }).lean();
  if (!profile) throw new AppError("PROFILE_REQUIRED", 400, "Complete your academic profile to receive recommendations.");
  const interestTokens = words([profile.fieldOfStudy, ...profile.researchInterests, ...profile.preferredResearchAreas, ...profile.skills]);
  const targetCountries = new Set(profile.targetCountries.map((value) => value.toLowerCase()));
  const targetDegrees = new Set(profile.targetDegrees.map((value) => value.toUpperCase()));

  const [professors, scholarships, opportunities] = await Promise.all([
    Professor.find({ status: "PUBLISHED" }).limit(250).lean(),
    Scholarship.find({ status: "PUBLISHED" }).limit(250).lean(),
    Opportunity.find({ status: "PUBLISHED" }).limit(250).lean()
  ]);

  const professorMatches = professors.map((item) => {
    const shared = overlap(interestTokens, [...item.researchAreas, ...item.keywords, item.department, item.bio]);
    const country = targetCountries.size === 0 || targetCountries.has(item.country.toLowerCase());
    const score = clamp(Math.min(70, shared * 14) + (country ? 20 : 0) + (item.email ? 10 : 0));
    const matchedReasons = [shared ? `${shared} research/skill terms overlap` : null, country && targetCountries.size ? `Target country: ${item.country}` : null].filter(Boolean) as string[];
    return { id: item._id.toString(), slug: item.slug, kind: "PROFESSOR" as const, title: item.fullName, subtitle: `${item.title}${item.department ? ` · ${item.department}` : ""}`, country: item.country, matchScore: score, matchedReasons, possibleGaps: shared === 0 ? ["No strong research-keyword overlap detected"] : [], recommendedActions: item.email ? ["Review recent work and prepare a personalized outreach draft"] : ["Review the official profile for a public contact method"] };
  }).sort((a, b) => b.matchScore - a.matchScore).slice(0, 20);

  const scholarshipMatches = scholarships.map((item) => {
    const field = overlap(interestTokens, item.studyFields);
    const country = targetCountries.size === 0 || targetCountries.has(item.country.toLowerCase());
    const degree = targetDegrees.size === 0 || item.degreeLevels.some((value) => targetDegrees.has(value.toUpperCase()));
    const funding = profile.fundingPreference === "ANY" || (profile.fundingPreference === "FULLY_FUNDED" ? item.fundingType === "FULL" : item.fundingType !== "UNKNOWN");
    const score = clamp(Math.min(35, field * 12) + (country ? 25 : 0) + (degree ? 20 : 0) + (funding ? 20 : 0));
    return { id: item._id.toString(), slug: item.slug, kind: "SCHOLARSHIP" as const, title: item.name, subtitle: item.provider, country: item.country, matchScore: score, matchedReasons: [field ? `${field} study-field terms overlap` : null, country ? "Country preference matches" : null, degree ? "Degree preference matches" : null, funding ? "Funding preference matches" : null].filter(Boolean) as string[], possibleGaps: [!country ? "Country is outside your current targets" : null, !degree ? "Degree level may not match your targets" : null].filter(Boolean) as string[], recommendedActions: ["Verify eligibility and deadline on the official source before applying"] };
  }).sort((a, b) => b.matchScore - a.matchScore).slice(0, 20);

  const opportunityMatches = opportunities.map((item) => {
    const area = overlap(interestTokens, [...item.fields, ...item.researchAreas, item.description]);
    const country = targetCountries.size === 0 || targetCountries.has(item.country.toLowerCase());
    const degreeLike = targetDegrees.size === 0 || (item.type === "PHD" && targetDegrees.has("PHD")) || (item.type === "MASTERS" && targetDegrees.has("MASTERS")) || !["PHD", "MASTERS"].includes(item.type);
    const score = clamp(Math.min(55, area * 11) + (country ? 25 : 0) + (degreeLike ? 20 : 0));
    return { id: item._id.toString(), slug: item.slug, kind: "OPPORTUNITY" as const, title: item.title, subtitle: `${item.type.replaceAll("_", " ")} · ${item.organization}`, country: item.country, matchScore: score, matchedReasons: [area ? `${area} research/skill terms overlap` : null, country ? "Country preference matches" : null, degreeLike ? "Opportunity level aligns" : null].filter(Boolean) as string[], possibleGaps: [!degreeLike ? "Opportunity level may not match your target degree" : null].filter(Boolean) as string[], recommendedActions: ["Review required documents and official application source"] };
  }).sort((a, b) => b.matchScore - a.matchScore).slice(0, 20);

  await AIRequest.create({ userId, tool: "RECOMMENDATIONS", mode: "DETERMINISTIC", provider: "none", status: "COMPLETED" });
  return { mode: "DETERMINISTIC" as const, professors: professorMatches, scholarships: scholarshipMatches, opportunities: opportunityMatches };
}

function deterministicDraft(type: "EMAIL" | "SOP" | "PROPOSAL", user: { displayName: string }, profile: NonNullable<Awaited<ReturnType<typeof StudentProfile.findOne>>>, context: string) {
  const interests = profile.researchInterests.slice(0, 4).join(", ") || profile.fieldOfStudy || "my research interests";
  if (type === "EMAIL") return `Subject: Research opportunity inquiry\n\nDear Professor,\n\nMy name is ${user.displayName}. I am interested in ${interests}. ${context ? `${context.trim()} ` : ""}I would be grateful for the opportunity to learn whether there may be a suitable research or supervision opening in your group.\n\nI can share my CV and supporting documents for review.\n\nBest regards,\n${user.displayName}`;
  if (type === "SOP") return `Statement of Purpose\n\nI am ${user.displayName}, with an academic focus in ${profile.fieldOfStudy || "my current field"}. My primary interests include ${interests}.\n\nAcademic motivation\n${context || "Explain the academic experiences that shaped your interest in this field."}\n\nPreparation and experience\nDescribe relevant coursework, research, projects, skills, and measurable outcomes without exaggeration.\n\nFuture goals\nExplain the research questions you want to pursue, why the target program is a strong fit, and how the training supports your long-term goals.\n\nConclusion\nConnect your preparation, research interests, and intended contribution in a concise final paragraph.`;
  return `Research Proposal Outline\n\nWorking area: ${interests}\n\n1. Problem and motivation\n${context || "State the research problem, why it matters, and the gap you intend to investigate."}\n\n2. Research questions\nList specific, testable research questions.\n\n3. Related work\nSummarize verified literature and clearly identify the unresolved gap. Do not invent citations.\n\n4. Methodology\nDescribe data, experimental design, evaluation metrics, baselines, and reproducibility controls.\n\n5. Expected contribution\nState realistic scientific or engineering contributions.\n\n6. Risks and limitations\nDocument assumptions, ethical concerns, limitations, and fallback methods.`;
}

async function optionalAiDraft(type: "EMAIL" | "SOP" | "PROPOSAL", profile: Record<string, unknown>, context: string, fallback: string) {
  const env = getServerEnv();
  if (env.AI_PROVIDER !== "openai-compatible" || !env.AI_BASE_URL || !env.AI_API_KEY || !env.AI_MODEL) return { mode: "DETERMINISTIC" as const, text: fallback };
  const response = await fetch(`${env.AI_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.AI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: env.AI_MODEL, temperature: 0.3, messages: [
      { role: "system", content: "You are an academic writing assistant. Use only facts supplied by the user/profile. Never invent professor facts, publications, citations, deadlines, eligibility, grades, awards, or research results. Return a polished draft that the student must review." },
      { role: "user", content: JSON.stringify({ task: type, profile, context, fallback }) }
    ] })
  });
  if (!response.ok) return { mode: "DETERMINISTIC" as const, text: fallback };
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content?.trim();
  return text ? { mode: "AI" as const, text } : { mode: "DETERMINISTIC" as const, text: fallback };
}

export async function generateAcademicDraft(userId: string, type: "EMAIL" | "SOP" | "PROPOSAL", context: string) {
  await connectDatabase();
  const [user, profileDoc] = await Promise.all([User.findById(userId).lean(), StudentProfile.findOne({ userId }).lean()]);
  if (!user || !profileDoc) throw new AppError("PROFILE_REQUIRED", 400, "Complete your academic profile before generating a draft.");
  const fallback = deterministicDraft(type, { displayName: user.displayName }, profileDoc as never, context);
  const result = await optionalAiDraft(type, { fieldOfStudy: profileDoc.fieldOfStudy, researchInterests: profileDoc.researchInterests, skills: profileDoc.skills, targetDegrees: profileDoc.targetDegrees, targetCountries: profileDoc.targetCountries }, context, fallback);
  await AIRequest.create({ userId, tool: type, mode: result.mode, provider: result.mode === "AI" ? getServerEnv().AI_PROVIDER : "none", status: "COMPLETED" });
  return { ...result, warning: "Review and verify every factual claim before sending or submitting." };
}
