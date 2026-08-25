import { NextRequest } from "next/server";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors/AppError";
import { completeStudentOnboarding } from "@/server/profile/profile.service";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AppError("UNAUTHENTICATED", 401, "Sign in to continue.");
    if (user.role !== "STUDENT") throw new AppError("FORBIDDEN", 403, "Student access is required.");
    await enforceRateLimit("onboarding:complete", user.id, 20, 60 * 60 * 1000);
    return apiSuccess({ profile: await completeStudentOnboarding(user.id) });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
