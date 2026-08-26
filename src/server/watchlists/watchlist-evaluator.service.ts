import { connectDatabase } from "@/server/db/mongoose";
import { DataChangeEvent } from "@/server/models/DataChangeEvent";
import { Opportunity } from "@/server/models/Opportunity";
import { Professor } from "@/server/models/Professor";
import { ResearchLab } from "@/server/models/ResearchLab";
import { Scholarship } from "@/server/models/Scholarship";
import { Watchlist } from "@/server/models/Watchlist";
import { notifyUser } from "@/server/notifications/notification.service";

type Match = { id: string; title: string; href: string };
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const regexes = (values: string[]) => values.filter(Boolean).map((value) => new RegExp(escapeRegex(value), "i"));

async function scholarshipMatches(watch: { query: string; countries: string[]; researchTopics: string[]; fundingTypes: string[] }, since: Date): Promise<Match[]> {
  let query = Scholarship.find().where("status").equals("PUBLISHED").where("updatedAt").gt(since);
  if (watch.countries.length) query = query.where("country").in(watch.countries);
  if (watch.fundingTypes.length) query = query.where("fundingType").in(watch.fundingTypes);
  const topics = regexes(watch.researchTopics);
  if (topics.length) query = query.where("studyFields").in(topics);
  const text = watch.query.trim();
  if (text) { const value = new RegExp(escapeRegex(text), "i"); query = query.or([{ name: value }, { provider: value }, { studyFields: value }, { eligibility: value }]); }
  const items = await query.sort({ updatedAt: -1 }).limit(10).select("name slug").lean();
  return items.map((item) => ({ id: item._id.toString(), title: item.name, href: `/dashboard/scholarships/${item.slug}` }));
}

async function opportunityMatches(watch: { query: string; countries: string[]; researchTopics: string[] }, since: Date): Promise<Match[]> {
  let query = Opportunity.find().where("status").equals("PUBLISHED").where("updatedAt").gt(since);
  if (watch.countries.length) query = query.where("country").in(watch.countries);
  const topics = regexes(watch.researchTopics);
  if (topics.length) query = query.or([{ fields: { $in: topics } }, { researchAreas: { $in: topics } }]);
  const text = watch.query.trim();
  if (text) { const value = new RegExp(escapeRegex(text), "i"); query = query.or([{ title: value }, { organization: value }, { fields: value }, { researchAreas: value }, { description: value }]); }
  const items = await query.sort({ updatedAt: -1 }).limit(10).select("title slug").lean();
  return items.map((item) => ({ id: item._id.toString(), title: item.title, href: `/dashboard/opportunities/${item.slug}` }));
}

async function professorMatches(watch: { query: string; countries: string[]; researchTopics: string[]; professorId?: unknown }, since: Date): Promise<Match[]> {
  let query = Professor.find().where("status").equals("PUBLISHED").where("updatedAt").gt(since);
  if (watch.professorId) query = query.where("_id").equals(watch.professorId);
  if (watch.countries.length) query = query.where("country").in(watch.countries);
  const topics = regexes(watch.researchTopics);
  if (topics.length) query = query.or([{ researchAreas: { $in: topics } }, { keywords: { $in: topics } }]);
  const text = watch.query.trim();
  if (text) { const value = new RegExp(escapeRegex(text), "i"); query = query.or([{ fullName: value }, { department: value }, { researchAreas: value }, { keywords: value }]); }
  const items = await query.sort({ updatedAt: -1 }).limit(10).select("fullName slug").lean();
  return items.map((item) => ({ id: item._id.toString(), title: item.fullName, href: `/dashboard/professors/${item.slug}` }));
}

async function labMatches(watch: { query: string; researchTopics: string[] }, since: Date): Promise<Match[]> {
  let query = ResearchLab.find().where("status").equals("PUBLISHED").where("updatedAt").gt(since);
  const topics = regexes(watch.researchTopics);
  if (topics.length) query = query.where("researchTopics").in(topics);
  const text = watch.query.trim();
  if (text) { const value = new RegExp(escapeRegex(text), "i"); query = query.or([{ name: value }, { researchTopics: value }, { description: value }]); }
  const items = await query.sort({ updatedAt: -1 }).limit(10).select("name slug").lean();
  return items.map((item) => ({ id: item._id.toString(), title: item.name, href: `/dashboard/research?tab=labs&q=${encodeURIComponent(item.name)}` }));
}

async function deadlineChangeMatches(since: Date): Promise<Match[]> {
  const changes = await DataChangeEvent.find().where("field").equals("deadline").where("createdAt").gt(since).where("entityType").in(["SCHOLARSHIP", "OPPORTUNITY"]).sort({ createdAt: -1 }).limit(10).lean();
  const matches: Match[] = [];
  for (const change of changes) {
    if (change.entityType === "SCHOLARSHIP") {
      const item = await Scholarship.findOne({ _id: change.entityId, status: "PUBLISHED" }).select("name slug").lean();
      if (item) matches.push({ id: change._id.toString(), title: `${item.name} deadline changed`, href: `/dashboard/scholarships/${item.slug}` });
    } else if (change.entityType === "OPPORTUNITY") {
      const item = await Opportunity.findOne({ _id: change.entityId, status: "PUBLISHED" }).select("title slug").lean();
      if (item) matches.push({ id: change._id.toString(), title: `${item.title} deadline changed`, href: `/dashboard/opportunities/${item.slug}` });
    }
  }
  return matches;
}

async function evaluateOne(watch: Awaited<ReturnType<typeof Watchlist.findOne>>) {
  if (!watch) return;
  const since = watch.lastEvaluatedAt ? new Date(watch.lastEvaluatedAt) : new Date(0);
  const checkpoint = new Date();
  let matches: Match[] = [];
  if (watch.targetType === "SCHOLARSHIP") matches = await scholarshipMatches(watch, since);
  else if (watch.targetType === "OPPORTUNITY") matches = await opportunityMatches(watch, since);
  else if (watch.targetType === "PROFESSOR") matches = await professorMatches(watch, since);
  else if (watch.targetType === "LAB") matches = await labMatches(watch, since);
  else if (watch.targetType === "DEADLINE_CHANGE") matches = await deadlineChangeMatches(since);

  if (matches.length) {
    const preview = matches.slice(0, 3).map((item) => item.title).join("; ");
    await notifyUser({ userId: watch.userId.toString(), type: "WATCHLIST_MATCH", title: `${matches.length} watchlist match${matches.length === 1 ? "" : "es"}: ${watch.name}`, message: preview, href: matches[0]?.href ?? "/dashboard/watchlists" });
  }
  await Watchlist.updateOne({ _id: watch._id }, { $set: { lastEvaluatedAt: checkpoint, ...(matches.length ? { lastMatchedAt: checkpoint } : {}) } });
}

export async function evaluateEnabledWatchlists(limit = 500) {
  await connectDatabase();
  const watches = await Watchlist.find({ enabled: true }).sort({ lastEvaluatedAt: 1, updatedAt: 1 }).limit(Math.min(Math.max(limit, 1), 1000));
  let matchedWatchlists = 0;
  for (const watch of watches) {
    const before = watch.lastMatchedAt?.getTime() ?? 0;
    await evaluateOne(watch);
    const refreshed = await Watchlist.findById(watch._id).select("lastMatchedAt").lean();
    if ((refreshed?.lastMatchedAt?.getTime() ?? 0) > before) matchedWatchlists += 1;
  }
  return { evaluated: watches.length, matchedWatchlists };
}
