import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { cancelScheduledSystemMail } from "@/server/email/scheduled-mail.service";
import { AppError } from "@/server/errors/AppError";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: Context) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AppError("UNAUTHENTICATED", 401, "Sign in to continue.");
    await enforceRateLimit("mailbox:schedule-cancel", user.id, 60, 60 * 60 * 1000);
    const { id } = await context.params;
    return apiSuccess(await cancelScheduledSystemMail(user.id, id));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
