import { connectDatabase } from "@/server/db/mongoose";
import { prepareNotificationDatabase } from "@/server/db/notification-indexes";
import { enqueueJob } from "@/server/jobs/job.service";
import { ProfessorMatchAlert } from "@/server/models/ProfessorMatchAlert";
import { User } from "@/server/models/User";
import { notifyUser } from "@/server/notifications/notification.service";
import { getNotificationPreferences } from "@/server/notifications/notification-preferences.service";
import { findProfessorMatches } from "@/server/profile/professor-matching.service";

const MIN_PROFILE_STRENGTH = 34;
const SCORE_IMPROVEMENT_FOR_REALERT = 10;
const REALERT_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const USER_JOB_BUCKET_MS = 5 * 60 * 1000;
const SCAN_JOB_BUCKET_MS = 60 * 60 * 1000;

function bucket(ms: number) {
  return Math.floor(Date.now() / ms);
}

export async function queueProfessorMatchEvaluation(userId: string, reason = "profile-change") {
  return enqueueJob({
    type: "EVALUATE_PROFESSOR_MATCHES",
    payload: { userId, reason },
    idempotencyKey: `professor-match-user:${userId}:${bucket(USER_JOB_BUCKET_MS)}`,
    maxAttempts: 5
  });
}

export async function queueProfessorMatchScan(reason = "professor-catalog-change") {
  return enqueueJob({
    type: "SCAN_PROFESSOR_MATCHES",
    payload: { reason },
    idempotencyKey: `professor-match-scan:${reason}:${bucket(SCAN_JOB_BUCKET_MS)}`,
    maxAttempts: 5
  });
}

function matchMessage(match: {
  matchScore: number;
  fullName: string;
  universityName: string;
  country: string;
  matchReasons: string[];
}) {
  const location = match.universityName || match.country || "an academic institution";
  const reasons = match.matchReasons.slice(0, 3).join(" • ");
  return `${match.matchScore}% profile match at ${location}.${reasons ? ` ${reasons}.` : ""}`;
}

export async function evaluateProfessorMatchesForUser(userId: string) {
  await prepareNotificationDatabase();
  const user = await User.findOne({ _id: userId, role: "STUDENT", status: "ACTIVE" }).select({ _id: 1 }).lean();
  if (!user) return { skipped: "inactive-or-missing-student", evaluated: 0, notified: 0 };

  const [preferences, matches] = await Promise.all([
    getNotificationPreferences(userId),
    findProfessorMatches(userId, 24)
  ]);

  if (matches.profileStrength < MIN_PROFILE_STRENGTH) {
    return { skipped: "profile-signal-too-low", profileStrength: matches.profileStrength, evaluated: matches.items.length, notified: 0 };
  }

  if (!preferences.professorMatchWeb && !preferences.professorMatchPush) {
    return { skipped: "notifications-disabled", profileStrength: matches.profileStrength, evaluated: matches.items.length, notified: 0 };
  }

  let notified = 0;
  const now = new Date();
  const cooldownBefore = new Date(now.getTime() - REALERT_COOLDOWN_MS);

  for (const match of matches.items.filter((item) => item.matchScore >= preferences.minimumProfessorMatchScore)) {
    const professorId = match.id;
    const keys = { userId, professorId };

    await ProfessorMatchAlert.findOneAndUpdate(
      keys,
      {
        $set: { lastScore: match.matchScore, lastReasons: match.matchReasons, lastMatchedAt: now },
        $setOnInsert: { userId, professorId, firstMatchedAt: now, notificationCount: 0 }
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    const claimed = await ProfessorMatchAlert.findOneAndUpdate(
      {
        ...keys,
        $or: [
          { lastNotifiedAt: null },
          {
            lastNotifiedAt: { $lte: cooldownBefore },
            lastNotifiedScore: { $lte: match.matchScore - SCORE_IMPROVEMENT_FOR_REALERT }
          }
        ]
      },
      {
        $set: { lastNotifiedAt: now, lastNotifiedScore: match.matchScore },
        $inc: { notificationCount: 1 }
      },
      { returnDocument: "after" }
    ).lean();

    if (!claimed) continue;

    const scoreBand = Math.floor(match.matchScore / 10) * 10;
    const notification = await notifyUser({
      userId,
      type: "PROFESSOR_MATCH",
      title: `Strong professor match: ${match.fullName}`,
      message: matchMessage(match),
      href: `/dashboard/professors/${match.slug}`,
      dedupeKey: `professor-match:${professorId}:score-${scoreBand}`,
      webVisible: preferences.professorMatchWeb,
      metadata: {
        professorId,
        professorSlug: match.slug,
        professorName: match.fullName,
        universityName: match.universityName,
        country: match.country,
        matchScore: match.matchScore,
        matchReasons: match.matchReasons,
        profileStrength: matches.profileStrength
      }
    });

    if (preferences.professorMatchPush) {
      await enqueueJob({
        type: "SEND_PUSH_NOTIFICATION",
        payload: { notificationId: String(notification._id) },
        idempotencyKey: `push-notification:${String(notification._id)}`,
        maxAttempts: 5
      });
    }
    notified += 1;
  }

  return { profileStrength: matches.profileStrength, evaluated: matches.items.length, notified };
}

export async function enqueueProfessorMatchEvaluationForAllStudents(reason = "professor-catalog-change") {
  await connectDatabase();
  let queued = 0;
  const cursor = User.find({ role: "STUDENT", status: "ACTIVE" }).select({ _id: 1 }).cursor();
  for await (const user of cursor) {
    await queueProfessorMatchEvaluation(String(user._id), reason);
    queued += 1;
  }
  return { queued };
}
