import { connectDatabase } from "@/server/db/mongoose";
import { Notification } from "@/server/models/Notification";

export async function notifyUser(input: { userId: string; type: string; title: string; message: string; href?: string | null }) {
  await connectDatabase();
  return Notification.create({ ...input, href: input.href ?? null });
}

export async function listNotifications(userId: string, limit = 50) {
  await connectDatabase();
  const items = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(Math.min(limit, 100)).lean();
  const unread = await Notification.countDocuments({ userId, readAt: null });
  return { items, unread };
}

export async function markNotificationRead(userId: string, id: string) {
  await connectDatabase();
  await Notification.updateOne({ _id: id, userId }, { $set: { readAt: new Date() } });
}

export async function markAllNotificationsRead(userId: string) {
  await connectDatabase();
  await Notification.updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } });
}
