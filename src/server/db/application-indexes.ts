import { connectDatabase } from "@/server/db/mongoose";
import { Application } from "@/server/models/Application";
import { ApplicationTask } from "@/server/models/ApplicationTask";
import { ApplicationTimeline } from "@/server/models/ApplicationTimeline";
import "@/server/models/University";

let applicationIndexesPromise: Promise<void> | null = null;

export async function prepareApplicationDatabase(): Promise<void> {
  await connectDatabase();
  if (!applicationIndexesPromise) {
    applicationIndexesPromise = Promise.all([
      Application.createIndexes(),
      ApplicationTimeline.createIndexes(),
      ApplicationTask.createIndexes()
    ]).then(() => undefined).catch((error: unknown) => {
      applicationIndexesPromise = null;
      throw error;
    });
  }
  await applicationIndexesPromise;
}
