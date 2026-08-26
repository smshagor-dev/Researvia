import { connectDatabase } from "@/server/db/mongoose";
import { AcademicProgram } from "@/server/models/AcademicProgram";
import { Department } from "@/server/models/Department";
import { Professor } from "@/server/models/Professor";
import { ResearchLab } from "@/server/models/ResearchLab";
import { University } from "@/server/models/University";

let discoveryIndexesPromise: Promise<void> | null = null;

export async function prepareDiscoveryDatabase(): Promise<void> {
  await connectDatabase();
  if (!discoveryIndexesPromise) {
    discoveryIndexesPromise = Promise.all([
      University.createIndexes(),
      Professor.createIndexes(),
      Department.createIndexes(),
      ResearchLab.createIndexes(),
      AcademicProgram.createIndexes()
    ]).then(() => undefined).catch((error: unknown) => {
      discoveryIndexesPromise = null;
      throw error;
    });
  }
  await discoveryIndexesPromise;
}
