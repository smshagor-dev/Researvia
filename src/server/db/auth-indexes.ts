import { connectDatabase } from "@/server/db/mongoose";
import { EmailVerificationToken } from "@/server/models/EmailVerificationToken";
import { PasswordResetToken } from "@/server/models/PasswordResetToken";
import { User } from "@/server/models/User";
import { UserSession } from "@/server/models/UserSession";

let authIndexesPromise: Promise<void> | null = null;

export async function prepareAuthDatabase(): Promise<void> {
  await connectDatabase();

  if (!authIndexesPromise) {
    authIndexesPromise = Promise.all([
      User.createIndexes(),
      UserSession.createIndexes(),
      EmailVerificationToken.createIndexes(),
      PasswordResetToken.createIndexes()
    ])
      .then(() => undefined)
      .catch((error: unknown) => {
        authIndexesPromise = null;
        throw error;
      });
  }

  await authIndexesPromise;
}
