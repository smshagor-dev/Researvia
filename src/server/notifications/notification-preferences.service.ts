import { prepareNotificationDatabase } from "@/server/db/notification-indexes";
import { NotificationPreference } from "@/server/models/NotificationPreference";

export type NotificationPreferencesDto = {
  professorMatchWeb: boolean;
  professorMatchPush: boolean;
  minimumProfessorMatchScore: number;
};

const defaults: NotificationPreferencesDto = {
  professorMatchWeb: true,
  professorMatchPush: true,
  minimumProfessorMatchScore: 55
};

function dto(value: Partial<NotificationPreferencesDto> | null | undefined): NotificationPreferencesDto {
  return {
    professorMatchWeb: value?.professorMatchWeb ?? defaults.professorMatchWeb,
    professorMatchPush: value?.professorMatchPush ?? defaults.professorMatchPush,
    minimumProfessorMatchScore: value?.minimumProfessorMatchScore ?? defaults.minimumProfessorMatchScore
  };
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferencesDto> {
  await prepareNotificationDatabase();
  const value = await NotificationPreference.findOne({ userId }).lean();
  return dto(value as Partial<NotificationPreferencesDto> | null);
}

export async function updateNotificationPreferences(
  userId: string,
  input: Partial<NotificationPreferencesDto>
): Promise<NotificationPreferencesDto> {
  await prepareNotificationDatabase();
  const value = await NotificationPreference.findOneAndUpdate(
    { userId },
    { $set: input, $setOnInsert: { userId } },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
  ).lean();
  return dto(value as Partial<NotificationPreferencesDto> | null);
}
