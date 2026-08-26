import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { syncSystemImap } from "@/server/email/imap-sync.service";
import { getSystemMailSettings } from "@/server/email/system-mail-settings.service";
import { AppError } from "@/server/errors/AppError";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AppError("UNAUTHORIZED", 401, "Sign in is required.");
    await enforceRateLimit("mailbox:imap-sync", user.id, 12, 60 * 60 * 1000);
    const result = await syncSystemImap(user.id, { force: true });
    const settings = await getSystemMailSettings(user.id);
    return apiSuccess({ result, settings });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
