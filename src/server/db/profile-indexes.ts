import { connectDatabase } from "@/server/db/mongoose";
import { StudentProfile } from "@/server/models/StudentProfile";

let profileIndexesPromise: Promise<void> | null = null;

export async function prepareProfileDatabase(): Promise<void> {
  await connectDatabase();

  if (!profileIndexesPromise) {
    profileIndexesPromise = StudentProfile.createIndexes()
      .then(() => undefined)
      .catch((error: unknown) => {
        profileIndexesPromise = null;
        throw error;
      });
  }

  await profileIndexesPromise;
}
