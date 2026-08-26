import { z } from "zod";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors/AppError";
import {
  getNotificationPreferences,
  updateNotificationPreferences
} from "@/server/notifications/notification-preferences.service";
import { queueProfessorMatchEvaluation } from "@/server/profile/professor-match-notification.service";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  professorMatchWeb: z.boolean().optional(),
  professorMatchPush: z.boolean().optional(),
  minimumProfessorMatchScore: z.number().int().min(35).max(95).optional()
}).strict().refine((value) => Object.keys(value).length > 0, "Provide at least one preference.");

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", 401, "Sign in to continue.");
  return user;
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser();
    return apiSuccess({ preferences: await getNotificationPreferences(user.id) });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await enforceRateLimit("notification:preferences", user.id, 60, 60 * 60 * 1000);
    const preferences = await updateNotificationPreferences(user.id, await readJson(request, schema));
    try {
      await queueProfessorMatchEvaluation(user.id, "notification-preferences-updated");
    } catch (error) {
      console.error("Unable to queue professor match evaluation after notification preference change.", error);
    }
    return apiSuccess({ preferences });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
