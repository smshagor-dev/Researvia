import { z } from "zod";

export const applicationStatuses = ["INTERESTED", "PREPARING", "CONTACTED", "APPLIED", "INTERVIEW", "OFFER", "ACCEPTED", "REJECTED", "WITHDRAWN"] as const;
export const applicationSourceTypes = ["MANUAL", "SCHOLARSHIP", "OPPORTUNITY"] as const;
export const applicationTaskPriorities = ["LOW", "MEDIUM", "HIGH"] as const;

export const applicationStatusSchema = z.enum(applicationStatuses);
export const applicationSourceTypeSchema = z.enum(applicationSourceTypes);
export const applicationTaskPrioritySchema = z.enum(applicationTaskPriorities);

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid record identifier.");
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format.");
const optionalText = (max: number) => z.string().trim().max(max).default("");

export const createApplicationSchema = z.object({
  sourceType: applicationSourceTypeSchema.default("MANUAL"),
  sourceId: objectIdSchema.optional(),
  title: optionalText(300),
  organization: optionalText(240),
  university: optionalText(240),
  country: optionalText(120),
  contactName: optionalText(180),
  contactEmail: z.union([z.literal(""), z.string().trim().email().max(320)]).default(""),
  deadline: z.union([dateSchema, z.literal("")]).default(""),
  status: applicationStatusSchema.default("INTERESTED"),
  notes: optionalText(5000)
}).superRefine((value, context) => {
  if (value.sourceType === "MANUAL" && !value.title) {
    context.addIssue({ code: "custom", path: ["title"], message: "Title is required for a manual application." });
  }
  if (value.sourceType !== "MANUAL" && !value.sourceId) {
    context.addIssue({ code: "custom", path: ["sourceId"], message: "A source record is required." });
  }
});

export const updateApplicationSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  organization: z.string().trim().max(240).optional(),
  university: z.string().trim().max(240).optional(),
  country: z.string().trim().max(120).optional(),
  contactName: z.string().trim().max(180).optional(),
  contactEmail: z.union([z.literal(""), z.string().trim().email().max(320)]).optional(),
  deadline: z.union([dateSchema, z.literal(""), z.null()]).optional(),
  status: applicationStatusSchema.optional(),
  notes: z.string().trim().max(5000).optional()
}).refine((value) => Object.keys(value).length > 0, { message: "No application changes were submitted." });

export const applicationListQuerySchema = z.object({
  status: z.union([applicationStatusSchema, z.literal("")]).default(""),
  q: z.string().trim().max(120).default("")
});

export const createApplicationNoteSchema = z.object({ message: z.string().trim().min(1).max(2000) });

export const createApplicationTaskSchema = z.object({
  title: z.string().trim().min(1).max(240),
  notes: optionalText(2000),
  dueDate: z.union([dateSchema, z.literal("")]).default(""),
  priority: applicationTaskPrioritySchema.default("MEDIUM")
});

export const updateApplicationTaskSchema = z.object({
  title: z.string().trim().min(1).max(240).optional(),
  notes: z.string().trim().max(2000).optional(),
  dueDate: z.union([dateSchema, z.literal(""), z.null()]).optional(),
  priority: applicationTaskPrioritySchema.optional(),
  completed: z.boolean().optional()
}).refine((value) => Object.keys(value).length > 0, { message: "No task changes were submitted." });

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;
export type ApplicationSourceType = z.infer<typeof applicationSourceTypeSchema>;
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type CreateApplicationTaskInput = z.infer<typeof createApplicationTaskSchema>;
export type UpdateApplicationTaskInput = z.infer<typeof updateApplicationTaskSchema>;
