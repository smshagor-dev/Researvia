import { connectDatabase } from "@/server/db/mongoose";
import { Opportunity } from "@/server/models/Opportunity";
import { Scholarship } from "@/server/models/Scholarship";

let indexesPromise: Promise<void> | null = null;

export async function prepareOpportunityDatabase(): Promise<void> {
  await connectDatabase();
  if (!indexesPromise) {
    indexesPromise = Promise.all([Scholarship.createIndexes(), Opportunity.createIndexes()])
      .then(() => undefined)
      .catch((error: unknown) => { indexesPromise = null; throw error; });
  }
  await indexesPromise;
}
