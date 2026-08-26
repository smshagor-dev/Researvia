import { createHash } from "node:crypto";
import type { Types } from "mongoose";
import { connectDatabase } from "@/server/db/mongoose";
import { AcademicMatchAlert } from "@/server/models/AcademicMatchAlert";
import { Notification } from "@/server/models/Notification";
import { Opportunity } from "@/server/models/Opportunity";
import { Scholarship } from "@/server/models/Scholarship";
import { StudentProfile } from "@/server/models/StudentProfile";
import { User } from "@/server/models/User";
import { enqueueJob } from "@/server/jobs/job.service";
import { getNotificationPreferences } from "@/server/notifications/notification-preferences.service";

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_RESULTS = 250;
const MAX_NOTIFICATIONS_PER_TYPE = 12;

type MatchProfile = {
  fieldOfStudy?: string | null;
  researchInterests?: string[];
  preferredResearchAreas?: string[];
  skills?: string[];
  targetDegrees?: string[];
  targetCountries?: string[];
  fundingPreference?: string | null;
  gpa?: string | null;
  completeness?: number | null;
};

type ScholarshipCandidate = {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  country: string;
  studyFields?: string[];
  degreeLevels?: string[];
  fundingType?: string | null;
  eligibility?: string | null;
  updatedAt?: Date | string | null;
};

type OpportunityCandidate = {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  type: string;
  country: string;
  fields?: string[];
  researchAreas?: string[];
  eligibility?: string | null;
  description?: string | null;
  updatedAt?: Date | string | null;
};

type AcademicCandidate = ScholarshipCandidate | OpportunityCandidate;

