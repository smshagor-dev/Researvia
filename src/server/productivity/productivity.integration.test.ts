import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectDatabase, disconnectDatabase } from "@/server/db/mongoose";
import { Job } from "@/server/models/Job";
import { Notification } from "@/server/models/Notification";
import { AcademicContact } from "@/server/models/AcademicContact";
import { PlannerTask } from "@/server/models/PlannerTask";
import { RecommendationRequest } from "@/server/models/RecommendationRequest";
import { User } from "@/server/models/User";
import {
  createAcademicContact,
  createPlannerTask,
  createRecommendationRequest,
  updateAcademicContact,
  updatePlannerTask,
  updateRecommendationRequest
} from "@/server/productivity/productivity.service";
import { scanAcademicReminders } from "@/server/productivity/reminder.service";

const fixtureIds: mongoose.Types.ObjectId[] = [];

async function createUser(label: string) {
  const row = await User.create({
    email: `productivity-${label}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    displayName: `Productivity ${label}`,
    passwordHash: "fixture",
    role: "STUDENT",
    status: "ACTIVE",
    emailVerifiedAt: new Date()
  });
  fixtureIds.push(row._id);
  return row;
}

describe("academic productivity system", () => {
  beforeAll(async () => {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required for productivity integration tests.");
    await connectDatabase();
  });

  afterAll(async () => {
    if (fixtureIds.length) {
      const notifications = await Notification.find({ userId: { $in: fixtureIds } }).select({ _id: 1 }).lean();
      const notificationIds = notifications.map((item) => item._id.toString());
      await Promise.all([
        notificationIds.length ? Job.deleteMany({ "payload.notificationId": { $in: notificationIds } }) : Promise.resolve(),
        Notification.deleteMany({ userId: { $in: fixtureIds } }),
        PlannerTask.deleteMany({ userId: { $in: fixtureIds } }),
        AcademicContact.deleteMany({ userId: { $in: fixtureIds } }),
        RecommendationRequest.deleteMany({ userId: { $in: fixtureIds } }),
        User.deleteMany({ _id: { $in: fixtureIds } })
      ]);
    }
    await disconnectDatabase();
  });

  it("keeps tasks, contacts, and recommendation requests scoped to their owner", async () => {
    const owner = await createUser("owner");
    const stranger = await createUser("stranger");
    const task = await createPlannerTask(owner._id.toString(), {
      title: "Submit PhD application",
      status: "TODO",
      priority: "HIGH",
      category: "APPLICATION",
      linkedType: "NONE",
      tags: []
    });
    const contact = await createAcademicContact(owner._id.toString(), {
      type: "PROFESSOR",
      name: "Professor Ada",
      email: "ada@university.edu",
      relationshipStatus: "NEW",
      tags: []
    });
    const request = await createRecommendationRequest(owner._id.toString(), {
      refereeName: "Professor Grace",
      refereeEmail: "grace@university.edu",
      applicationName: "PhD in Computer Science",
      status: "DRAFT"
    });

    await expect(updatePlannerTask(stranger._id.toString(), task._id.toString(), { title: "hijacked" })).rejects.toMatchObject({ code: "TASK_NOT_FOUND" });
    await expect(updateAcademicContact(stranger._id.toString(), contact._id.toString(), { name: "hijacked" })).rejects.toMatchObject({ code: "CONTACT_NOT_FOUND" });
    await expect(updateRecommendationRequest(stranger._id.toString(), request._id.toString(), { status: "RECEIVED" })).rejects.toMatchObject({ code: "RECOMMENDATION_NOT_FOUND" });

    expect((await PlannerTask.findById(task._id).lean())?.title).toBe("Submit PhD application");
    expect((await AcademicContact.findById(contact._id).lean())?.name).toBe("Professor Ada");
    expect((await RecommendationRequest.findById(request._id).lean())?.status).toBe("DRAFT");
  }, 20_000);

  it("delivers one durable notification and one push job for a due task reminder", async () => {
    const owner = await createUser("reminder");
    const reminderAt = new Date(Date.now() - 60_000);
    const task = await createPlannerTask(owner._id.toString(), {
      title: "Follow up with professor",
      status: "TODO",
      priority: "HIGH",
      category: "OUTREACH",
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      reminderAt,
      linkedType: "NONE",
      tags: []
    });

    await scanAcademicReminders(new Date());
    await scanAcademicReminders(new Date());

    const notifications = await Notification.find({ userId: owner._id, type: "ACADEMIC_REMINDER", "metadata.sourceId": task._id.toString() }).lean();
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.href).toBe("/dashboard/tasks");
    const pushJobs = await Job.find({ type: "SEND_PUSH_NOTIFICATION", "payload.notificationId": notifications[0]?._id.toString() }).lean();
    expect(pushJobs).toHaveLength(1);
  }, 20_000);
});
