import { z } from "zod";

const page = z.coerce.number().int().min(1).max(1000).default(1);
const limit = z.coerce.number().int().min(1).max(50).default(20);
export const opportunityTypeSchema = z.enum(["PHD", "MASTERS", "RESEARCH_ASSISTANT", "TEACHING_ASSISTANT", "RESEARCH_INTERNSHIP", "INDUSTRY_RESEARCH_INTERNSHIP", "FELLOWSHIP", "CONFERENCE", "WORKSHOP", "SUMMER_PROGRAM", "RESEARCH_PROJECT", "OTHER"]);

export const scholarshipSearchSchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  country: z.string().trim().max(120).optional().default(""),
  degree: z.string().trim().max(120).optional().default(""),
  fundingType: z.enum(["", "FULL", "PARTIAL", "OTHER", "UNKNOWN"]).optional().default(""),
  openOnly: z.enum(["true", "false"]).optional().default("false").transform((value) => value === "true"),
  page,
  limit
});

export const opportunitySearchSchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  country: z.string().trim().max(120).optional().default(""),
  researchArea: z.string().trim().max(160).optional().default(""),
  type: z.union([z.literal(""), opportunityTypeSchema]).optional().default(""),
  openOnly: z.enum(["true", "false"]).optional().default("false").transform((value) => value === "true"),
  page,
  limit
});

export type ScholarshipSearchInput = z.infer<typeof scholarshipSearchSchema>;
export type OpportunitySearchInput = z.infer<typeof opportunitySearchSchema>;
