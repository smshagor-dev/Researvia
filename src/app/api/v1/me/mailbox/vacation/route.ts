import { z } from "zod";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { getVacationResponderSettings, updateVacationResponderSettings } from "@/server/email/vacation-responder.service";
import { AppError } from "@/server/errors/AppError";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

const optionalDate = z.union([z.string().datetime({ offset: true }), z.null()]);
const schema = z.object({
  enabled: z.boolean().optional(),
  startAt: optionalDate.optional(),
  endAt: optionalDate.optional(),
  subject: z.string().max(500).optional(),
  message: z.string().max(10000).optional(),
  cooldownHours: z.number().int().min(1).max(720).optional()
}).strict().refine((value) => Object.keys(value).length > 0, "Provide at least one vacation responder setting.");

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHORIZED", 401, "Sign in is required.");
  return user;
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser();
    return apiSuccess({ settings: await getVacationResponderSettings(user.id) });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await enforceRateLimit("mailbox:vacation-settings", user.id, 60, 60 * 60 * 1000);
    const input = await readJson(request, schema);
    const settings = await updateVacationResponderSettings(user.id, {
      enabled: input.enabled,
      startAt: input.startAt === undefined ? undefined : input.startAt === null ? null : new Date(input.startAt),
      endAt: input.endAt === undefined ? undefined : input.endAt === null ? null : new Date(input.endAt),
      subject: input.subject,
      message: input.message,
      cooldownHours: input.cooldownHours
    });
    return apiSuccess({ settings });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
