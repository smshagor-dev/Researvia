import { type NextRequest } from "next/server";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { analyzeCvSchema } from "@/schemas/cv";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { analyzeCv, listCvAnalyses } from "@/server/cv/cv.service";
import { AppError } from "@/server/errors/AppError";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

async function student() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHORIZED", 401, "Sign in is required.");
  if (user.role !== "STUDENT") throw new AppError("FORBIDDEN", 403, "Student access is required.");
  return user;
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const user = await student();
    return apiSuccess({ analyses: await listCvAnalyses(user.id) });
  } catch (error) { return handleApiError(error, requestId); }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await student();
    await enforceRateLimit("cv:analyze", user.id, 20, 60 * 60 * 1000);
    const input = await readJson(request, analyzeCvSchema);
    return apiSuccess({ analysis: await analyzeCv(user.id, input.documentId) });
  } catch (error) { return handleApiError(error, requestId); }
}
