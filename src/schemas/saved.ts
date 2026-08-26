import { z } from "zod";

export const savedItemTypeSchema = z.enum(["PROFESSOR", "UNIVERSITY", "SCHOLARSHIP", "OPPORTUNITY", "LAB", "PROGRAM"]);
const tagsSchema = z.array(z.string().trim().min(1).max(80)).max(20);

export const createSavedItemSchema = z.object({ itemType:savedItemTypeSchema, targetId:z.string().regex(/^[a-f0-9]{24}$/i), collection:z.string().trim().min(1).max(80).optional().default("Saved"), notes:z.string().trim().max(2000).optional().default(""), tags:tagsSchema.optional().default([]) }).strict();
export const updateSavedItemSchema = z.object({ collection:z.string().trim().min(1).max(80).optional(), notes:z.string().trim().max(2000).optional(), tags:tagsSchema.optional() }).strict();
export const savedItemQuerySchema = z.object({ itemType:z.union([z.literal(""),savedItemTypeSchema]).optional().default(""), collection:z.string().trim().max(80).optional().default("") });
export const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i);
export type CreateSavedItemInput=z.infer<typeof createSavedItemSchema>;
export type UpdateSavedItemInput=z.infer<typeof updateSavedItemSchema>;
export type SavedItemType=z.infer<typeof savedItemTypeSchema>;
