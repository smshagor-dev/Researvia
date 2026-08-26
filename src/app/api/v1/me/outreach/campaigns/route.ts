import { z } from "zod";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors/AppError";
import { createCampaign, listCampaigns } from "@/server/outreach/outreach.service";

export const runtime = "nodejs";
const schema = z.object({
  senderType: z.enum(["SYSTEM", "CONNECTED"]).default("SYSTEM"),
  accountId: z.string().min(1).nullable().optional(),
  name: z.string().trim().min(2).max(180),
  purpose: z.string().trim().min(2).max(120),
  subject: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(12000),
  professorIds: z.array(z.string().min(1)).max(100).optional(),
  recipients: z.array(z.object({ email: z.string().email(), name: z.string().trim().max(220).optional() })).max(100).optional(),
  followUpAfterDays: z.number().int().min(1).max(60).nullable().optional()
}).strict().refine((value) => value.senderType === "SYSTEM" || Boolean(value.accountId), { message: "Choose a connected email account.", path: ["accountId"] });

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHORIZED", 401, "Sign in is required.");
  return user;
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try { const user = await requireUser(); return apiSuccess(await listCampaigns(user.id)); } catch (error) { return handleApiError(error, requestId); }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const input = await readJson(request, schema);
    return apiSuccess(await createCampaign(user.id, input), 201);
  } catch (error) { return handleApiError(error, requestId); }
}
