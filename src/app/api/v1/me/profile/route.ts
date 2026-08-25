import { NextRequest } from "next/server";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { profilePatchSchema } from "@/schemas/profile";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors/AppError";
import { getStudentProfile, updateStudentProfile } from "@/server/profile/profile.service";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

function requireStudent(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user) throw new AppError("UNAUTHENTICATED", 401, "Sign in to continue.");
  if (user.role !== "STUDENT") throw new AppError("FORBIDDEN", 403, "Student access is required.");
  return user;
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const user = requireStudent(await getCurrentUser());
    return apiSuccess({ profile: await getStudentProfile(user.id) });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = requireStudent(await getCurrentUser());
    await enforceRateLimit("profile:update", user.id, 120, 60 * 60 * 1000);
    const input = await readJson(request, profilePatchSchema);
    return apiSuccess({ profile: await updateStudentProfile(user.id, input) });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
