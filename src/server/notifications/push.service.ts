import * as webpush from "web-push";
import { getServerEnv } from "@/config/env";
import { prepareNotificationDatabase } from "@/server/db/notification-indexes";
import { AppError } from "@/server/errors/AppError";
import { PushSubscription } from "@/server/models/PushSubscription";
import { getNotificationById } from "@/server/notifications/notification.service";
import { getNotificationPreferences } from "@/server/notifications/notification-preferences.service";

export type BrowserPushSubscriptionInput = {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
};

export function getWebPushPublicConfig() {
  const env = getServerEnv();
  const enabled = Boolean(env.WEB_PUSH_VAPID_PUBLIC_KEY && env.WEB_PUSH_VAPID_PRIVATE_KEY && env.WEB_PUSH_VAPID_SUBJECT);
  return { enabled, publicKey: enabled ? env.WEB_PUSH_VAPID_PUBLIC_KEY ?? "" : "" };
}

function configureWebPush() {
  const env = getServerEnv();
  if (!env.WEB_PUSH_VAPID_PUBLIC_KEY || !env.WEB_PUSH_VAPID_PRIVATE_KEY || !env.WEB_PUSH_VAPID_SUBJECT) return false;
  webpush.setVapidDetails(env.WEB_PUSH_VAPID_SUBJECT, env.WEB_PUSH_VAPID_PUBLIC_KEY, env.WEB_PUSH_VAPID_PRIVATE_KEY);
  return true;
}

export async function countUserPushSubscriptions(userId: string) {
  await prepareNotificationDatabase();
  return PushSubscription.countDocuments({ userId, enabled: true });
}

export async function upsertPushSubscription(userId: string, input: BrowserPushSubscriptionInput, userAgent = "") {
  await prepareNotificationDatabase();
  const existing = await PushSubscription.findOne({ endpoint: input.endpoint }).select({ userId: 1 }).lean();
  if (existing && String(existing.userId) !== userId) {
    throw new AppError("PUSH_SUBSCRIPTION_CONFLICT", 409, "This browser push subscription belongs to another signed-in account.");
  }

  const expirationTime = typeof input.expirationTime === "number" && Number.isFinite(input.expirationTime)
    ? new Date(input.expirationTime)
    : null;

  await PushSubscription.findOneAndUpdate(
    { endpoint: input.endpoint },
    {
      $set: {
        userId,
        keys: input.keys,
        expirationTime,
        userAgent: userAgent.slice(0, 500),
        enabled: true,
        failureCount: 0,
        lastError: ""
      },
      $setOnInsert: { endpoint: input.endpoint }
    },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
  );
}

export async function removePushSubscription(userId: string, endpoint: string) {
  await prepareNotificationDatabase();
  await PushSubscription.deleteOne({ userId, endpoint });
}

type PushDeliveryError = Error & { statusCode?: number };

export async function deliverNotificationPush(notificationId: string) {
  if (!configureWebPush()) return { configured: false, delivered: 0, disabled: 0, failed: 0 };

  const notification = await getNotificationById(notificationId);
  const userId = String(notification.userId);
  if (notification.metadata && typeof notification.metadata === "object" && "pushAllowed" in notification.metadata && notification.metadata.pushAllowed === false) {
    return { configured: true, delivered: 0, disabled: 0, failed: 0 };
  }
  const preferences = await getNotificationPreferences(userId);
  if (!preferences.professorMatchPush && notification.type === "PROFESSOR_MATCH") {
    return { configured: true, delivered: 0, disabled: 0, failed: 0 };
  }

  await prepareNotificationDatabase();
  const subscriptions = await PushSubscription.find({ userId, enabled: true }).lean();
  if (subscriptions.length === 0) return { configured: true, delivered: 0, disabled: 0, failed: 0 };

  const payload = JSON.stringify({
    notificationId: String(notification._id),
    type: notification.type,
    title: notification.title,
    body: notification.message,
    href: notification.href || "/dashboard/notifications",
    metadata: notification.metadata ?? {}
  });

  let delivered = 0;
  let disabled = 0;
  let failed = 0;
  let transientFailure: Error | null = null;

  for (const subscription of subscriptions) {
    const keys = subscription.keys;
    if (!keys?.p256dh || !keys.auth) {
      disabled += 1;
      await PushSubscription.updateOne(
        { _id: subscription._id },
        { $set: { enabled: false, lastFailureAt: new Date(), lastError: "Stored push subscription keys are incomplete." }, $inc: { failureCount: 1 } }
      );
      continue;
    }

    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          expirationTime: subscription.expirationTime ? new Date(subscription.expirationTime).getTime() : null,
          keys: { p256dh: keys.p256dh, auth: keys.auth }
        },
        payload,
        { TTL: 60 * 60 * 24, urgency: "normal" }
      );
      delivered += 1;
      await PushSubscription.updateOne(
        { _id: subscription._id },
        { $set: { lastSuccessAt: new Date(), lastError: "", failureCount: 0 } }
      );
    } catch (cause) {
      const error = cause as PushDeliveryError;
      const statusCode = error.statusCode ?? 0;
      if (statusCode === 404 || statusCode === 410) {
        disabled += 1;
        await PushSubscription.updateOne(
          { _id: subscription._id },
          { $set: { enabled: false, lastFailureAt: new Date(), lastError: `Subscription expired (${statusCode}).` }, $inc: { failureCount: 1 } }
        );
        continue;
      }

      failed += 1;
      transientFailure = error instanceof Error ? error : new Error("Push delivery failed.");
      await PushSubscription.updateOne(
        { _id: subscription._id },
        { $set: { lastFailureAt: new Date(), lastError: transientFailure.message.slice(0, 500) }, $inc: { failureCount: 1 } }
      );
    }
  }

  if (failed > 0 && delivered === 0 && transientFailure) throw transientFailure;
  return { configured: true, delivered, disabled, failed };
}
