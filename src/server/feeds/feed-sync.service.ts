import { connectDatabase } from "@/server/db/mongoose";
import { AcademicFeedSource } from "@/server/models/AcademicFeedSource";
import { User } from "@/server/models/User";
import { syncFeedSource } from "@/server/feeds/feed.service";
import { enqueueJob } from "@/server/jobs/job.service";

export async function syncActiveAcademicFeeds() {
  await connectDatabase();
  const actor=await User.findOne({role:{$in:["SUPER_ADMIN","ADMIN"]},status:"ACTIVE"}).sort({role:-1,createdAt:1}).select({_id:1}).lean();
  if (!actor) return {synced:0,failed:0,skipped:true};
  const feeds=await AcademicFeedSource.find({enabled:true}).select({_id:1}).limit(200).lean(); let synced=0,failed=0;
  for (const feed of feeds) { try { await syncFeedSource(String(actor._id),String(feed._id)); synced+=1; } catch { failed+=1; } }
  await enqueueJob({type:"SCAN_ACADEMIC_MATCHES",payload:{reason:"feed-sync"},idempotencyKey:`academic-match-after-feed:${new Date().toISOString().slice(0,13)}`,maxAttempts:3});
  return {synced,failed,skipped:false};
}
