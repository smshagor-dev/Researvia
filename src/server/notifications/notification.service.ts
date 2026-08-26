import { isValidObjectId } from "mongoose";
import { prepareNotificationDatabase } from "@/server/db/notification-indexes";
import { sendSystemMailboxEmail } from "@/server/email/mailer";
import { AppError } from "@/server/errors/AppError";
import { Notification } from "@/server/models/Notification";
import { SystemMailbox } from "@/server/models/SystemMailbox";
import { SystemMailMessage } from "@/server/models/SystemMailMessage";
import { SystemMailSettings } from "@/server/models/SystemMailSettings";

type NotificationMetadata = Record<string, unknown>;

async function forwardSystemMailIfEnabled(userId: string, metadata: NotificationMetadata | undefined) {
  const messageId = typeof metadata?.messageId === "string" ? metadata.messageId : "";
  if (!messageId || !isValidObjectId(messageId)) return;
  const settings = await SystemMailSettings.findOne({ userId }).select("forwardingEnabled forwardingEmail").lean();
  if (!settings?.forwardingEnabled || !settings.forwardingEmail) return;
  const [message, mailbox] = await Promise.all([
    SystemMailMessage.findOne({ _id: messageId, userId }).lean(),
    SystemMailbox.findOne({ userId, status: "ACTIVE" }).lean()
  ]);
  if (!message || !mailbox || settings.forwardingEmail.toLowerCase() === mailbox.address.toLowerCase()) return;

  const text = [
    "Forwarded from your ResearVia mailbox.",
    "",
    `From: ${message.from}`,
    `To: ${(message.to ?? []).join(", ")}`,
    `Subject: ${message.subject || "(no subject)"}`,
    "",
    message.textBody || message.snippet || ""
  ].join("\n");

  try {
    await sendSystemMailboxEmail({
      fromAddress: mailbox.address,
      fromName: mailbox.displayName,
      to: [settings.forwardingEmail],
      subject: `Fwd: ${message.subject || "(no subject)"}`,
      text
    });
  } catch (error) {
    console.error("System mail forwarding failed:", error instanceof Error ? error.message : "unknown error");
  }
}

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
  let webVisible = input.webVisible !== false;
  let pushAllowed = true;

  if (input.type === "SYSTEM_MAIL") {
    const mailSettings = await SystemMailSettings.findOne({ userId: input.userId }).select("webNotifications pushNotifications").lean();
    if (mailSettings) {
      webVisible = mailSettings.webNotifications !== false;
      pushAllowed = mailSettings.pushNotifications !== false;
    }
  }

  const payload = {
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    href: input.href ?? null,
    ...(input.dedupeKey ? { dedupeKey: input.dedupeKey } : {}),
    metadata: { ...(input.metadata ?? {}), webVisible, pushAllowed }
  };

  const notification = input.dedupeKey
    ? await Notification.findOneAndUpdate(
        { userId: input.userId, dedupeKey: input.dedupeKey },
        { $setOnInsert: payload },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      )
    : await Notification.create(payload);

  if (!notification) throw new AppError("NOTIFICATION_CREATE_FAILED", 500, "Notification could not be created.");
  if (input.type === "SYSTEM_MAIL") await forwardSystemMailIfEnabled(input.userId, input.metadata);
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
