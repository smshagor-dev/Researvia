import { isValidObjectId } from "mongoose";
import { prepareNotificationDatabase } from "@/server/db/notification-indexes";
import { AppError } from "@/server/errors/AppError";
import { Notification } from "@/server/models/Notification";

type NotificationMetadata = Record<string, unknown>;

export async function notifyUser(input: {
  userId: string;
  type: string;
  title: string;
  message: string;
  href?: string | null;
  dedupeKey?: string | null;
  metadata?: NotificationMetadata;
  webVisible?: boolean;
}) {
  await prepareNotificationDatabase();
  const payload = {
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    href: input.href ?? null,
    ...(input.dedupeKey ? { dedupeKey: input.dedupeKey } : {}),
    metadata: { ...(input.metadata ?? {}), webVisible: input.webVisible !== false }
  };

  if (!input.dedupeKey) return Notification.create(payload);

  const notification = await Notification.findOneAndUpdate(
    { userId: input.userId, dedupeKey: input.dedupeKey },
    { $setOnInsert: payload },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
  if (!notification) throw new AppError("NOTIFICATION_CREATE_FAILED", 500, "Notification could not be created.");
  return notification;
}

export async function getNotificationById(id: string) {
  if (!isValidObjectId(id)) throw new AppError("NOTIFICATION_NOT_FOUND", 404, "Notification not found.");
  await prepareNotificationDatabase();
  const item = await Notification.findById(id).lean();
  if (!item) throw new AppError("NOTIFICATION_NOT_FOUND", 404, "Notification not found.");
  return item;
}

export async function listNotifications(userId: string, limit = 50, unreadOnly = false) {
  await prepareNotificationDatabase();
  const visible = { userId, "metadata.webVisible": { $ne: false } };
  const filter = unreadOnly ? { ...visible, readAt: null } : visible;
  const items = await Notification.find(filter).sort({ createdAt: -1 }).limit(Math.min(Math.max(limit, 1), 100)).lean();
  const unread = await Notification.countDocuments({ ...visible, readAt: null });
  return { items, unread };
}

export async function countUnreadNotifications(userId: string) {
  await prepareNotificationDatabase();
  return Notification.countDocuments({ userId, readAt: null, "metadata.webVisible": { $ne: false } });
}

export async function markNotificationRead(userId: string, id: string) {
  if (!isValidObjectId(id)) throw new AppError("NOTIFICATION_NOT_FOUND", 404, "Notification not found.");
  await prepareNotificationDatabase();
  const result = await Notification.updateOne({ _id: id, userId, "metadata.webVisible": { $ne: false } }, { $set: { readAt: new Date() } });
  if (result.matchedCount !== 1) throw new AppError("NOTIFICATION_NOT_FOUND", 404, "Notification not found.");
}

export async function markAllNotificationsRead(userId: string) {
  await prepareNotificationDatabase();
  await Notification.updateMany({ userId, readAt: null, "metadata.webVisible": { $ne: false } }, { $set: { readAt: new Date() } });
}
