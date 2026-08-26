import { z } from "zod";

const page = z.coerce.number().int().min(1).max(1000).default(1);
const limit = z.coerce.number().int().min(1).max(50).default(20);
const optionalObjectId = z.string().regex(/^[a-f0-9]{24}$/i).optional();

export const universitySearchSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  country: z.string().trim().max(120).optional().default(""),
  page,
  limit
});

export const professorSearchSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  country: z.string().trim().max(120).optional().default(""),
  researchArea: z.string().trim().max(160).optional().default(""),
  universityId: optionalObjectId,
  page,
  limit
});

export const labSearchSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  researchArea: z.string().trim().max(160).optional().default(""),
  universityId: optionalObjectId,
  departmentId: optionalObjectId,
  page,
  limit
});

export const programSearchSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  degreeLevel: z.enum(["", "BACHELORS", "MASTERS", "PHD", "POSTDOC", "CERTIFICATE", "OTHER"]).optional().default(""),
  researchArea: z.string().trim().max(160).optional().default(""),
  universityId: optionalObjectId,
  departmentId: optionalObjectId,
  page,
  limit
});

export const publicSlugSchema = z.string().trim().min(2).max(280).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export type UniversitySearchInput = z.infer<typeof universitySearchSchema>;
export type ProfessorSearchInput = z.infer<typeof professorSearchSchema>;
export type LabSearchInput = z.infer<typeof labSearchSchema>;
export type ProgramSearchInput = z.infer<typeof programSearchSchema>;
