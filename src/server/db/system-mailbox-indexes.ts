import { connectDatabase } from "@/server/db/mongoose";
import { MailAutoReplyReceipt } from "@/server/models/MailAutoReplyReceipt";
import { SystemMailbox } from "@/server/models/SystemMailbox";
import { SystemMailMessage } from "@/server/models/SystemMailMessage";
import { SystemMailSettings } from "@/server/models/SystemMailSettings";

let promise: Promise<void> | null = null;

export async function prepareSystemMailboxDatabase() {
  if (!promise) {
    promise = (async () => {
      await connectDatabase();
      await Promise.all([
        SystemMailbox.createIndexes(),
        SystemMailMessage.createIndexes(),
        SystemMailSettings.createIndexes(),
        MailAutoReplyReceipt.createIndexes()
      ]);
    })().catch((error) => {
      promise = null;
      throw error;
    });
  }
  return promise;
}
