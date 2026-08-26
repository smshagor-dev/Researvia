import { z } from "zod";
import { applicationPacketDocumentKinds } from "@/server/models/ApplicationPacket";
export const applicationPacketSchema = z.object({
  requiredDocumentKinds: z.array(z.enum(applicationPacketDocumentKinds)).max(applicationPacketDocumentKinds.length).default(["CV"]),
  recommendationsRequired: z.coerce.number().int().min(0).max(5).default(0)
}).strict();
export type ApplicationPacketInput = z.infer<typeof applicationPacketSchema>;
