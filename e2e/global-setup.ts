import mongoose from "mongoose";
import { StudentProfile } from "../src/server/models/StudentProfile";
import { SystemMailbox } from "../src/server/models/SystemMailbox";
import { User } from "../src/server/models/User";
import { UserSession } from "../src/server/models/UserSession";
import { hashPassword } from "../src/server/security/password";
import { E2E_STUDENT } from "./fixtures";

async function removeExistingFixture() {
  const existing = await User.findOne({ email: E2E_STUDENT.email }).select({ _id: 1 }).lean();
  if (!existing) return;
  await Promise.all([
    UserSession.deleteMany({ userId: existing._id }),
    StudentProfile.deleteMany({ userId: existing._id }),
    SystemMailbox.deleteMany({ userId: existing._id })
  ]);
  await User.deleteOne({ _id: existing._id });
}

export default async function globalSetup() {
  const mongodbUri = process.env.MONGODB_URI;
  if (!mongodbUri) throw new Error("MONGODB_URI is required for browser E2E tests.");

  await mongoose.connect(mongodbUri, { serverSelectionTimeoutMS: 5_000 });
  try {
    await removeExistingFixture();
    const passwordHash = await hashPassword(E2E_STUDENT.password);
    const user = await User.create({
      email: E2E_STUDENT.email,
      passwordHash,
      displayName: E2E_STUDENT.displayName,
      role: "STUDENT",
      status: "ACTIVE",
      emailVerifiedAt: new Date()
    });

    await StudentProfile.create({
      userId: user._id,
      fullName: E2E_STUDENT.displayName,
      country: "United States",
      currentUniversity: "ResearVia E2E University",
      currentDegree: "MASTERS",
      fieldOfStudy: "Computer Science",
      bio: "Browser regression fixture.",
      researchInterests: ["Artificial Intelligence"],
      skills: ["TypeScript"],
      languages: ["English"],
      targetDegrees: ["PHD"],
      targetCountries: ["United States"],
      onboardingStep: 4,
      onboardingCompletedAt: new Date()
    });
  } finally {
    await mongoose.disconnect();
  }
}
