import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors/AppError";
import { getCampaign } from "@/server/outreach/outreach.service";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError("UNAUTHORIZED", 401, "Sign in is required.");
    const { id } = await context.params;
    return apiSuccess(await getCampaign(user.id, id));
  } catch (error) { return handleApiError(error, requestId); }
}
