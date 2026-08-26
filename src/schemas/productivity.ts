import { z } from "zod";

const optionalId = z.string().trim().max(64).nullable().optional();
const tags = z.array(z.string().trim().min(1).max(80)).max(30).default([]);

export const plannerTaskSchema = z.object({
  title: z.string().trim().min(1).max(260),
  notes: z.string().max(8000).default(""),
  status: z.enum(["TODO","IN_PROGRESS","DONE","CANCELLED"]).default("TODO"),
  priority: z.enum(["LOW","MEDIUM","HIGH","URGENT"]).default("MEDIUM"),
  category: z.enum(["APPLICATION","RESEARCH","OUTREACH","DOCUMENT","EXAM","PERSONAL","OTHER"]).default("OTHER"),
  dueAt: z.coerce.date().nullable().optional(),
  reminderAt: z.coerce.date().nullable().optional(),
  linkedType: z.enum(["NONE","APPLICATION","PROFESSOR","SCHOLARSHIP","OPPORTUNITY","CONTACT"]).default("NONE"),
  linkedId: optionalId,
  tags
}).strict();
export const plannerTaskUpdateSchema = plannerTaskSchema.partial();

export const academicContactSchema = z.object({
  type: z.enum(["PROFESSOR","REFEREE","UNIVERSITY","RECRUITER","COLLABORATOR","OTHER"]).default("OTHER"),
  name: z.string().trim().min(1).max(180),
  email: z.string().trim().email().max(320).or(z.literal("")).default(""),
  phone: z.string().trim().max(80).default(""),
  institution: z.string().trim().max(240).default(""),
  department: z.string().trim().max(240).default(""),
  title: z.string().trim().max(180).default(""),
  website: z.string().trim().url().max(700).or(z.literal("")).default(""),
  relationshipStatus: z.enum(["NEW","CONTACTED","REPLIED","ACTIVE","INACTIVE"]).default("NEW"),
  notes: z.string().max(8000).default(""),
  tags,
  lastContactedAt: z.coerce.date().nullable().optional(),
  nextFollowUpAt: z.coerce.date().nullable().optional(),
  professorId: optionalId
}).strict();
export const academicContactUpdateSchema = academicContactSchema.partial();

export const recommendationRequestSchema = z.object({
  refereeName: z.string().trim().min(1).max(180),
  refereeEmail: z.string().trim().email().max(320),
  institution: z.string().trim().max(240).default(""),
  refereeTitle: z.string().trim().max(180).default(""),
  applicationName: z.string().trim().min(1).max(300),
  deadline: z.coerce.date().nullable().optional(),
  status: z.enum(["DRAFT","REQUESTED","CONFIRMED","RECEIVED","DECLINED","CANCELLED"]).default("DRAFT"),
  notes: z.string().max(8000).default(""),
  reminderAt: z.coerce.date().nullable().optional(),
  studentReferenceId: optionalId
}).strict();
export const recommendationRequestUpdateSchema = recommendationRequestSchema.partial();
export const recommendationSendSchema = z.object({
  subject: z.string().trim().max(500).optional(),
  text: z.string().trim().max(20000).optional()
}).strict();

export const supportTicketSchema = z.object({
  category: z.enum(["QUESTION","BUG","ACCOUNT","MAIL","DATA","FEATURE_REQUEST","OTHER"]).default("QUESTION"),
  subject: z.string().trim().min(1).max(260),
  description: z.string().trim().min(1).max(15000),
  priority: z.enum(["LOW","NORMAL","HIGH","URGENT"]).default("NORMAL")
}).strict();
export const supportTicketUpdateSchema = z.object({
  status: z.enum(["OPEN","WAITING_USER","RESOLVED","CLOSED"]).optional(),
  description: z.string().trim().min(1).max(15000).optional()
}).strict();
