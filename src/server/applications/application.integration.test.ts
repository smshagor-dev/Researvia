import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { addApplicationNote, createApplication, createApplicationTask, getApplication, updateApplication, updateApplicationTask } from "@/server/applications/application.service";
import { connectDatabase, disconnectDatabase } from "@/server/db/mongoose";
import { Application } from "@/server/models/Application";
import { ApplicationTask } from "@/server/models/ApplicationTask";
import { ApplicationTimeline } from "@/server/models/ApplicationTimeline";
import { Scholarship } from "@/server/models/Scholarship";
import { User } from "@/server/models/User";

beforeAll(async () => {
  process.env.MONGODB_URI ||= "mongodb://127.0.0.1:27017/researvia_ci";
  process.env.APP_URL ||= "http://localhost:3000";
  process.env.SESSION_SECRET ||= "test-session-secret-value-at-least-32-characters";
  process.env.TOKEN_ENCRYPTION_KEY ||= "test-token-encryption-key-at-least-32-characters";
  await connectDatabase();
});

beforeEach(async () => {
  await Promise.all([
    Application.deleteMany({}),
    ApplicationTask.deleteMany({}),
    ApplicationTimeline.deleteMany({}),
    Scholarship.deleteMany({}),
    User.deleteMany({})
  ]);
});

afterAll(async () => {
  await disconnectDatabase();
});

describe("application tracker", () => {
  it("snapshots a published source and prevents cross-user access", async () => {
    const owner = await User.create({ email: "owner@app.test", displayName: "Owner", emailVerifiedAt: new Date() });
    const other = await User.create({ email: "other@app.test", displayName: "Other", emailVerifiedAt: new Date() });
    const scholarship = await Scholarship.create({
      name: "Research Scholarship",
      slug: "research-scholarship",
      provider: "Example Foundation",
      country: "Germany",
      applicationUrl: "https://example.org/apply",
      sourceUrl: "https://example.org/scholarship",
      deadline: new Date("2027-01-15T00:00:00.000Z"),
      status: "PUBLISHED"
    });

    const created = await createApplication(owner._id.toString(), { sourceType: "SCHOLARSHIP", sourceId: scholarship._id.toString(), title: "", organization: "", university: "", country: "", contactName: "", contactEmail: "", deadline: "", status: "INTERESTED", notes: "" });
    expect(created.title).toBe("Research Scholarship");
    expect(created.sourceUrl).toBe("https://example.org/scholarship");
    await expect(getApplication(other._id.toString(), created.id)).rejects.toMatchObject({ code: "APPLICATION_NOT_FOUND" });
  });

  it("records status, notes and owner-scoped task lifecycle", async () => {
    const owner = await User.create({ email: "owner2@app.test", displayName: "Owner", emailVerifiedAt: new Date() });
    const other = await User.create({ email: "other2@app.test", displayName: "Other", emailVerifiedAt: new Date() });
    const created = await createApplication(owner._id.toString(), createdManualApplication());
    await updateApplication(owner._id.toString(), created.id, { status: "APPLIED" });
    await addApplicationNote(owner._id.toString(), created.id, "Submitted through the official portal.");
    const task = await createApplicationTask(owner._id.toString(), created.id, { title: "Prepare interview notes", notes: "", dueDate: "2027-02-10", priority: "HIGH" });
    await updateApplicationTask(owner._id.toString(), created.id, task.id, { completed: true });

    const detail = await getApplication(owner._id.toString(), created.id);
    expect(detail.application.status).toBe("APPLIED");
    expect(detail.timeline.some((entry) => entry.type === "STATUS_CHANGE")).toBe(true);
    expect(detail.timeline.some((entry) => entry.type === "NOTE")).toBe(true);
    expect(detail.tasks[0]?.completedAt).toBeTruthy();
    await expect(updateApplicationTask(other._id.toString(), created.id, task.id, { completed: false })).rejects.toMatchObject({ code: "TASK_NOT_FOUND" });
  });
});

function createdManualApplication() {
  return {
    sourceType: "MANUAL" as const,
    title: "PhD application",
    organization: "University",
    university: "University",
    country: "Canada",
    contactName: "",
    contactEmail: "",
    deadline: "2027-02-01",
    status: "PREPARING" as const,
    notes: ""
  };
}
