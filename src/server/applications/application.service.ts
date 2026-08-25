import type { ApplicationSourceType, ApplicationStatus, CreateApplicationInput, CreateApplicationTaskInput, UpdateApplicationInput, UpdateApplicationTaskInput } from "@/schemas/applications";
import { prepareApplicationDatabase } from "@/server/db/application-indexes";
import { AppError } from "@/server/errors/AppError";
import { Application } from "@/server/models/Application";
import { ApplicationTask } from "@/server/models/ApplicationTask";
import { ApplicationTimeline } from "@/server/models/ApplicationTimeline";
import { Opportunity } from "@/server/models/Opportunity";
import { Scholarship } from "@/server/models/Scholarship";

function asDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

function dateIso(value: unknown): string | null {
  return value ? new Date(value as Date).toISOString() : null;
}

function assertId(value: string, code: string): void {
  if (!/^[a-f\d]{24}$/i.test(value)) throw new AppError(code, 404, "Record not found.");
}

export type ApplicationDto = {
  id: string;
  sourceType: ApplicationSourceType;
  sourceId: string;
  sourceSlug: string;
  sourceUrl: string;
  applicationUrl: string;
  sourceTitleSnapshot: string;
  title: string;
  organization: string;
  university: string;
  country: string;
  contactName: string;
  contactEmail: string;
  deadline: string | null;
  status: ApplicationStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

function applicationDto(value: Record<string, unknown>): ApplicationDto {
  return {
    id: String(value._id),
    sourceType: String(value.sourceType) as ApplicationSourceType,
    sourceId: value.sourceId ? String(value.sourceId) : "",
    sourceSlug: String(value.sourceSlug ?? ""),
    sourceUrl: String(value.sourceUrl ?? ""),
    applicationUrl: String(value.applicationUrl ?? ""),
    sourceTitleSnapshot: String(value.sourceTitleSnapshot ?? ""),
    title: String(value.title),
    organization: String(value.organization ?? ""),
    university: String(value.university ?? ""),
    country: String(value.country ?? ""),
    contactName: String(value.contactName ?? ""),
    contactEmail: String(value.contactEmail ?? ""),
    deadline: dateIso(value.deadline),
    status: String(value.status) as ApplicationStatus,
    notes: String(value.notes ?? ""),
    createdAt: new Date(value.createdAt as Date).toISOString(),
    updatedAt: new Date(value.updatedAt as Date).toISOString()
  };
}

function timelineDto(value: Record<string, unknown>) {
  return {
    id: String(value._id),
    type: String(value.type),
    message: String(value.message),
    fromStatus: value.fromStatus ? String(value.fromStatus) : null,
    toStatus: value.toStatus ? String(value.toStatus) : null,
    createdAt: new Date(value.createdAt as Date).toISOString()
  };
}

function taskDto(value: Record<string, unknown>) {
  return {
    id: String(value._id),
    title: String(value.title),
    notes: String(value.notes ?? ""),
    dueAt: dateIso(value.dueAt),
    priority: String(value.priority),
    completedAt: dateIso(value.completedAt),
    createdAt: new Date(value.createdAt as Date).toISOString(),
    updatedAt: new Date(value.updatedAt as Date).toISOString()
  };
}

type SourceSnapshot = {
  id: string;
  slug: string;
  title: string;
  organization: string;
  university: string;
  country: string;
  deadline: Date | null;
  sourceUrl: string;
  applicationUrl: string;
};

async function resolveSource(sourceType: Exclude<ApplicationSourceType, "MANUAL">, sourceId: string): Promise<SourceSnapshot> {
  if (sourceType === "SCHOLARSHIP") {
    const item = await Scholarship.findOne({ _id: sourceId, status: "PUBLISHED" }).populate("universityId", "name").lean();
    if (!item) throw new AppError("SOURCE_NOT_FOUND", 404, "Scholarship not found.");
    const university = item.universityId && typeof item.universityId === "object" ? item.universityId as unknown as { name?: string } : {};
    return { id: String(item._id), slug: item.slug, title: item.name, organization: item.provider, university: university.name ?? "", country: item.country, deadline: item.deadline ? new Date(item.deadline) : null, sourceUrl: item.sourceUrl, applicationUrl: item.applicationUrl };
  }

  const item = await Opportunity.findOne({ _id: sourceId, status: "PUBLISHED" }).populate("universityId", "name").lean();
  if (!item) throw new AppError("SOURCE_NOT_FOUND", 404, "Opportunity not found.");
  const university = item.universityId && typeof item.universityId === "object" ? item.universityId as unknown as { name?: string } : {};
  return { id: String(item._id), slug: item.slug, title: item.title, organization: item.organization, university: university.name ?? "", country: item.country, deadline: item.deadline ? new Date(item.deadline) : null, sourceUrl: item.sourceUrl, applicationUrl: item.applicationUrl };
}

export async function createApplication(userId: string, input: CreateApplicationInput): Promise<ApplicationDto> {
  await prepareApplicationDatabase();
  let values: Record<string, unknown>;

  if (input.sourceType === "MANUAL") {
    values = {
      userId,
      sourceType: "MANUAL",
      sourceId: null,
      title: input.title,
      organization: input.organization,
      university: input.university,
      country: input.country,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      deadline: asDate(input.deadline),
      status: input.status,
      notes: input.notes
    };
  } else {
    const source = await resolveSource(input.sourceType, input.sourceId as string);
    const existing = await Application.findOne({ userId, sourceType: input.sourceType, sourceId: source.id }).lean();
    if (existing) return applicationDto(existing as unknown as Record<string, unknown>);
    values = {
      userId,
      sourceType: input.sourceType,
      sourceId: source.id,
      sourceSlug: source.slug,
      sourceUrl: source.sourceUrl,
      applicationUrl: source.applicationUrl,
      sourceTitleSnapshot: source.title,
      title: source.title,
      organization: source.organization,
      university: source.university,
      country: source.country,
      deadline: source.deadline,
      status: input.status,
      notes: input.notes,
      contactName: input.contactName,
      contactEmail: input.contactEmail
    };
  }

  let created;
  try {
    created = await Application.create(values);
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000 && input.sourceType !== "MANUAL") {
      const existing = await Application.findOne({ userId, sourceType: input.sourceType, sourceId: input.sourceId }).lean();
      if (existing) return applicationDto(existing as unknown as Record<string, unknown>);
    }
    throw error;
  }

  await ApplicationTimeline.create({ userId, applicationId: created._id, type: "CREATED", message: "Application tracker created.", toStatus: created.status });
  return applicationDto(created.toObject() as unknown as Record<string, unknown>);
}

