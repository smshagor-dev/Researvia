import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { getSystemMailThread, updateSystemMailMessage } from "@/server/email/system-mailbox.service";
import { AppError } from "@/server/errors/AppError";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  read: z.boolean().optional(),
  starred: z.boolean().optional(),
  folder: z.enum(["INBOX", "SENT", "DRAFTS", "TRASH"]).optional()
}).strict().refine((value) => Object.keys(value).length > 0, "Provide at least one message update.");

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", 401, "Sign in to continue.");
  return user;
}

export async function GET(request: NextRequest, context: Context) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser();
    return apiSuccess(await getSystemMailThread(user.id, (await context.params).id));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await enforceRateLimit("mailbox:message", user.id, 600, 60 * 60 * 1000);
    const input = await readJson(request, patchSchema);
    return apiSuccess({ message: await updateSystemMailMessage(user.id, (await context.params).id, input) });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
