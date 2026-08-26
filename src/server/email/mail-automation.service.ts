import { prepareSystemMailboxDatabase } from "@/server/db/system-mailbox-indexes";
import { AppError } from "@/server/errors/AppError";
import { SystemMailSettings } from "@/server/models/SystemMailSettings";

export type MailAutomationUpdate = {
  autoReplyEnabled?: boolean;
  autoReplySubject?: string;
  autoReplyText?: string;
  autoReplyStartsAt?: Date | null;
  autoReplyEndsAt?: Date | null;
};

function serialize(row: Record<string, unknown>) {
  return {
    autoReplyEnabled: Boolean(row.autoReplyEnabled),
    autoReplySubject: String(row.autoReplySubject ?? "Automatic reply"),
    autoReplyText: String(row.autoReplyText ?? ""),
    autoReplyStartsAt: row.autoReplyStartsAt ? new Date(row.autoReplyStartsAt as Date).toISOString() : null,
    autoReplyEndsAt: row.autoReplyEndsAt ? new Date(row.autoReplyEndsAt as Date).toISOString() : null
  };
}

export async function getMailAutomation(userId: string) {
  await prepareSystemMailboxDatabase();
  const row = await SystemMailSettings.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  if (!row) throw new AppError("MAIL_SETTINGS_UNAVAILABLE", 500, "Mailbox automation settings could not be loaded.");
  return serialize(row as unknown as Record<string, unknown>);
}

export async function updateMailAutomation(userId: string, input: MailAutomationUpdate) {
  await prepareSystemMailboxDatabase();
  const current = await SystemMailSettings.findOne({ userId }).lean();
  const subject = input.autoReplySubject !== undefined ? input.autoReplySubject.trim().slice(0, 500) : String(current?.autoReplySubject ?? "Automatic reply");
  const text = input.autoReplyText !== undefined ? input.autoReplyText.trim().slice(0, 10000) : String(current?.autoReplyText ?? "");
  const startsAt = input.autoReplyStartsAt !== undefined ? input.autoReplyStartsAt : current?.autoReplyStartsAt ?? null;
  const endsAt = input.autoReplyEndsAt !== undefined ? input.autoReplyEndsAt : current?.autoReplyEndsAt ?? null;
  const enabled = input.autoReplyEnabled !== undefined ? input.autoReplyEnabled : Boolean(current?.autoReplyEnabled);
  if (enabled && !text) throw new AppError("MAIL_AUTO_REPLY_BODY_REQUIRED", 400, "Add an automatic reply message before enabling vacation replies.");
  if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    throw new AppError("MAIL_AUTO_REPLY_WINDOW_INVALID", 400, "Vacation reply end time must be after the start time.");
  }
  const row = await SystemMailSettings.findOneAndUpdate(
    { userId },
    { $set: { autoReplyEnabled: enabled, autoReplySubject: subject || "Automatic reply", autoReplyText: text, autoReplyStartsAt: startsAt, autoReplyEndsAt: endsAt }, $setOnInsert: { userId } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();
  if (!row) throw new AppError("MAIL_SETTINGS_UNAVAILABLE", 500, "Mailbox automation settings could not be saved.");
  return serialize(row as unknown as Record<string, unknown>);
}
