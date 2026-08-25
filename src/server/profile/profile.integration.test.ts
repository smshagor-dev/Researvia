import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectDatabase, disconnectDatabase } from "@/server/db/mongoose";
import { StudentProfile } from "@/server/models/StudentProfile";
import { User } from "@/server/models/User";
import {
  calculateProfileCompletion,
  completeStudentOnboarding,
  getStudentProfile,
  updateStudentProfile
} from "@/server/profile/profile.service";

let userId = "";

beforeAll(async () => {
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/researvia_profile_ci";
  process.env.APP_URL ||= "http://localhost:3000";
  process.env.SESSION_SECRET ||= "test-session-secret-value-at-least-32-characters";
  process.env.TOKEN_ENCRYPTION_KEY ||= "test-token-encryption-key-at-least-32-characters";
  await connectDatabase();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), StudentProfile.deleteMany({})]);
  const user = await User.create({
    email: "profile-student@example.com",
    displayName: "Profile Student",
    role: "STUDENT",
    status: "ACTIVE",
    emailVerifiedAt: new Date()
  });
  userId = user._id.toString();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe("student profile lifecycle", () => {
  it("creates a default profile and calculates completion", async () => {
    const profile = await getStudentProfile(userId);
    expect(profile.userId).toBe(userId);
    expect(profile.completion).toBe(0);
    expect(calculateProfileCompletion({ country: "Bangladesh", skills: ["Python"] })).toBe(20);
  });

  it("requires the academic discovery fields before completing onboarding", async () => {
    await expect(completeStudentOnboarding(userId)).rejects.toMatchObject({ code: "ONBOARDING_INCOMPLETE" });

    const updated = await updateStudentProfile(userId, {
      country: "Bangladesh",
      currentUniversity: "Example University",
      currentDegree: "BACHELORS",
      fieldOfStudy: "Computer Science",
      researchInterests: ["Machine Learning"],
      skills: ["Python", "TypeScript"],
      targetDegrees: ["MASTERS", "PHD"],
      targetCountries: ["Germany", "United States"],
      languages: ["English"],
      preferredResearchAreas: ["Autonomous Systems"]
    });

    expect(updated.completion).toBe(100);
    const completed = await completeStudentOnboarding(userId);
    expect(completed.onboardingCompletedAt).toBeTruthy();
    expect(completed.onboardingStep).toBe(4);
  });
});
