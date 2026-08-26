import { createHash } from "node:crypto";
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

function tokens(values: unknown[]): Set<string> {
  return new Set(values.flatMap((value) => String(value ?? "").toLowerCase().split(/[^a-z0-9+#.-]+/)).map((v) => v.trim()).filter((v) => v.length >= 2));
}
function overlap(a: Set<string>, b: Set<string>) { if (!a.size || !b.size) return 0; let n=0; for (const value of a) if (b.has(value)) n+=1; return n / Math.max(1, Math.min(a.size,b.size)); }
function clamp(value: number) { return Math.max(0, Math.min(100, Math.round(value))); }
function weekBucket(date = new Date()) { return `${date.getUTCFullYear()}-${Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(date.getUTCFullYear(),0,1)) / 604800000)}`; }
function fingerprint(parts: unknown[]) { return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0,40); }
function highestGpa(profile: { education?: Array<{ gpa?: number | null; maxGpa?: number | null }> }) {
  let best: number | null = null;
  for (const item of profile.education ?? []) if (typeof item.gpa === "number" && typeof item.maxGpa === "number" && item.maxGpa > 0) best = Math.max(best ?? 0, (item.gpa / item.maxGpa) * 4);
  return best;
}
function degreeTokens(profile: { desiredDegrees?: string[] }) { return new Set((profile.desiredDegrees ?? []).map((v) => v.toUpperCase().replace(/[^A-Z]/g,""))); }
function scholarshipScore(profile: any, item: any) {
  const interests = tokens([...(profile.researchInterests ?? []), ...(profile.skills ?? []), ...((profile.education ?? []).map((e:any)=>e.fieldOfStudy))]);
  const topic = overlap(interests, tokens([...(item.researchAreas ?? []), ...(item.eligibility?.fields ?? []), item.title, item.description]));
  let score = 25 + topic * 35;
  if ((profile.targetCountries ?? []).some((c:string)=>String(c).toLowerCase()===String(item.country).toLowerCase())) score += 15;
  const wanted=degreeTokens(profile); const eligible=new Set((item.eligibility?.degrees ?? []).map((v:string)=>v.toUpperCase().replace(/[^A-Z]/g,""))); if (!eligible.size || [...wanted].some((v)=>eligible.has(v))) score += 12;
  const gpa=highestGpa(profile); if (item.eligibility?.minGpa == null || gpa == null || gpa >= Number(item.eligibility.minGpa)) score += 8;
  if (item.fundingType === "FULL") score += 5;
  return clamp(score);
}
function opportunityScore(profile: any, item: any) {
  const interests=tokens([...(profile.researchInterests ?? []), ...((profile.education ?? []).map((e:any)=>e.fieldOfStudy))]);
  const skills=tokens(profile.skills ?? []);
  let score=20 + overlap(interests,tokens([...(item.researchAreas ?? []),item.title,item.description]))*38 + overlap(skills,tokens([...(item.requiredSkills ?? []),...(item.preferredSkills ?? [])]))*22;
  if ((profile.targetCountries ?? []).some((c:string)=>String(c).toLowerCase()===String(item.country).toLowerCase())) score+=12;
  const degrees=degreeTokens(profile); if ((item.type === "PH_D_POSITION" && degrees.has("PHD")) || (item.type === "MASTERS_POSITION" && degrees.has("MASTERS")) || (item.type === "POSTDOC" && degrees.has("POSTDOC"))) score+=8;
  return clamp(score);
}
async function notify(input:{userId:string;entityType:"SCHOLARSHIP"|"OPPORTUNITY";entity:any;score:number;reasons:string[];web:boolean;push:boolean}) {
  const {userId,entityType,entity,score,reasons,web,push}=input;
  const fp=fingerprint([entity.updatedAt,score,reasons]); const alert=await AcademicMatchAlert.findOne({userId,entityType,entityId:entity._id}).lean(); const now=new Date();
  const cooled=!alert?.lastNotifiedAt || now.getTime()-new Date(alert.lastNotifiedAt).getTime()>=COOLDOWN_MS; const improved=alert ? score >= Number(alert.lastScore)+10 : true; const changed=!alert || alert.lastFingerprint!==fp;
  if (!changed || (!cooled && !improved)) return false;
  await AcademicMatchAlert.findOneAndUpdate({userId,entityType,entityId:entity._id},{$set:{lastScore:score,lastFingerprint:fp,lastNotifiedAt:now},$setOnInsert:{userId,entityType,entityId:entity._id}},{upsert:true,returnDocument:"after"});
  if (!web && !push) return true;
  const path=entityType === "SCHOLARSHIP" ? `/scholarships/${entity.slug}` : `/opportunities/${entity.slug}`;
  const label=entityType === "SCHOLARSHIP" ? "scholarship" : "research opportunity";
  const notification=await Notification.findOneAndUpdate({userId,dedupeKey:`academic-match:${entityType}:${entity._id}:${weekBucket(now)}`},{$setOnInsert:{userId,type:`${entityType}_MATCH`,title:`${score}% ${label} match`,message:`${entity.title} matches your academic profile. ${reasons.slice(0,2).join(" ")}`,href:path,dedupeKey:`academic-match:${entityType}:${entity._id}:${weekBucket(now)}`,metadata:{entityType,entityId:String(entity._id),score,reasons}}},{upsert:true,returnDocument:"after"}).lean();
  if (push && notification?._id) await enqueueJob({type:"SEND_PUSH_NOTIFICATION",payload:{notificationId:String(notification._id)},idempotencyKey:`push:${notification._id}`});
  return true;
}
export async function evaluateAcademicMatchesForUser(userId:string) {
  await connectDatabase(); const profile=await StudentProfile.findOne({userId}).lean(); if (!profile || Number(profile.completeness ?? 0)<25) return {scholarships:0,opportunities:0};
  const prefs=await getNotificationPreferences(userId); const now=new Date();
  const [scholarships,opportunities]=await Promise.all([
    Scholarship.find({status:"PUBLISHED",$or:[{deadline:null},{deadline:{$gte:now}}]}).sort({deadline:1,retrievedAt:-1}).limit(MAX_RESULTS).lean(),
    Opportunity.find({status:"PUBLISHED",$or:[{deadline:null},{deadline:{$gte:now}}]}).sort({deadline:1,retrievedAt:-1}).limit(MAX_RESULTS).lean()
  ]);
  let s=0,o=0;
  const rankedS=scholarships.map((entity:any)=>({entity,score:scholarshipScore(profile,entity)})).filter((x)=>x.score>=prefs.minimumScholarshipMatchScore).sort((a,b)=>b.score-a.score).slice(0,MAX_NOTIFICATIONS_PER_TYPE);
  for (const x of rankedS) if (await notify({userId,entityType:"SCHOLARSHIP",entity:x.entity,score:x.score,reasons:["Research interests and eligibility were compared.","Country, degree and GPA preferences were considered."],web:prefs.scholarshipMatchWeb,push:prefs.scholarshipMatchPush})) s+=1;
  const rankedO=opportunities.map((entity:any)=>({entity,score:opportunityScore(profile,entity)})).filter((x)=>x.score>=prefs.minimumOpportunityMatchScore).sort((a,b)=>b.score-a.score).slice(0,MAX_NOTIFICATIONS_PER_TYPE);
  for (const x of rankedO) if (await notify({userId,entityType:"OPPORTUNITY",entity:x.entity,score:x.score,reasons:["Research topics were compared with your interests.","Required skills and location preferences were considered."],web:prefs.opportunityMatchWeb,push:prefs.opportunityMatchPush})) o+=1;
  return {scholarships:s,opportunities:o};
}
export async function enqueueAcademicMatchEvaluationForAllStudents(reason="catalog-reconciliation") {
  await connectDatabase(); const users=await User.find({role:"STUDENT",status:"ACTIVE"}).select({_id:1}).limit(5000).lean(); const bucket=new Date().toISOString().slice(0,13);
  for (const user of users) await enqueueJob({type:"EVALUATE_ACADEMIC_MATCHES",payload:{userId:String(user._id),reason},idempotencyKey:`academic-match:${user._id}:${reason}:${bucket}`,maxAttempts:3});
  return {queued:users.length};
}
