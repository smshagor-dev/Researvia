import { connectDatabase } from "@/server/db/mongoose";
import { SavedItem } from "@/server/models/SavedItem";

let savedIndexesPromise: Promise<void> | null = null;
export async function prepareSavedDatabase(): Promise<void> {
  await connectDatabase();
  if (!savedIndexesPromise) {
    savedIndexesPromise = SavedItem.createIndexes().then(() => undefined).catch((error: unknown) => { savedIndexesPromise = null; throw error; });
  }
  await savedIndexesPromise;
}
