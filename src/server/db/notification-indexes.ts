import { connectDatabase } from "@/server/db/mongoose";
import { Notification } from "@/server/models/Notification";
import { NotificationPreference } from "@/server/models/NotificationPreference";
import { ProfessorMatchAlert } from "@/server/models/ProfessorMatchAlert";
import { PushSubscription } from "@/server/models/PushSubscription";

let notificationIndexesPromise: Promise<void> | null = null;

export async function prepareNotificationDatabase(): Promise<void> {
  await connectDatabase();
  if (!notificationIndexesPromise) {
    notificationIndexesPromise = Promise.all([
      Notification.createIndexes(),
      NotificationPreference.createIndexes(),
      ProfessorMatchAlert.createIndexes(),
      PushSubscription.createIndexes()
    ])
      .then(() => undefined)
      .catch((error: unknown) => {
        notificationIndexesPromise = null;
        throw error;
      });
  }
  await notificationIndexesPromise;
}
