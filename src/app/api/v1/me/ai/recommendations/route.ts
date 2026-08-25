import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors/AppError";
import { buildRecommendations } from "@/server/ai/ai.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError("UNAUTHORIZED", 401, "Sign in is required.");
    return apiSuccess(await buildRecommendations(user.id));
  } catch (error) { return handleApiError(error, requestId); }
}
