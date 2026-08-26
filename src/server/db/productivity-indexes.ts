import { connectDatabase } from "@/server/db/mongoose";
import { AcademicContact } from "@/server/models/AcademicContact";
import { PlannerTask } from "@/server/models/PlannerTask";
import { RecommendationRequest } from "@/server/models/RecommendationRequest";
import { SupportTicket } from "@/server/models/SupportTicket";

let promise: Promise<void> | null = null;
export async function prepareProductivityDatabase() {
  if (!promise) promise = (async () => {
    await connectDatabase();
    await Promise.all([AcademicContact.createIndexes(), PlannerTask.createIndexes(), RecommendationRequest.createIndexes(), SupportTicket.createIndexes()]);
  })().catch((error) => { promise = null; throw error; });
  return promise;
}
