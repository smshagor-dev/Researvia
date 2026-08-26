import { z } from "zod";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { getMailAutomation, updateMailAutomation } from "@/server/email/mail-automation.service";
import { AppError } from "@/server/errors/AppError";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

const nullableDate = z.union([z.string().datetime(), z.null()]);
const schema = z.object({
  autoReplyEnabled: z.boolean().optional(),
  autoReplySubject: z.string().max(500).optional(),
  autoReplyText: z.string().max(10000).optional(),
  autoReplyStartsAt: nullableDate.optional(),
  autoReplyEndsAt: nullableDate.optional()
}).strict().refine((value) => Object.keys(value).length > 0, "Provide at least one automation setting.");

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", 401, "Sign in to continue.");
  return user;
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser();
    return apiSuccess({ automation: await getMailAutomation(user.id) });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await enforceRateLimit("mailbox:automation", user.id, 30, 60 * 60 * 1000);
    const input = await readJson(request, schema);
    return apiSuccess({ automation: await updateMailAutomation(user.id, {
      ...input,
      autoReplyStartsAt: input.autoReplyStartsAt === undefined ? undefined : input.autoReplyStartsAt ? new Date(input.autoReplyStartsAt) : null,
      autoReplyEndsAt: input.autoReplyEndsAt === undefined ? undefined : input.autoReplyEndsAt ? new Date(input.autoReplyEndsAt) : null
    }) });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
