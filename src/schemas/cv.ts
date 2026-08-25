import { z } from "zod";

export const analyzeCvSchema = z.object({
  documentId: z.string().min(1).max(80)
});
