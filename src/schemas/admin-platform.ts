import { z } from "zod";

export const featureFlagSchema = z.object({
  key: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{1,119}$/),
  description: z.string().trim().max(500).default(""),
  enabled: z.boolean().default(false),
  environments: z.array(z.enum(["production", "development", "test"])).min(1).max(3).default(["production", "development", "test"]),
  allowedRoles: z.array(z.enum(["STUDENT", "ADMIN", "SUPER_ADMIN"])).max(3).default([]),
  rolloutPercent: z.number().int().min(0).max(100).default(100)
}).strict();