export async function listApplications(userId: string, input: { status?: ApplicationStatus | ""; q?: string }) {
  await prepareApplicationDatabase();
  const filter: Record<string, unknown> = { userId };
  if (input.status) filter.status = input.status;
  if (input.q) filter.$or = [
    { title: { $regex: input.q, $options: "i" } },
    { organization: { $regex: input.q, $options: "i" } },
    { university: { $regex: input.q, $options: "i" } }
  ];
  const items = await Application.find(filter).sort({ updatedAt: -1 }).limit(500).lean();
  return items.map((item) => applicationDto(item as unknown as Record<string, unknown>));
}

export async function getApplication(userId: string, applicationId: string) {
  await prepareApplicationDatabase();
  assertId(applicationId, "APPLICATION_NOT_FOUND");
  const item = await Application.findOne({ _id: applicationId, userId }).lean();
  if (!item) throw new AppError("APPLICATION_NOT_FOUND", 404, "Application not found.");
  const [timeline, tasks] = await Promise.all([
    ApplicationTimeline.find({ userId, applicationId }).sort({ createdAt: -1 }).lean(),
    ApplicationTask.find({ userId, applicationId }).sort({ completedAt: 1, dueAt: 1, createdAt: -1 }).lean()
  ]);
  return {
    application: applicationDto(item as unknown as Record<string, unknown>),
    timeline: timeline.map((entry) => timelineDto(entry as unknown as Record<string, unknown>)),
    tasks: tasks.map((task) => taskDto(task as unknown as Record<string, unknown>))
  };
}

