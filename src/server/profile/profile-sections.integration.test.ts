import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectDatabase, disconnectDatabase } from "@/server/db/mongoose";
import { StudentProfile } from "@/server/models/StudentProfile";
import { StudentEducation, StudentResearchProfile, StudentSkill } from "@/server/models/StudentProfileSections";
import { User } from "@/server/models/User";
import {
  createOrReplaceStudentProfileSection,
  deleteStudentProfileSectionRecord,
  getStudentProfileSection,
  updateStudentProfileSectionRecord
} from "@/server/profile/profile-sections.service";

let userId = "";
let otherUserId = "";

beforeAll(async () => {
  process.env.MONGODB_URI ||= "mongodb://127.0.0.1:27017/researvia_profile_sections_ci";
  process.env.APP_URL ||= "http://localhost:3000";
  process.env.SESSION_SECRET ||= "test-session-secret-value-at-least-32-characters";
  process.env.TOKEN_ENCRYPTION_KEY ||= "test-token-encryption-key-at-least-32-characters";
  await connectDatabase();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    StudentProfile.deleteMany({}),
    StudentEducation.deleteMany({}),
    StudentResearchProfile.deleteMany({}),
    StudentSkill.deleteMany({})
  ]);
  const users = await User.create([
    { email: "sections-student@example.com", displayName: "Sections Student", role: "STUDENT", status: "ACTIVE", emailVerifiedAt: new Date() },
    { email: "sections-other@example.com", displayName: "Other Student", role: "STUDENT", status: "ACTIVE", emailVerifiedAt: new Date() }
  ]);
  const user = users[0];
  const otherUser = users[1];
  if (!user || !otherUser) throw new Error("Profile section test users were not created.");
  userId = user._id.toString();
  otherUserId = otherUser._id.toString();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe("normalized student profile sections", () => {
  it("stores singleton research profile independently and syncs legacy research interests", async () => {
    const saved = await createOrReplaceStudentProfileSection(userId, "research-profile", {
      primaryArea: "Artificial Intelligence",
      secondaryAreas: ["Robotics", "Computer Vision"],
      keywords: ["autonomous systems", "sensor fusion"]
    });
    expect(saved.primaryArea).toBe("Artificial Intelligence");

    const loaded = await getStudentProfileSection(userId, "research-profile");
    expect(loaded).toMatchObject({ primaryArea: "Artificial Intelligence" });

    const legacy = await StudentProfile.findOne({ userId }).lean();
    expect(legacy?.researchInterests).toEqual(["Artificial Intelligence", "Robotics", "Computer Vision"]);
  });

  it("creates, edits and deletes repeatable education records without touching another student", async () => {
    const first = await createOrReplaceStudentProfileSection(userId, "education", {
      institution: "Example University",
      degree: "BSc",
      fieldOfStudy: "Computer Science"
    });
    const second = await createOrReplaceStudentProfileSection(userId, "education", {
      institution: "Research University",
      degree: "MSc",
      fieldOfStudy: "Artificial Intelligence"
    });

    const rows = await getStudentProfileSection(userId, "education");
    expect(Array.isArray(rows)).toBe(true);
    if (!Array.isArray(rows)) throw new Error("Education section should be repeatable.");
    expect(rows).toHaveLength(2);

    await expect(updateStudentProfileSectionRecord(otherUserId, "education", String(first.id), { institution: "Hijacked" }))
      .rejects.toMatchObject({ code: "PROFILE_SECTION_NOT_FOUND" });

    const updated = await updateStudentProfileSectionRecord(userId, "education", String(first.id), { institution: "Updated University" });
    expect(updated.institution).toBe("Updated University");

    await deleteStudentProfileSectionRecord(userId, "education", String(second.id));
    const remaining = await getStudentProfileSection(userId, "education");
    expect(Array.isArray(remaining)).toBe(true);
    if (!Array.isArray(remaining)) throw new Error("Education section should be repeatable.");
    expect(remaining).toHaveLength(1);
  });

  it("syncs normalized skills into the backward-compatible profile summary", async () => {
    await createOrReplaceStudentProfileSection(userId, "skills", { name: "Python", category: "TECHNICAL", proficiency: "ADVANCED" });
    await createOrReplaceStudentProfileSection(userId, "skills", { name: "Literature Review", category: "RESEARCH", proficiency: "ADVANCED" });

    const legacy = await StudentProfile.findOne({ userId }).lean();
    expect(new Set(legacy?.skills ?? [])).toEqual(new Set(["Python", "Literature Review"]));
  });
});
