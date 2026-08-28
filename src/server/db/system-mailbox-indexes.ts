import { connectDatabase } from "@/server/db/mongoose";
import { SystemMailbox } from "@/server/models/SystemMailbox";
import { SystemMailAlias } from "@/server/models/SystemMailAlias";
import { SystemMailAutoReply } from "@/server/models/SystemMailAutoReply";
import { SystemMailAutoReplyThrottle } from "@/server/models/SystemMailAutoReplyThrottle";
import { SystemMailMessage } from "@/server/models/SystemMailMessage";
import { SystemMailSettings } from "@/server/models/SystemMailSettings";

let promise: Promise<void> | null = null;

export async function prepareSystemMailboxDatabase() {
  if (!promise) {
    promise = (async () => {
      await connectDatabase();
      await Promise.all([
        SystemMailbox.createIndexes(),
        SystemMailAlias.createIndexes(),
        SystemMailMessage.createIndexes(),
        SystemMailSettings.createIndexes(),
        SystemMailAutoReply.createIndexes(),
        SystemMailAutoReplyThrottle.createIndexes()
      ]);
    })().catch((error) => {
      promise = null;
      throw error;
    });
  }
  return promise;
}
