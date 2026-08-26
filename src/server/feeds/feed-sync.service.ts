import { connectDatabase } from "@/server/db/mongoose";
import { AcademicFeedSource } from "@/server/models/AcademicFeedSource";
import { syncFeedSource } from "@/server/feeds/feed.service";
import { enqueueJob } from "@/server/jobs/job.service";

export async function syncActiveAcademicFeeds() {
  await connectDatabase();
  const feeds = await AcademicFeedSource.find({ active: true }).select({ _id: 1 }).limit(200).lean();
  let synced = 0;
  let failed = 0;

  for (const feed of feeds) {
    try {
      await syncFeedSource(String(feed._id));
      synced += 1;
    } catch {
      failed += 1;
    }
  }

  await enqueueJob({
    type: "SCAN_ACADEMIC_MATCHES",
    payload: { reason: "feed-sync" },
    idempotencyKey: `academic-match-after-feed:${new Date().toISOString().slice(0, 13)}`,
    maxAttempts: 3
  });

  return { synced, failed, skipped: false };
}
