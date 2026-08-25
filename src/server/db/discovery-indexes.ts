import { connectDatabase } from "@/server/db/mongoose";
import { Professor } from "@/server/models/Professor";
import { University } from "@/server/models/University";

let discoveryIndexesPromise: Promise<void> | null = null;

export async function prepareDiscoveryDatabase(): Promise<void> {
  await connectDatabase();
  if (!discoveryIndexesPromise) {
    discoveryIndexesPromise = Promise.all([University.createIndexes(), Professor.createIndexes()])
      .then(() => undefined)
      .catch((error: unknown) => {
        discoveryIndexesPromise = null;
        throw error;
      });
  }
  await discoveryIndexesPromise;
}
