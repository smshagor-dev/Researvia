import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { getCurrentUser } from "@/server/auth/session";
import { listEmailAccounts } from "@/server/email/email-account.service";
import { AppError } from "@/server/errors/AppError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError("UNAUTHORIZED", 401, "Sign in is required.");
    return apiSuccess(await listEmailAccounts(user.id));
  } catch (error) { return handleApiError(error, requestId); }
}
