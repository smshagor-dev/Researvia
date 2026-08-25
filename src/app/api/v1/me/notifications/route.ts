import { z } from "zod";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors/AppError";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "@/server/notifications/notification.service";

export const runtime = "nodejs";
const schema = z.object({ id: z.string().optional(), all: z.boolean().optional() }).refine((value) => value.all === true || Boolean(value.id), "Provide a notification id or all=true.");

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHORIZED", 401, "Sign in is required.");
  return user;
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try { const user = await requireUser(); return apiSuccess(await listNotifications(user.id)); } catch (error) { return handleApiError(error, requestId); }
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const input = await readJson(request, schema);
    if (input.all) await markAllNotificationsRead(user.id);
    else if (input.id) await markNotificationRead(user.id, input.id);
    return apiSuccess({ message: "Notification status updated." });
  } catch (error) { return handleApiError(error, requestId); }
}
