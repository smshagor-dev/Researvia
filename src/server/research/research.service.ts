import { connectDatabase } from "@/server/db/mongoose";
import { AppError } from "@/server/errors/AppError";
import { Paper } from "@/server/models/Paper";
import { ReadingItem } from "@/server/models/ReadingItem";
import { ResearchLab } from "@/server/models/ResearchLab";
import { StudentPublication } from "@/server/models/StudentPublication";

const limitValue = (value?: number) => Math.max(1, Math.min(value ?? 20, 50));
const safeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function searchPapers(query: string, limit?: number) {
  await connectDatabase(); const q = query.trim();
  const filter = q ? { status: "PUBLISHED", $text: { $search: q } } : { status: "PUBLISHED" };
  return Paper.find(filter).sort(q ? { score: { $meta: "textScore" }, publicationDate: -1 } : { publicationDate: -1 }).limit(limitValue(limit)).lean();
}
export async function searchLabs(query: string, limit?: number) {
  await connectDatabase(); const q = query.trim();
  const filter = q ? { status: "PUBLISHED", $text: { $search: q } } : { status: "PUBLISHED" };
  return ResearchLab.find(filter).sort({ lastVerifiedAt: -1 }).limit(limitValue(limit)).lean();
}
export async function topicExplorer(query: string) {
  await connectDatabase(); const q = query.trim(); if (!q) return { topic: "", relatedTopics: [], papers: [], labs: [] };
  const regex = new RegExp(safeRegex(q), "i");
  const [papers, labs] = await Promise.all([Paper.find({ status: "PUBLISHED", $or: [{ topics: regex }, { title: regex }] }).sort({ publicationDate: -1 }).limit(20).lean(), ResearchLab.find({ status: "PUBLISHED", researchTopics: regex }).limit(20).lean()]);
  const frequency = new Map<string, number>();
  for (const item of papers) for (const topic of item.topics) if (topic.toLowerCase() !== q.toLowerCase()) frequency.set(topic, (frequency.get(topic) ?? 0) + 1);
  for (const item of labs) for (const topic of item.researchTopics) if (topic.toLowerCase() !== q.toLowerCase()) frequency.set(topic, (frequency.get(topic) ?? 0) + 1);
  const relatedTopics = [...frequency.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12).map(([topic,count])=>({topic,count}));
  return { topic: q, relatedTopics, papers, labs };
}
export async function listReading(userId: string) { await connectDatabase(); return ReadingItem.find({ userId }).sort({ updatedAt: -1 }).populate("paperId").lean(); }
export async function savePaper(userId: string, paperId: string) {
  await connectDatabase(); const paper = await Paper.findOne({ _id: paperId, status: "PUBLISHED" }).lean(); if (!paper) throw new AppError("PAPER_NOT_FOUND",404,"Published paper not found.");
  return ReadingItem.findOneAndUpdate({ userId, paperId }, { $setOnInsert: { userId, paperId, status: "TO_READ", notes: "", tags: [], quotes: [], mappedResearchInterests: [] } }, { upsert: true, new: true }).lean();
}
export async function updateReading(userId: string, id: string, input: { status?: string; notes?: string; tags?: string[]; quotes?: string[]; mappedResearchInterests?: string[] }) {
  await connectDatabase(); const allowed = new Set(["TO_READ","READING","READ","ARCHIVED"]); if (input.status && !allowed.has(input.status)) throw new AppError("INVALID_STATUS",400,"Invalid reading status.");
  const item = await ReadingItem.findOneAndUpdate({ _id: id, userId }, { $set: input }, { new: true, runValidators: true }).lean(); if (!item) throw new AppError("READING_ITEM_NOT_FOUND",404,"Reading item not found."); return item;
}
export async function deleteReading(userId: string, id: string) { await connectDatabase(); const result=await ReadingItem.deleteOne({ _id:id,userId }); if(!result.deletedCount)throw new AppError("READING_ITEM_NOT_FOUND",404,"Reading item not found."); }
export async function listStudentPublications(userId: string){await connectDatabase();return StudentPublication.find({userId}).sort({publicationDate:-1}).lean();}
export async function addStudentPublication(userId:string,input:{title:string;doi?:string;authors?:string[];venue?:string;publicationDate?:Date|null;url?:string}){await connectDatabase();return StudentPublication.create({userId,...input,source:"MANUAL",verified:false});}
