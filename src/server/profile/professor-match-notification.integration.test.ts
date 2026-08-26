import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectDatabase, disconnectDatabase } from "@/server/db/mongoose";
import { Job } from "@/server/models/Job";
import { Notification } from "@/server/models/Notification";
import { NotificationPreference } from "@/server/models/NotificationPreference";
import { Professor } from "@/server/models/Professor";
import { ProfessorMatchAlert } from "@/server/models/ProfessorMatchAlert";
import {
  StudentEducation,
  StudentOpportunityPreference,
  StudentResearchProfile,
  StudentSkill,
  StudentSummary
} from "@/server/models/StudentProfileSections";
import { University } from "@/server/models/University";
import { User } from "@/server/models/User";
import { evaluateProfessorMatchesForUser } from "@/server/profile/professor-match-notification.service";

const studentEmail = "professor-match-alert-student@example.com";
const professorSlug = "professor-match-alert-fixture";
const universitySlug = "professor-match-alert-university";
let userId = "";

beforeAll(async () => {
  process.env.MONGODB_URI ||= "mongodb://127.0.0.1:27017/researvia_professor_match_alert_ci";
  process.env.APP_URL ||= "http://localhost:3000";
  process.env.SESSION_SECRET ||= "test-session-secret-value-at-least-32-characters";
  process.env.TOKEN_ENCRYPTION_KEY ||= "test-token-encryption-key-at-least-32-characters";
  await connectDatabase();
});

beforeEach(async () => {
  const oldUser = await User.findOne({ email: studentEmail }).select({ _id: 1 }).lean();
  if (oldUser) {
    const oldUserId = oldUser._id;
    await Promise.all([
      Notification.deleteMany({ userId: oldUserId }),
      NotificationPreference.deleteMany({ userId: oldUserId }),
      ProfessorMatchAlert.deleteMany({ userId: oldUserId }),
      StudentEducation.deleteMany({ userId: oldUserId }),
      StudentOpportunityPreference.deleteMany({ userId: oldUserId }),
      StudentResearchProfile.deleteMany({ userId: oldUserId }),
      StudentSkill.deleteMany({ userId: oldUserId }),
      StudentSummary.deleteMany({ userId: oldUserId }),
      Job.deleteMany({ "payload.userId": oldUserId.toString() })
    ]);
    await User.deleteOne({ _id: oldUserId });
  }
  await Professor.deleteMany({ slug: professorSlug });
  await University.deleteMany({ slug: universitySlug });

  const user = await User.create({
    email: studentEmail,
    displayName: "Professor Match Student",
    role: "STUDENT",
    status: "ACTIVE",
    emailVerifiedAt: new Date()
  });
  userId = user._id.toString();

  const university = await University.create({
    name: "Professor Match University",
    slug: universitySlug,
    country: "United States",
    city: "Boston",
    status: "PUBLISHED"
  });

  await Professor.create({
    fullName: "Dr Match Fixture",
    slug: professorSlug,
    universityId: university._id,
    title: "Professor of Artificial Intelligence",
    department: "Computer Science and Robotics",
    country: "United States",
    researchAreas: ["Artificial Intelligence", "Robotics", "Computer Vision", "Autonomous Systems", "Sensor Fusion"],
    keywords: ["machine learning", "computer vision", "sensor fusion", "autonomous systems", "python"],
    bio: "Research on artificial intelligence robotics computer vision autonomous systems sensor fusion machine learning and Python.",
    publicationCount: 120,
    citedByCount: 4000,
    status: "PUBLISHED"
  });

  await Promise.all([
    StudentResearchProfile.create({
      userId,
      primaryArea: "Artificial Intelligence",
      secondaryAreas: ["Robotics", "Computer Vision", "Autonomous Systems"],
      keywords: ["machine learning", "sensor fusion", "autonomous systems"],
      researchMethods: ["computer vision", "machine learning"],
      preferredDomains: ["Robotics"],
      researchObjective: "Build autonomous robotics systems using computer vision and sensor fusion."
    }),
    StudentEducation.create({
      userId,
      institution: "Example University",
      degree: "BSc Computer Science",
      fieldOfStudy: "Computer Science",
      department: "Computer Science"
    }),
    StudentSkill.create({ userId, name: "Python", category: "TECHNICAL", proficiency: "ADVANCED" }),
    StudentOpportunityPreference.create({ userId, preferredCountries: ["United States"], preferredResearchAreas: ["Artificial Intelligence", "Robotics"] }),
    StudentSummary.create({ userId, researchObjective: "Artificial intelligence, robotics, computer vision and autonomous systems research." }),
    NotificationPreference.create({ userId, professorMatchWeb: true, professorMatchPush: true, minimumProfessorMatchScore: 35 })
  ]);
});

afterAll(async () => {
  await disconnectDatabase();
});

describe("automatic professor match notification flow", () => {
  it("creates one durable professor notification and one push job, then deduplicates repeated evaluation", async () => {
    const first = await evaluateProfessorMatchesForUser(userId);
    expect(first.notified).toBe(1);

    const notification = await Notification.findOne({ userId, type: "PROFESSOR_MATCH" }).lean();
    expect(notification).toBeTruthy();
    expect(notification?.title).toContain("Dr Match Fixture");
    expect(notification?.href).toBe(`/dashboard/professors/${professorSlug}`);
    expect(Number((notification?.metadata as Record<string, unknown>)?.matchScore ?? 0)).toBeGreaterThanOrEqual(35);

    expect(await ProfessorMatchAlert.countDocuments({ userId })).toBe(1);
    expect(await Job.countDocuments({ type: "SEND_PUSH_NOTIFICATION", "payload.notificationId": notification?._id.toString() })).toBe(1);

    const second = await evaluateProfessorMatchesForUser(userId);
    expect(second.notified).toBe(0);
    expect(await Notification.countDocuments({ userId, type: "PROFESSOR_MATCH" })).toBe(1);
    expect(await Job.countDocuments({ type: "SEND_PUSH_NOTIFICATION", "payload.notificationId": notification?._id.toString() })).toBe(1);
  });
});