function tokens(values: unknown[]): Set<string> {
  return new Set(
    values
      .flatMap((value) => String(value ?? "").toLowerCase().split(/[^a-z0-9+#.-]+/))
      .map((value) => value.trim())
      .filter((value) => value.length >= 2)
  );
}

function overlap(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let matches = 0;
  for (const value of a) if (b.has(value)) matches += 1;
  return matches / Math.max(1, Math.min(a.size, b.size));
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function weekBucket(date = new Date()) {
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return `${date.getUTCFullYear()}-${Math.floor((day - yearStart) / 604800000)}`;
}

function fingerprint(parts: unknown[]) {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 40);
}

function normalizedDegree(value: string) {
  const normalized = value.toUpperCase().replace(/[^A-Z]/g, "");
  if (normalized === "PHD" || normalized === "DOCTORATE" || normalized === "DOCTORAL") return "PHD";
  if (normalized === "MASTER" || normalized === "MASTERS" || normalized === "MSC" || normalized === "MS") return "MASTERS";
  if (normalized === "BACHELOR" || normalized === "BACHELORS" || normalized === "BSC" || normalized === "BS") return "BACHELORS";
  return normalized;
}

function degreeTokens(profile: MatchProfile) {
  return new Set((profile.targetDegrees ?? []).map(normalizedDegree));
}

function profileTopics(profile: MatchProfile) {
  return tokens([
    profile.fieldOfStudy,
    ...(profile.researchInterests ?? []),
    ...(profile.preferredResearchAreas ?? []),
    ...(profile.skills ?? [])
  ]);
}

function scholarshipScore(profile: MatchProfile, item: ScholarshipCandidate) {
  const topicScore = overlap(profileTopics(profile), tokens([...(item.studyFields ?? []), item.name, item.eligibility]));
  let score = 28 + topicScore * 40;

  if ((profile.targetCountries ?? []).some((country) => country.toLowerCase() === item.country.toLowerCase())) score += 15;

  const wanted = degreeTokens(profile);
  const eligible = new Set((item.degreeLevels ?? []).map(normalizedDegree));
  if (!eligible.size || !wanted.size || [...wanted].some((degree) => eligible.has(degree))) score += 12;

  if (item.fundingType === "FULL") score += 5;
  if (profile.fundingPreference === "FULLY_FUNDED" && item.fundingType !== "FULL") score -= 10;

  return clamp(score);
}

function opportunityScore(profile: MatchProfile, item: OpportunityCandidate) {
  const topicScore = overlap(
    profileTopics(profile),
    tokens([...(item.fields ?? []), ...(item.researchAreas ?? []), item.title, item.description, item.eligibility])
  );
  let score = 30 + topicScore * 48;

  if ((profile.targetCountries ?? []).some((country) => country.toLowerCase() === item.country.toLowerCase())) score += 14;

  const degrees = degreeTokens(profile);
  if ((item.type === "PHD" && degrees.has("PHD")) || (item.type === "MASTERS" && degrees.has("MASTERS"))) score += 8;
  if (["RESEARCH_ASSISTANT", "RESEARCH_INTERNSHIP", "INDUSTRY_RESEARCH_INTERNSHIP", "RESEARCH_PROJECT", "FELLOWSHIP"].includes(item.type) && degrees.has("RESEARCH")) score += 8;

  return clamp(score);
}

function candidateLabel(entityType: "SCHOLARSHIP" | "OPPORTUNITY", entity: AcademicCandidate) {
  return entityType === "SCHOLARSHIP" ? (entity as ScholarshipCandidate).name : (entity as OpportunityCandidate).title;
}

async function notify(input: {
  userId: string;
  entityType: "SCHOLARSHIP" | "OPPORTUNITY";
  entity: AcademicCandidate;
  score: number;
  reasons: string[];
  web: boolean;
  push: boolean;
}) {
  const { userId, entityType, entity, score, reasons, web, push } = input;
  const fp = fingerprint([entity.updatedAt, score, reasons]);
  const alert = await AcademicMatchAlert.findOne({ userId, entityType, entityId: entity._id }).lean();
  const now = new Date();
  const cooled = !alert?.lastNotifiedAt || now.getTime() - new Date(alert.lastNotifiedAt).getTime() >= COOLDOWN_MS;
  const improved = alert ? score >= Number(alert.lastScore) + 10 : true;
  const changed = !alert || alert.lastFingerprint !== fp;
  if (!changed || (!cooled && !improved)) return false;

  await AcademicMatchAlert.findOneAndUpdate(
    { userId, entityType, entityId: entity._id },
    { $set: { lastScore: score, lastFingerprint: fp, lastNotifiedAt: now }, $setOnInsert: { userId, entityType, entityId: entity._id } },
    { upsert: true, returnDocument: "after" }
  );
  if (!web && !push) return true;

  const path = entityType === "SCHOLARSHIP" ? `/scholarships/${entity.slug}` : `/opportunities/${entity.slug}`;
  const kind = entityType === "SCHOLARSHIP" ? "scholarship" : "research opportunity";
  const label = candidateLabel(entityType, entity);
  const dedupeKey = `academic-match:${entityType}:${String(entity._id)}:${weekBucket(now)}`;
  const notification = await Notification.findOneAndUpdate(
    { userId, dedupeKey },
    {
      $setOnInsert: {
        userId,
        type: `${entityType}_MATCH`,
        title: `${score}% ${kind} match`,
        message: `${label} matches your academic profile. ${reasons.slice(0, 2).join(" ")}`,
        href: path,
        dedupeKey,
        metadata: { entityType, entityId: String(entity._id), score, reasons }
      }
    },
    { upsert: true, returnDocument: "after" }
  ).lean();

  if (push && notification?._id) {
    await enqueueJob({
      type: "SEND_PUSH_NOTIFICATION",
      payload: { notificationId: String(notification._id) },
      idempotencyKey: `push:${notification._id}`
    });
  }
  return true;
}

export async function evaluateAcademicMatchesForUser(userId: string) {
  await connectDatabase();
  const rawProfile = await StudentProfile.findOne({ userId }).lean();
  if (!rawProfile) return { scholarships: 0, opportunities: 0 };
  const profile = rawProfile as unknown as MatchProfile;
  const profileCompleteness = Number(profile.completeness ?? (rawProfile.onboardingCompletedAt ? 100 : 0));
  if (profileCompleteness < 25) return { scholarships: 0, opportunities: 0 };

  const prefs = await getNotificationPreferences(userId);
  const now = new Date();
  const [rawScholarships, rawOpportunities] = await Promise.all([
    Scholarship.find({ status: "PUBLISHED", $or: [{ deadline: null }, { deadline: { $gte: now } }] }).sort({ deadline: 1, retrievedAt: -1 }).limit(MAX_RESULTS).lean(),
    Opportunity.find({ status: "PUBLISHED", $or: [{ deadline: null }, { deadline: { $gte: now } }] }).sort({ deadline: 1, retrievedAt: -1 }).limit(MAX_RESULTS).lean()
  ]);
  const scholarships = rawScholarships as unknown as ScholarshipCandidate[];
  const opportunities = rawOpportunities as unknown as OpportunityCandidate[];

  let scholarshipNotifications = 0;
  let opportunityNotifications = 0;

  const rankedScholarships = scholarships
    .map((entity) => ({ entity, score: scholarshipScore(profile, entity) }))
    .filter((result) => result.score >= prefs.minimumScholarshipMatchScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_NOTIFICATIONS_PER_TYPE);

  for (const result of rankedScholarships) {
    if (await notify({
      userId,
      entityType: "SCHOLARSHIP",
      entity: result.entity,
      score: result.score,
      reasons: ["Research interests were compared with the scholarship study fields.", "Country, target degree, and funding preferences were considered."],
      web: prefs.scholarshipMatchWeb,
      push: prefs.scholarshipMatchPush
    })) scholarshipNotifications += 1;
  }

  const rankedOpportunities = opportunities
    .map((entity) => ({ entity, score: opportunityScore(profile, entity) }))
    .filter((result) => result.score >= prefs.minimumOpportunityMatchScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_NOTIFICATIONS_PER_TYPE);

  for (const result of rankedOpportunities) {
    if (await notify({
      userId,
      entityType: "OPPORTUNITY",
      entity: result.entity,
      score: result.score,
      reasons: ["Research topics and fields were compared with your academic profile.", "Location and target degree preferences were considered."],
      web: prefs.opportunityMatchWeb,
      push: prefs.opportunityMatchPush
    })) opportunityNotifications += 1;
  }

  return { scholarships: scholarshipNotifications, opportunities: opportunityNotifications };
}

export async function enqueueAcademicMatchEvaluationForAllStudents(reason = "catalog-reconciliation") {
  await connectDatabase();
  const users = await User.find({ role: "STUDENT", status: "ACTIVE" }).select({ _id: 1 }).limit(5000).lean();
  const bucket = new Date().toISOString().slice(0, 13);
  for (const user of users) {
    await enqueueJob({
      type: "EVALUATE_ACADEMIC_MATCHES",
      payload: { userId: String(user._id), reason },
      idempotencyKey: `academic-match:${user._id}:${reason}:${bucket}`,
      maxAttempts: 3
    });
  }
  return { queued: users.length };
}