export async function updateApplication(userId: string, applicationId: string, input: UpdateApplicationInput): Promise<ApplicationDto> {
  await prepareApplicationDatabase();
  assertId(applicationId, "APPLICATION_NOT_FOUND");
  const before = await Application.findOne({ _id: applicationId, userId }).lean();
  if (!before) throw new AppError("APPLICATION_NOT_FOUND", 404, "Application not found.");

  const patch: Record<string, unknown> = { ...input };
  if ("deadline" in input) patch.deadline = asDate(input.deadline);
  const updated = await Application.findOneAndUpdate({ _id: applicationId, userId }, { $set: patch }, { new: true, runValidators: true }).lean();
  if (!updated) throw new AppError("APPLICATION_NOT_FOUND", 404, "Application not found.");

  if (input.status && input.status !== before.status) {
    await ApplicationTimeline.create({ userId, applicationId, type: "STATUS_CHANGE", message: `Status changed from ${before.status} to ${input.status}.`, fromStatus: before.status, toStatus: input.status });
  }
  if ("deadline" in input && String(before.deadline ?? "") !== String(updated.deadline ?? "")) {
    await ApplicationTimeline.create({ userId, applicationId, type: "DEADLINE_CHANGE", message: updated.deadline ? `Deadline updated to ${new Date(updated.deadline).toISOString().slice(0, 10)}.` : "Deadline removed." });
  }

  return applicationDto(updated as unknown as Record<string, unknown>);
}

export async function addApplicationNote(userId: string, applicationId: string, message: string) {
  await prepareApplicationDatabase();
  assertId(applicationId, "APPLICATION_NOT_FOUND");
  const exists = await Application.exists({ _id: applicationId, userId });
  if (!exists) throw new AppError("APPLICATION_NOT_FOUND", 404, "Application not found.");
  const entry = await ApplicationTimeline.create({ userId, applicationId, type: "NOTE", message });
  return timelineDto(entry.toObject() as unknown as Record<string, unknown>);
}

export async function createApplicationTask(userId: string, applicationId: string, input: CreateApplicationTaskInput) {
  await prepareApplicationDatabase();
  assertId(applicationId, "APPLICATION_NOT_FOUND");
  const exists = await Application.exists({ _id: applicationId, userId });
  if (!exists) throw new AppError("APPLICATION_NOT_FOUND", 404, "Application not found.");
  const task = await ApplicationTask.create({ userId, applicationId, title: input.title, notes: input.notes, dueAt: asDate(input.dueDate), priority: input.priority });
  return taskDto(task.toObject() as unknown as Record<string, unknown>);
}

export async function updateApplicationTask(userId: string, applicationId: string, taskId: string, input: UpdateApplicationTaskInput) {
  await prepareApplicationDatabase();
  assertId(applicationId, "APPLICATION_NOT_FOUND");
  assertId(taskId, "TASK_NOT_FOUND");
  const patch: Record<string, unknown> = { ...input };
  delete patch.dueDate;
  delete patch.completed;
  if ("dueDate" in input) patch.dueAt = asDate(input.dueDate);
  if ("completed" in input) patch.completedAt = input.completed ? new Date() : null;
  const task = await ApplicationTask.findOneAndUpdate({ _id: taskId, applicationId, userId }, { $set: patch }, { new: true, runValidators: true }).lean();
  if (!task) throw new AppError("TASK_NOT_FOUND", 404, "Task not found.");
  return taskDto(task as unknown as Record<string, unknown>);
}

export async function deleteApplicationTask(userId: string, applicationId: string, taskId: string): Promise<void> {
  await prepareApplicationDatabase();
  assertId(applicationId, "APPLICATION_NOT_FOUND");
  assertId(taskId, "TASK_NOT_FOUND");
  const result = await ApplicationTask.deleteOne({ _id: taskId, applicationId, userId });
  if (result.deletedCount !== 1) throw new AppError("TASK_NOT_FOUND", 404, "Task not found.");
}

export async function deleteApplication(userId: string, applicationId: string): Promise<void> {
  await prepareApplicationDatabase();
  assertId(applicationId, "APPLICATION_NOT_FOUND");
  const result = await Application.deleteOne({ _id: applicationId, userId });
  if (result.deletedCount !== 1) throw new AppError("APPLICATION_NOT_FOUND", 404, "Application not found.");
  await Promise.all([
    ApplicationTimeline.deleteMany({ userId, applicationId }),
    ApplicationTask.deleteMany({ userId, applicationId })
  ]);
}
