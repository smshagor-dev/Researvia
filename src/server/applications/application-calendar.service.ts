import { CalendarEvent } from "@/server/models/CalendarEvent";

const terminalStatuses = new Set(["ACCEPTED", "REJECTED", "WITHDRAWN"]);

export async function syncApplicationDeadlineCalendar(userId: string, input: {
  applicationId: string;
  title: string;
  organization?: string | null;
  university?: string | null;
  deadline?: Date | null;
  status: string;
}) {
  if (!input.deadline || terminalStatuses.has(input.status)) {
    await removeApplicationDeadlineCalendar(userId, input.applicationId);
    return null;
  }

  const context = [input.organization, input.university].filter(Boolean).join(" · ");
  return CalendarEvent.findOneAndUpdate(
    { userId, sourceType: "APPLICATION", sourceId: input.applicationId },
    {
      $set: {
        title: `Application deadline — ${input.title}`.slice(0, 260),
        type: "DEADLINE",
        startsAt: input.deadline,
        endsAt: null,
        timezone: "UTC",
        notes: context ? `Tracked automatically from Applications · ${context}` : "Tracked automatically from Applications",
        reminderMinutes: [10080, 4320, 1440, 60]
      },
      $setOnInsert: { userId, sourceType: "APPLICATION", sourceId: input.applicationId }
    },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
  ).lean();
}

export async function removeApplicationDeadlineCalendar(userId: string, applicationId: string) {
  await CalendarEvent.deleteMany({ userId, sourceType: "APPLICATION", sourceId: applicationId });
}
